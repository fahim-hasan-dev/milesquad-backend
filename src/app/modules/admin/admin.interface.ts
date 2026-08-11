import { Model, Types } from "mongoose";
import { ADMIN_ROLES, USER_STATUS } from "../../../enum/user";

export type IAdminAuthentication = {
    restrictionLeftAt: Date | null;
    resetPassword: boolean;
    wrongLoginAttempts: number;
    passwordChangedAt?: Date;
    oneTimeCode: string | null;
    latestRequestAt: Date;
    expiresAt?: Date;
    requestCount?: number;
    authType?: 'resetPassword';
};

export type IAdmin = {
    _id: Types.ObjectId;
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    image?: string;
    role: ADMIN_ROLES;
    status: USER_STATUS;
    authentication: IAdminAuthentication;
};

export type AdminModel = {
    isPasswordMatched: (givenPassword: string, savedPassword: string) => Promise<boolean>;
} & Model<IAdmin>;
