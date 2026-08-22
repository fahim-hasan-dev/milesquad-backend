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
    data: result,
  });
});

const verifyAccount = catchAsync(async (req: Request, res: Response) => {
  const { phone, oneTimeCode, otp } = req.body;
  const code = oneTimeCode ? oneTimeCode : otp;
  const result: any = await AuthServices.verifyAccount(phone, code);

  if (result.token) {
    sendResponse(res, {
      statusCode: result.status,
      success: true,
      message: result.message,
      data: { token: result.token },
    });
    return;
  }

  if (result.refreshToken) {
    res.cookie('refreshToken', result.refreshToken, {
      secure: config.node_env === 'production',
      httpOnly: true,
    });
  }

  sendResponse(res, {
    statusCode: result.status,
    success: true,
    message: result.message,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      userInfo: result.userInfo,
    },
  });
});

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const result = await AuthServices.forgetPassword(phone);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.body?.token;
  const { newPassword, confirmPassword } = req.body;
  const result = await AuthServices.resetPassword({
    token,
    newPassword,
    confirmPassword,
  });

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
    message: result.message,
    data: result,
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
  const currentPassword = req.body.currentPassword || req.body.oldPassword;
  const newPassword = req.body.newPassword;
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

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const token = (req.query.token as string) || req.body?.token;
  const result = await AuthServices.verifyEmail(token);

  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Milesquad - Email Verified</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f0f2f5; }
          .card { background: #ffffff; padding: 40px 30px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); text-align: center; max-width: 420px; width: 90%; }
          .icon { font-size: 60px; color: #2ecc71; margin-bottom: 20px; }
          h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 12px; }
          p { color: #666666; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .badge { display: inline-block; background-color: #e8f8f0; color: #2ecc71; padding: 8px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✓</div>
          <h1>Email Verified Successfully!</h1>
          <p>Your email address has been verified for Milesquad. You can now return to the mobile application and continue.</p>
          <div class="badge">Milesquad Mobile App</div>
        </div>
      </body>
      </html>
    `);
    return;
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Email verified successfully.',
    data: result,
  });
});

export const AuthController = {
  createUser,
  login: customLogin,
  verifyAccount,
  verifyEmail,
  forgetPassword,
  resetPassword,
  resendOtp,
  getAccessToken,
  changePassword,
  deleteAccount,
  logOut,
};
