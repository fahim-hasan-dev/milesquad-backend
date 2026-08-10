import { Types } from "mongoose"
import { USER_ROLES } from "../user/user.interface"

export type IEmailOrPhoneOtpVerification = {
    oneTimeCode: string
    email?: string
    phone?: string
}

export type IVerificationResponse = {
    verified: boolean
    message: string
}

export type IForgetPassword = {
    email?: string
    phone?: string
}

export type IResetPassword = {
    email?: string
    phone?: string
    newPassword: string
    confirmPassword: string
}


export type IAuthResponse = {
    status: number
    message: string
    role?: string
    token?: string
    accessToken?: string
    refreshToken?: string
    userInfo?: {
        id: Types.ObjectId
        role: USER_ROLES
        name: string
        email: string
        image?: string
    }
}
