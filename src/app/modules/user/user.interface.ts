import { Model, Types } from "mongoose";
import { PROFILE_VERIFICATION_STATUS, USER_ROLES, USER_STATUS } from "../../../enum/user";
import { VEHICLE_TYPE } from "../../../enum/parcel";

export { USER_ROLES, USER_STATUS, PROFILE_VERIFICATION_STATUS, VEHICLE_TYPE };

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
    fullName: string;
    phone: string;
    email?: string;
    isEmailVerified?: boolean;
    password: string;
    image?: string;
    status: USER_STATUS;
    isPhoneVerified: boolean;
    role: USER_ROLES;
    address?: string;
    location?: [number, number];
    authentication: IAuthentication;
    deviceToken?: string;
    fcmToken?: string[];
    driverInfo?: {
        vehicleType?: VEHICLE_TYPE;
        nidFront?: string;
        nidBack?: string;
        drivingLicense?: string;
        criminalReport?: string;
        profileVerification: PROFILE_VERIFICATION_STATUS;
        rejectReason?: string;
        totalRating: number;
        averageRating: number;
    };
};

export type UserModel = {
    isPasswordMatched: (givenPassword: string, savedPassword: string) => Promise<boolean>;
} & Model<IUser>;
