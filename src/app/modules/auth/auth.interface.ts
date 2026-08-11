import { Types } from "mongoose";

export type IAuthResponse = {
    status: number;
    message: string;
    role?: string;
    token?: string;
    accessToken?: string;
    refreshToken?: string;
    userInfo?: {
        id: Types.ObjectId;
        role: string;
        name: string;
        phone?: string;
        email?: string;
        image?: string;
    };
};

export type IResetPassword = {
    phone?: string;
    email?: string;
    newPassword: string;
    confirmPassword: string;
};
