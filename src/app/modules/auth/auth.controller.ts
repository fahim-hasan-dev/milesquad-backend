import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { AuthServices } from './auth.service';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import config from '../../../config';

const customLogin = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.login(req.body);
  const { status, message, accessToken, refreshToken, userInfo } = result;

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      secure: config.node_env === 'production',
      httpOnly: true,
    });
  }

  sendResponse(res, {
    statusCode: status,
    success: true,
    message,
    data: { accessToken, refreshToken, userInfo },
  });
});

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.createUser(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'User registered successfully. Verification OTP sent via SMS.',
    data: { userId: result },
  });
});

const verifyAccount = catchAsync(async (req: Request, res: Response) => {
  const { phone, oneTimeCode, otp } = req.body;
  const result = await AuthServices.verifyAccount(phone, oneTimeCode || otp);
  const { status, message, accessToken, refreshToken, userInfo } = result;

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      secure: config.node_env === 'production',
      httpOnly: true,
    });
  }

  sendResponse(res, {
    statusCode: status,
    success: true,
    message,
    data: { accessToken, refreshToken, userInfo },
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const result = await AuthServices.forgetPassword(phone);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthServices.resetPassword(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
  });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const result = await AuthServices.resendOtp(phone);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result,
  });
});

const getAccessToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;
  const result = await AuthServices.getAccessToken(refreshToken);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Token refreshed successfully',
    data: result,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const result = await AuthServices.changePassword(
    req.user!,
    currentPassword,
    newPassword,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
  });
});

const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const { password } = req.body;
  const result = await AuthServices.deleteAccount(req.user!, password);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result.deletedData,
  });
});

const logOut = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    secure: config.node_env === 'production',
    httpOnly: true,
  });
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Logged out successfully',
  });
});

export const AuthController = {
  createUser,
  login: customLogin,
  verifyAccount,
  forgetPassword,
  resetPassword,
  resendOtp,
  getAccessToken,
  changePassword,
  deleteAccount,
  logOut,
};
