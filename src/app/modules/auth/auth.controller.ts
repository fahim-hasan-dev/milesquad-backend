import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import { AuthServices } from './auth.service'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import config from '../../../config'

const customLogin = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body

  const result = await AuthServices.login(loginData)
  const { status, message, accessToken, refreshToken, role, userInfo } = result
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      secure: config.node_env === 'production',
      httpOnly: true,
    })
  }

  sendResponse(res, {
    statusCode: status,
    success: true,
    message: message,
    data: { accessToken, refreshToken, userInfo },
  })
})

const adminLogin = catchAsync(async (req: Request, res: Response) => {
  const { ...loginData } = req.body

  const result = await AuthServices.adminLogin(loginData)
  const { status, message, accessToken, refreshToken, role } = result

  sendResponse(res, {
    statusCode: status,
    success: true,
    message: message,
    data: { accessToken, refreshToken, role },
  })
})

const forgetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, phone } = req.body
  const result = await AuthServices.forgetPassword(
    email.toLowerCase().trim(),
    phone,
  )
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `An OTP has been sent to your ${email || phone}. Please verify your email.`,
    data: result,
  })
})

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const token = req.query.token as string
  const { ...resetData } = req.body

  const result = await AuthServices.resetPassword(token!, resetData)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Password reset successfully, please login now.',
    data: result,
  })
})

const verifyAccount = catchAsync(async (req: Request, res: Response) => {
  const { oneTimeCode, phone, email } = req.body

  const result = await AuthServices.verifyAccount(email, oneTimeCode)
  const { status, message, accessToken, refreshToken, token, userInfo } = result
  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      secure: config.node_env === 'production',
      httpOnly: true,
    })
  }

  sendResponse(res, {
    statusCode: status,
    success: true,
    message: message,
    data: { accessToken, refreshToken, token, userInfo },
  })
})

const getAccessToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies
  const result = await AuthServices.getAccessToken(refreshToken)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Token refreshed successfully',
    data: result,
  })
})

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, phone, authType } = req.body
  const result = await AuthServices.resendOtp(email, authType)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `An OTP has been sent to your ${email || phone}. Please verify your email.`,
  })
})

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  const result = await AuthServices.changePassword(
    req.user!,
    currentPassword,
    newPassword,
  )
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Password changed successfully',
    data: result,
  })
})

const createUser = catchAsync(async (req: Request, res: Response) => {
  const { ...userData } = req.body
  const result = await AuthServices.createUser(userData)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User created successfully',
    data: result,
  })
})
const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const user = req.user
  const { password } = req.body
  const result = await AuthServices.deleteAccount(user!, password)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Account deleted successfully',
    data: result,
  })
})

const logOut = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    secure: config.node_env === 'production',
    httpOnly: true,
  })
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Logged out successfully',
  })
})

export const AuthController = {
  forgetPassword,
  resetPassword,
  verifyAccount,
  login: customLogin,
  getAccessToken,
  resendOtp,
  changePassword,
  createUser,
  deleteAccount,
  adminLogin,

  logOut
}
