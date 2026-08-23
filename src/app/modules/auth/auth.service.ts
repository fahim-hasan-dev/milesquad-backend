import { StatusCodes } from 'http-status-codes';
import { IAuthResponse } from './auth.interface';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { PROFILE_VERIFICATION_STATUS, USER_ROLES, USER_STATUS } from '../../../enum/user';
import { AuthHelper } from './auth.helper';
import { AuthCommonServices, authResponse } from './loginService';
import { ILoginData } from '../../../interfaces/auth';
import { JwtPayload, Secret } from 'jsonwebtoken';
import { jwtHelper } from '../../../helpers/jwtHelper';
import config from '../../../config';
import bcrypt from 'bcrypt';
import { generateOtp } from '../../../utils/crypto';
import { IUser } from '../user/user.interface';
import sendSMS from '../../../shared/sendSMS';

export const createUser = async (payload: IUser) => {
  payload.phone = payload.phone?.trim();

  const existingUser = await User.findOne({
    phone: payload.phone,
    status: { $nin: [USER_STATUS.DELETED] },
  });

  if (existingUser) {
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

  if (payload.role === USER_ROLES.DRIVER) {
    payload.driverInfo = {
      vehicleType: payload.driverInfo?.vehicleType,
      nidFront: payload.driverInfo?.nidFront || '',
      nidBack: payload.driverInfo?.nidBack || '',
      drivingLicense: payload.driverInfo?.drivingLicense || '',
      criminalReport: payload.driverInfo?.criminalReport || '',
      profileVerification: PROFILE_VERIFICATION_STATUS.PENDING,
      rejectReason: '',
      totalRating: 0,
      averageRating: 0,
      wallet: 0,
    };
  } else {
    delete payload.driverInfo;
  }

  const user = await User.create({
    ...payload,
    authentication,
    role: payload.role || USER_ROLES.CUSTOMER,
  });

  try {
    await sendSMS(payload.phone, `Your Milesquad verification code is: ${otp}`);
  } catch (error) {
    console.log('Failed to send SMS:', error);
  }

  // Send magic link if email is provided
  if (payload.email?.trim()) {
    try {
      await AuthHelper.sendEmailVerificationMagicLink(
        user._id,
        payload.email,
        payload.fullName
      );
    } catch (error) {
      console.log('Failed to send email verification magic link:', error);
    }
  }

  return { userId: user._id, otp };
};

const login = async (payload: ILoginData): Promise<IAuthResponse> => {
  const phone = payload.phone?.trim();
  if (!phone) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Phone number is required');
  }

  const existingUser = await User.findOne({
    phone,
    status: { $ne: USER_STATUS.DELETED },
  })
    .select('+password +authentication')
    .lean();

  if (!existingUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number'
    );
  }

  return await AuthCommonServices.handleLoginLogic(payload, existingUser);
};

const forgetPassword = async (phone: string) => {
  const cleanPhone = phone?.trim();
  const existingUser = await User.findOne({
    phone: cleanPhone,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  });

  if (!existingUser) {
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
    existingUser._id,
    { $set: { authentication } },
    { new: true }
  );

  try {
    await sendSMS(cleanPhone, `Your Milesquad password reset OTP is: ${otp}`);
  } catch (error) {
    console.log('Failed to send reset SMS:', error);
  }

  return { message: 'OTP sent to your phone successfully.', otp };
};

const resetPassword = async (payload: { token?: string; newPassword: string; confirmPassword: string }) => {
  const { token, newPassword, confirmPassword } = payload;

  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Reset auth token is required');
  }

  if (!newPassword || !confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New password and confirm password are required');
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'New password and confirm password do not match');
  }

  let verifiedToken: any;
  try {
    verifiedToken = jwtHelper.verifyToken(token, config.jwt.jwt_secret as Secret);
  } catch (error) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired reset token');
  }

  const userId = verifiedToken.authId || verifiedToken.id;
  const existingUser = await User.findById(userId).select('+password +authentication');

  if (!existingUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const hashedPassword = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  await User.findByIdAndUpdate(existingUser._id, {
    $set: {
      password: hashedPassword,
      authentication: {
        resetPassword: false,
        oneTimeCode: '',
        expiresAt: null,
        latestRequestAt: null,
        requestCount: 0,
        restrictionLeftAt: null,
        wrongLoginAttempts: 0,
        authType: '',
      },
    },
  });

  return { message: 'Password reset successfully' };
};

const verifyAccount = async (
  phone: string,
  onetimeCode: string,
): Promise<any> => {
  if (!onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is required.');
  }

  const cleanPhone = phone?.trim();
  const existingUser = await User.findOne({
    phone: cleanPhone,
    status: { $nin: [USER_STATUS.DELETED] },
  })
    .select('+password +authentication')
    .lean();

  if (!existingUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number, please register first.'
    );
  }

  const { authentication } = existingUser;

  if (authentication?.oneTimeCode !== onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP, please try again.');
  }

  if (authentication?.expiresAt && new Date(authentication.expiresAt) < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP has expired, please try again.');
  }

  // Check if this OTP verification is for Reset Password flow
  if (authentication?.authType === 'resetPassword' || authentication?.resetPassword) {
    const token = jwtHelper.createToken(
      { authId: existingUser._id, role: existingUser.role, isResetToken: true },
      config.jwt.jwt_secret as Secret,
      '15m'
    );

    return {
      status: StatusCodes.OK,
      message: 'OTP verified successfully.',
      isResetPasswordFlow: true,
      token,
    };
  }

  await User.findByIdAndUpdate(
    existingUser._id,
    {
      $set: {
        isPhoneVerified: true,
        status: USER_STATUS.ACTIVE,
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
    existingUser._id,
    existingUser.role,
    existingUser.fullName,
    existingUser.phone
  );

  const userInfo = {
    id: existingUser._id,
    role: existingUser.role,
    name: existingUser.fullName,
    phone: existingUser.phone,
    image: existingUser.image || '',
  };

  return authResponse(
    StatusCodes.OK,
    `Welcome ${existingUser.fullName} to our platform.`,
    existingUser.role,
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
  const existingUser = await User.findOne({
    phone: phone.trim(),
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  }).select('+authentication');

  if (!existingUser) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this phone number.'
    );
  }

  const { authentication } = existingUser;
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
    existingUser._id,
    { $set: { authentication: authenticationPayload } },
    { new: true }
  );

  try {
    await sendSMS(phone.trim(), `Your Milesquad verification OTP is: ${otp}`);
  } catch (error) {
    console.log('Failed to resend SMS:', error);
  }

  return { message: 'OTP sent to your phone successfully.', otp };
};

const changePassword = async (
  user: JwtPayload,
  currentPassword: string,
  newPassword: string
) => {
  const userId = user.authId;
  const existingUser = await User.findById(userId).select('+password');

  if (!existingUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isPasswordMatch = await User.isPasswordMatched(
    currentPassword,
    existingUser.password
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
  const existingUser = await User.findById(userId).select('+password');

  if (!existingUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete account.');
  }

  if (existingUser.status === USER_STATUS.DELETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Account is already deleted.');
  }

  const isPasswordMatched = await bcrypt.compare(password, existingUser.password);

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

const verifyEmail = async (token: string) => {
  if (!token) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Verification token is required.');
  }

  let decodedToken: JwtPayload;
  try {
    decodedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_secret as Secret
    );
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired email verification link.');
  }

  const { authId, email } = decodedToken;
  const existingUser = await User.findById(authId);

  if (!existingUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found.');
  }

  const updatedUser = await User.findByIdAndUpdate(
    authId,
    {
      $set: {
        email: email || existingUser.email,
        isEmailVerified: true,
      },
    },
    { new: true }
  ).select('-password -authentication');

  return updatedUser;
};

export const AuthServices = {
  createUser,
  login,
  verifyAccount,
  verifyEmail,
  forgetPassword,
  resetPassword,
  resendOtp,
  getAccessToken,
  changePassword,
  deleteAccount,
};
