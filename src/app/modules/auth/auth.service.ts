import { StatusCodes } from 'http-status-codes';
import { IAuthResponse, IResetPassword } from './auth.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { USER_ROLES, USER_STATUS } from '../../../enum/user';
import { AuthHelper } from './auth.helper';
import { AuthCommonServices, authResponse } from './loginService';
import { ILoginData } from '../../../interfaces/auth';
import { JwtPayload } from 'jsonwebtoken';
import { jwtHelper } from '../../../helpers/jwtHelper';
import config from '../../../config';
import bcrypt from 'bcrypt';
import cryptoToken, { generateOtp } from '../../../utils/crypto';
import { Token } from '../token/token.model';
import { IUser } from '../user/user.interface';
import sendSMS from '../../../shared/sendSMS';

export const createUser = async (payload: IUser) => {
  payload.phone = payload.phone?.trim();

  const isUserExist = await User.findOne({
    phone: payload.phone,
    status: { $nin: [USER_STATUS.DELETED] },
  });

  if (isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `An account with this phone number already exists.`
    );
  }

  const otp = generateOtp();
  const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000);

  const authentication = {
    oneTimeCode: otp,
    expiresAt: otpExpiresIn,
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'createAccount' as const,
    restrictionLeftAt: null,
    resetPassword: false,
    wrongLoginAttempts: 0,
  };

  const user = await User.create({
    ...payload,
    authentication,
    role: payload.role || USER_ROLES.USER,
  });

  try {
    await sendSMS(payload.phone, `Your Milesquad verification code is: ${otp}`);
  } catch (error) {
    console.log('Failed to send SMS:', error);
  }

  return user._id;
};

const login = async (payload: ILoginData): Promise<IAuthResponse> => {
  const phone = payload.phone?.trim();
  if (!phone) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Phone number is required');
  }

  const isUserExist = await User.findOne({
    phone,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  })
    .select('+password +authentication')
    .lean();

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number'
    );
  }

  return await AuthCommonServices.handleLoginLogic(payload, isUserExist);
};

const forgetPassword = async (phone: string) => {
  const cleanPhone = phone?.trim();
  const isUserExist = await User.findOne({
    phone: cleanPhone,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  });

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number'
    );
  }

  const otp = generateOtp();
  const authentication = {
    resetPassword: true,
    oneTimeCode: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'resetPassword' as const,
    restrictionLeftAt: null,
    wrongLoginAttempts: 0,
  };

  await User.findByIdAndUpdate(
    isUserExist._id,
    { $set: { authentication } },
    { new: true }
  );

  try {
    await sendSMS(cleanPhone, `Your Milesquad password reset OTP is: ${otp}`);
  } catch (error) {
    console.log('Failed to send reset SMS:', error);
  }

  return 'OTP sent to your phone successfully.';
};

const resetPassword = async (payload: { phone: string; otp: string; newPassword: string }) => {
  const { phone, otp, newPassword } = payload;
  const isUserExist = await User.findOne({ phone: phone.trim() })
    .select('+authentication');

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'User not found');
  }

  if (isUserExist.authentication?.oneTimeCode !== otp) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }

  if (isUserExist.authentication?.expiresAt && new Date() > isUserExist.authentication.expiresAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP has expired');
  }

  const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  await User.findByIdAndUpdate(isUserExist._id, {
    $set: {
      password: hashedPassword,
      authentication: {
        resetPassword: false,
        oneTimeCode: '',
        expiresAt: null,
        latestRequestAt: new Date(),
        requestCount: 0,
        restrictionLeftAt: null,
        wrongLoginAttempts: 0,
      },
    },
  });

  return { message: 'Password reset successfully' };
};

const verifyAccount = async (
  phone: string,
  onetimeCode: string,
): Promise<IAuthResponse> => {
  if (!onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is required.');
  }

  const isUserExist = await User.findOne({
    phone: phone.trim(),
    status: { $nin: [USER_STATUS.DELETED] },
  })
    .select('+password +authentication')
    .lean();

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number, please register first.'
    );
  }

  const { authentication } = isUserExist;

  if (authentication?.oneTimeCode !== onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP, please try again.');
  }

  if (authentication?.expiresAt && authentication.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP has expired, please try again.');
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    {
      $set: {
        verified: true,
        authentication: {
          oneTimeCode: '',
          expiresAt: null,
          latestRequestAt: null,
          requestCount: 0,
          authType: '',
          resetPassword: false,
        },
      },
    },
    { new: true }
  );

  const tokens = AuthHelper.createToken(
    isUserExist._id,
    isUserExist.role,
    isUserExist.fullName,
    isUserExist.phone
  );

  const userInfo = {
    id: isUserExist._id,
    role: isUserExist.role,
    name: isUserExist.fullName,
    phone: isUserExist.phone,
    image: isUserExist.image || '',
  };

  return authResponse(
    StatusCodes.OK,
    `Welcome ${isUserExist.fullName} to our platform.`,
    isUserExist.role,
    tokens.accessToken,
    tokens.refreshToken,
    undefined,
    userInfo
  );
};

const getAccessToken = async (token: string) => {
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token is required');
  }

  try {
    const decodedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_refresh_secret as string
    );

    const { authId, role, name, phoneOrEmail } = decodedToken;

    const tokens = AuthHelper.createToken(
      authId,
      role,
      name,
      phoneOrEmail
    );

    return {
      accessToken: tokens.accessToken,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token has expired');
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Refresh Token');
  }
};

const resendOtp = async (phone: string) => {
  const isUserExist = await User.findOne({
    phone: phone.trim(),
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  }).select('+authentication');

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number.'
    );
  }

  const { authentication } = isUserExist;
  const otp = generateOtp();
  const authenticationPayload = {
    ...authentication,
    oneTimeCode: otp,
    latestRequestAt: new Date(),
    requestCount: (authentication?.requestCount || 0) + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  if (authenticationPayload.requestCount >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Maximum OTP request limit reached. Please try again later.'
    );
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    { $set: { authentication: authenticationPayload } },
    { new: true }
  );

  try {
    await sendSMS(phone.trim(), `Your Milesquad verification OTP is: ${otp}`);
  } catch (error) {
    console.log('Failed to resend SMS:', error);
  }

  return 'OTP sent to your phone successfully.';
};

const changePassword = async (
  user: JwtPayload,
  currentPassword: string,
  newPassword: string
) => {
  const userId = user.authId || user.id;
  const isUserExist = await User.findById(userId).select('+password').lean();

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    currentPassword,
    isUserExist.password
  );

  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds)
  );

  await User.findByIdAndUpdate(
    userId,
    { password: hashedPassword },
    { new: true }
  );

  return { message: 'Password changed successfully' };
};

const deleteAccount = async (user: JwtPayload, password: string) => {
  const userId = user.authId || user.id;
  const isUserExist = await User.findById(userId).select('+password');

  if (!isUserExist) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete account.');
  }

  if (isUserExist.status === USER_STATUS.DELETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Account is already deleted.');
  }

  const isPasswordMatched = await bcrypt.compare(password, isUserExist.password);

  if (!isPasswordMatched) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid password provided.'
    );
  }

  const deletedData = await User.findByIdAndUpdate(userId, {
    $set: { status: USER_STATUS.DELETED },
  });

  return {
    status: StatusCodes.OK,
    message: 'Account deleted successfully.',
    deletedData,
  };
};

export const AuthServices = {
  createUser,
  login,
  verifyAccount,
  forgetPassword,
  resetPassword,
  resendOtp,
  getAccessToken,
  changePassword,
  deleteAccount,
};
