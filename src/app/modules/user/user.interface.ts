import { Model, Types } from "mongoose";
import { PROFILE_VERIFICATION_STATUS, USER_ROLES, USER_STATUS } from "../../../enum/user";
export { USER_ROLES, USER_STATUS, PROFILE_VERIFICATION_STATUS };

export type IAuthentication = {
    restrictionLeftAt: Date | null;
    resetPassword: boolean;
    wrongLoginAttempts: number;
    passwordChangedAt?: Date;
    oneTimeCode: string | null;
    latestRequestAt: Date;
    expiresAt?: Date;
    requestCount?: number;
    authType?: 'createAccount' | 'resetPassword';
};

export type IUser = {
    _id: Types.ObjectId;
    email: string;
    phone?: string;
    image?: string;
    password: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    status: USER_STATUS;
    verified?: boolean;
    isEmailVerified?: boolean;
    role: USER_ROLES;
    address?: string;
    location?: [number, number];
    authentication: IAuthentication;
    deviceToken?: string;
    fcmToken?: string[];
    dateOfBirth?: Date;
    driverInfo?: {
        nid: string[];
        drivingLicense: string[];
        profileVerification: PROFILE_VERIFICATION_STATUS;
        rejectReason?: string;
        assignedVehicle?: Types.ObjectId;
        totalRating: number;
        averageRating: number;
    };
};

export type UserModel = {
    isPasswordMatched: (givenPassword: string, savedPassword: string) => Promise<boolean>;
} & Model<IUser>;
