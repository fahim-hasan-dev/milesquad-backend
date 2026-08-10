import { StatusCodes } from 'http-status-codes'
import { IAuthResponse, IResetPassword } from './auth.interface'
import { User } from '../user/user.model'
import ApiError from '../../../errors/ApiError'
import { USER_ROLES, USER_STATUS } from '../../../enum/user'
import { AuthHelper } from './auth.helper'
import {
  AuthCommonServices,
  authResponse,
} from './loginService'
import { ILoginData } from '../../../interfaces/auth'
import { emailTemplate } from '../../../shared/emailTemplate'
import { emailHelper } from '../../../helpers/emailHelper'
import { JwtPayload } from 'jsonwebtoken'
import { jwtHelper } from '../../../helpers/jwtHelper'
import config from '../../../config'
import bcrypt from 'bcrypt'
import cryptoToken, { generateOtp } from '../../../utils/crypto'
import { Token } from '../token/token.model'
import { IUser } from '../user/user.interface'
import mongoose from 'mongoose'

export const createUser = async (payload: IUser) => {
  payload.email = payload.email?.toLowerCase().trim()
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    if (payload.role === USER_ROLES.ADMIN) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Admin account creation is not allowed.`,
      )
    }

    // 1. Check if user already exists
    const isUserExist = await User.findOne({
      email: payload.email,
      status: { $nin: [USER_STATUS.DELETED] },
    }).session(session)

    if (isUserExist) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `An account with this email already exists.`,
      )
    }

    // 2. Generate OTP
    const otp = generateOtp()
    const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000)

    const authentication = {
      oneTimeCode: otp,
      expiresAt: otpExpiresIn,
      latestRequestAt: new Date(),
      requestCount: 1,
      authType: 'createAccount' as const,
      restrictionLeftAt: null,
      resetPassword: false,
      wrongLoginAttempts: 0,
    }

    // 3. Send OTP email
    setTimeout(() => {
      const createAccountEmail = emailTemplate.createAccount({
        name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        otp,
      })
      emailHelper.sendEmail(createAccountEmail)
    }, 0)

    // 4. Create User
    const user = await User.create(
      [
        {
          ...payload,
          password: payload.password,
          authentication,
          role: payload.role || USER_ROLES.USER,
        },
      ],
      { session },
    )

    if (!user[0])
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user.')

    const createdUser = user[0]

    // 5. Commit Transaction
    await session.commitTransaction()
    return createdUser._id
  } catch (error) {
    // Rollback on error
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

const login = async (payload: ILoginData): Promise<IAuthResponse> => {
  const { email, phone } = payload
  const query = email ? { email: email.toLowerCase().trim() } : { phone: phone }

  const isUserExist = await User.findOne({
    ...query,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  })
    .select('+password +authentication')
    .lean()

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  const result = await AuthCommonServices.handleLoginLogic(payload, isUserExist)
  return result
}

const adminLogin = async (payload: ILoginData): Promise<IAuthResponse> => {
  const { email, phone } = payload
  const query = email ? { email: email.trim().toLowerCase() } : { phone: phone }

  const isUserExist = await User.findOne({
    ...query,
  })
    .select('+password +authentication')
    .lean()

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  if (isUserExist.role !== USER_ROLES.ADMIN) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You are not authorized to login as admin',
    )
  }

  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    payload.password,
    isUserExist.password as string,
  )

  if (!isPasswordMatch) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Please try again with correct credentials.',
    )
  }

  // Create tokens
  const tokens = AuthHelper.createToken(
    isUserExist._id,
    isUserExist.role,
    `${isUserExist.firstName} ${isUserExist.lastName}`,
    isUserExist.email,
  )

  return authResponse(
    StatusCodes.OK,
    `Welcome back ${isUserExist.firstName}`,
    isUserExist.role,
    tokens.accessToken,
    tokens.refreshToken,
  )
}

const forgetPassword = async (email?: string, phone?: string) => {
  const query = email
    ? { email: email.toLocaleLowerCase().trim() }
    : { phone: phone }
  const isUserExist = await User.findOne({
    ...query,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  })

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No account found with this email or phone',
    )
  }

  const otp = generateOtp()

  const authentication = {
    resetPassword: true,
    oneTimeCode: otp,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'resetPassword' as const,
    restrictionLeftAt: null,
    wrongLoginAttempts: 0,
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    {
      $set: { authentication: authentication },
    },
    { new: true },
  )

  // Send OTP to user
  if (email) {
    const forgetPasswordEmailTemplate = emailTemplate.resetPassword({
      name: `${isUserExist.firstName} ${isUserExist.lastName}`,
      email: isUserExist.email,
      otp,
    })

    setTimeout(() => {
      emailHelper.sendEmail(forgetPasswordEmailTemplate)
    }, 0)
  }

  return 'OTP sent successfully.'
}

const resetPassword = async (resetToken: string, payload: IResetPassword) => {
  const { newPassword, confirmPassword } = payload
  if (newPassword !== confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Passwords do not match')
  }

  const isTokenExist = await Token.findOne({ token: resetToken }).lean()

  if (!isTokenExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You don't have authorization to reset your password, please verify your account first.",
    )
  }

  const isUserExist = await User.findById(isTokenExist.user)
    .select('+authentication')
    .lean()
  console.log(isUserExist)

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested user not found, please try again or contact support.',
    )
  }

  const { authentication } = isUserExist
  if (!authentication?.resetPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You don\'t have permission to change the password. Please click again to "Forgot Password"',
    )
  }

  const isTokenValid = isTokenExist?.expireAt > new Date()
  if (!isTokenValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your reset token has expired, please try again.',
    )
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  )

  const updatedUserData = {
    password: hashPassword,
    authentication: {
      resetPassword: false,
      oneTimeCode: '',
      expiresAt: null,
      latestRequestAt: new Date(),
      requestCount: 0,
      restrictionLeftAt: null,
      wrongLoginAttempts: 0,
    },
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    { $set: updatedUserData },
    { new: true },
  )

  return { message: 'Password reset successfully' }
}

const verifyAccount = async (
  email: string,
  onetimeCode: string,
): Promise<IAuthResponse> => {
  //verify fo new user
  if (!onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is required.')
  }
  const isUserExist = await User.findOne({
    email: email.toLowerCase().trim(),
    status: { $nin: [USER_STATUS.DELETED] },
  })
    .select('+password +authentication')
    .lean()

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email}, please register first.`,
    )
  }

  const { authentication } = isUserExist

  //check the otp
  if (authentication?.oneTimeCode !== onetimeCode) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid OTP, please try again.',
    )
  }

  const currentDate = new Date()
  if (authentication?.expiresAt! < currentDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'OTP has expired, please try again.',
    )
  }

  //either newly created user or existing user
  if (!isUserExist.verified) {
    await User.findByIdAndUpdate(
      isUserExist._id,
      { $set: { verified: true } },
      { new: true },
    )

    const tokens = AuthHelper.createToken(
      isUserExist._id,
      isUserExist.role,
      isUserExist.firstName + ' ' + isUserExist.lastName,
      isUserExist.email,
    )
    const userInfo = {
      id: isUserExist._id,
      role: isUserExist.role,
      name: `${isUserExist.firstName!} ${isUserExist.lastName!}`,
      email: isUserExist.email!,
      image: isUserExist.image!,
    }

    return authResponse(
      StatusCodes.OK,
      `Welcome ${isUserExist.firstName} ${isUserExist.lastName} to our platform.`,
      undefined,
      tokens.accessToken,
      tokens.refreshToken,
      undefined,
      userInfo,
    )
  } else {
    await User.findByIdAndUpdate(
      isUserExist._id,
      {
        $set: {
          authentication: {
            oneTimeCode: '',
            expiresAt: null,
            latestRequestAt: null,
            requestCount: 0,
            authType: '',
            resetPassword: true,
          },
        },
      },
      { new: true },
    )

    const token = await Token.create({
      token: cryptoToken(),
      user: isUserExist._id,
      expireAt: new Date(Date.now() + 5 * 60 * 1000), // 15 minutes
    })
    console.log(token.token)

    if (!token) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        ' please try again. or contact support.',
      )
    }

    return authResponse(
      StatusCodes.OK,
      'OTP verified successfully, please reset your password.',
      undefined,
      undefined,
      undefined,
      token.token,
    )
  }
}

const getAccessToken = async (token: string) => {
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token is required')
  }

  try {
    const decodedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_refresh_secret as string,
    )

    const { userId, role } = decodedToken

    const tokens = AuthHelper.createToken(
      userId,
      role,
      decodedToken.name,
      decodedToken.email,
    )

    return {
      accessToken: tokens.accessToken,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token has expired')
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Refresh Token')
  }
}



const resendOtpToPhoneOrEmail = async (
  authType: 'resetPassword' | 'createAccount',
  email?: string,
  phone?: string,
) => {
  const query = email ? { email: email } : { phone: phone }
  const isUserExist = await User.findOne({
    ...query,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  }).select('+authentication')

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  // Check the request count
  const { authentication } = isUserExist
  if (authentication?.requestCount! >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have exceeded the maximum number of requests. Please try again later.',
    )
  }

  const otp = generateOtp()
  const updatedAuthentication = {
    ...authentication,
    oneTimeCode: otp,
    latestRequestAt: new Date(),
    requestCount: authentication?.requestCount! + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    authType: authType,
  }

  // Send OTP to user
  if (email) {
    const forgetPasswordEmailTemplate = emailTemplate.resendOtp({
      email: isUserExist.email,
      name: `${isUserExist.firstName} ${isUserExist.lastName}`,
      otp,
      type: authType,
    })

    await User.findByIdAndUpdate(
      isUserExist._id,
      {
        $set: { authentication: updatedAuthentication },
      },
      { new: true },
    )

    await emailHelper.sendEmail(forgetPasswordEmailTemplate)
  }

  if (phone) {
    // Implement this feature using aws sns
    await User.findByIdAndUpdate(
      isUserExist._id,
      {
        $set: { authentication: updatedAuthentication },
      },
      { new: true },
    )
  }
}

const deleteAccount = async (user: JwtPayload, password: string) => {
  const { authId } = user
  const isUserExist = await User.findById(authId).select('+password')

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete account. Please try again.',
    )
  }

  if (isUserExist.status === USER_STATUS.DELETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested user is already deleted.',
    )
  }

  const isPasswordMatched = await bcrypt.compare(password, isUserExist.password)

  if (!isPasswordMatched) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please provide a valid password to delete your account.',
    )
  }

  const deletedData = await User.findByIdAndUpdate(authId, {
    $set: { status: USER_STATUS.DELETED },
  })

  return {
    status: StatusCodes.OK,
    message: 'Account deleted successfully.',
    deletedData,
  }
}

const resendOtp = async (
  email: string,
  authType: 'createAccount' | 'resetPassword',
) => {
  const isUserExist = await User.findOne({
    email: email.toLowerCase().trim(),
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
  }).select('+authentication')

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email}, please try again.`,
    )
  }

  const { authentication } = isUserExist

  const otp = generateOtp()
  const authenticationPayload = {
    ...authentication,
    oneTimeCode: otp,
    latestRequestAt: new Date(),
    requestCount: authentication?.requestCount! + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  }

  if (authenticationPayload.requestCount! >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have exceeded the maximum number of requests. Please try again later.',
    )
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    {
      $set: { authentication: authenticationPayload },
    },
    { new: true },
  )

  // Send OTP to user
  if (email) {
    const forgetPasswordEmailTemplate = emailTemplate.resendOtp({
      email: email,
      name: `${isUserExist.firstName} ${isUserExist.lastName}`,
      otp,
      type: authType,
    })

    setTimeout(() => {
      emailHelper.sendEmail(forgetPasswordEmailTemplate)
    }, 0)
  }

  return 'OTP sent successfully.'
}

const changePassword = async (
  user: JwtPayload,
  currentPassword: string,
  newPassword: string,
) => {
  // Find the user with password field
  const isUserExist = await User.findById(user.authId)
    .select('+password')
    .lean()

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Check if current password matches
  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    currentPassword,
    isUserExist.password as string,
  )

  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect')
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  )

  // Update the password
  await User.findByIdAndUpdate(
    user.authId,
    { password: hashedPassword },
    { new: true },
  )

  return { message: 'Password changed successfully' }
}

export const AuthServices = {
  forgetPassword,
  resetPassword,
  verifyAccount,
  login,
  getAccessToken,

  resendOtpToPhoneOrEmail,
  deleteAccount,
  resendOtp,
  changePassword,
  createUser,
  adminLogin
}
