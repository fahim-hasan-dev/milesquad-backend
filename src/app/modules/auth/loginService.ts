import { StatusCodes } from 'http-status-codes';
import { ILoginData } from '../../../interfaces/auth';
import ApiError from '../../../errors/ApiError';
import { USER_STATUS } from '../../../enum/user';
import { User } from '../user/user.model';
import { AuthHelper } from './auth.helper';
import { generateOtp } from '../../../utils/crypto';
import { IAuthResponse } from './auth.interface';
import { IUser } from '../user/user.interface';
import sendSMS from '../../../shared/sendSMS';

const handleLoginLogic = async (payload: ILoginData, isUserExist: IUser): Promise<IAuthResponse> => {
  const { authentication, isPhoneVerified, status, password } = isUserExist;
  const { restrictionLeftAt } = authentication;

  if (!isPhoneVerified) {
    const otp = generateOtp();
    const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000);

    await User.findByIdAndUpdate(isUserExist._id, {
      $set: {
        'authentication.oneTimeCode': otp,
        'authentication.expiresAt': otpExpiresIn,
        'authentication.latestRequestAt': new Date(),
        'authentication.authType': 'createAccount',
      },
    });

    try {
      await sendSMS(isUserExist.phone, `Your Milesquad verification code is: ${otp}`);
    } catch (err) {
      console.log('SMS error:', err);
    }

    return authResponse(
      StatusCodes.PROXY_AUTHENTICATION_REQUIRED,
      `Your account is not verified. A new OTP has been sent to ${isUserExist.phone}. Please verify your account before logging in.`,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        isPhoneVerified: false,
        phone: isUserExist.phone,
        ...(process.env.NODE_ENV === 'development' ? { otp } : {}),
      } as any
    );
  }

  if (status === USER_STATUS.DELETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No account found with this phone number');
  }

  if (status === USER_STATUS.RESTRICTED) {
    if (restrictionLeftAt && new Date() < restrictionLeftAt) {
      const remainingMinutes = Math.ceil((restrictionLeftAt.getTime() - Date.now()) / 60000);
      throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, `You are restricted from logging in for ${remainingMinutes} minutes`);
    }

    await User.findByIdAndUpdate(isUserExist._id, {
      $set: {
        authentication: { restrictionLeftAt: null, wrongLoginAttempts: 0 },
        status: USER_STATUS.ACTIVE,
      },
    });
  }

  const isPasswordMatched = await User.isPasswordMatched(payload.password, password);
  if (!isPasswordMatched) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Incorrect password, please try again.');
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    {
      $set: {
        authentication: { restrictionLeftAt: null, wrongLoginAttempts: 0 },
      },
    },
    { new: true },
  );

  const tokens = AuthHelper.createToken(isUserExist._id, isUserExist.role, isUserExist.fullName, isUserExist.phone);
  const userInfo = {
    id: isUserExist._id,
    role: isUserExist.role,
    name: isUserExist.fullName,
    phone: isUserExist.phone,
    image: isUserExist.image || '',
  };

  return authResponse(
    StatusCodes.OK,
    `Welcome back ${isUserExist.fullName}`,
    isUserExist.role,
    tokens.accessToken,
    tokens.refreshToken,
    undefined,
    userInfo
  );
};

export const AuthCommonServices = {
  handleLoginLogic,
};

export const authResponse = (
  status: number,
  message: string,
  role?: string,
  accessToken?: string,
  refreshToken?: string,
  token?: string,
  userInfo?: IAuthResponse['userInfo'],
): IAuthResponse => {
  return {
    status,
    message,
    ...(role && { role }),
    ...(accessToken && { accessToken }),
    ...(refreshToken && { refreshToken }),
    ...(token && { token }),
    ...(userInfo && { userInfo }),
  };
};
