import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { IUser, USER_STATUS, UserModel } from "./user.interface";
import { PROFILE_VERIFICATION_STATUS, USER_ROLES } from "../../../enum/user";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import config from "../../../config";

const UserSchema = new Schema<IUser, UserModel>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
        },
        phone: {
            type: String,
            default: "",
        },
        password: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            default: "",
        },
        firstName: {
            type: String,
            default: "",
        },
        lastName: {
            type: String,
            default: "",
        },
        fullName: {
            type: String,
            default: "",
        },
        address: {
            type: String,
            default: "",
        },
        location: {
            type: [Number],
            default: [0, 0],
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.ACTIVE,
        },
        verified: {
            type: Boolean,
            default: false,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.USER,
        },
        authentication: {
            restrictionLeftAt: {
                type: Date,
                default: null,
            },
            resetPassword: {
                type: Boolean,
                default: false,
            },
            wrongLoginAttempts: {
                type: Number,
                default: 0,
            },
            passwordChangedAt: Date,
            oneTimeCode: {
                type: String,
                default: "",
            },
            latestRequestAt: {
                type: Date,
                default: Date.now,
            },
            expiresAt: Date,
            requestCount: {
                type: Number,
                default: 0,
            },
            authType: {
                type: String,
                enum: ['createAccount', 'resetPassword'],
            },
        },
        deviceToken: {
            type: String,
            default: "",
        },
        fcmToken: {
            type: [String],
            default: [],
        },
        dateOfBirth: {
            type: Date,
        },
        driverInfo: {
            nid: { type: [String], default: [] },
            drivingLicense: { type: [String], default: [] },
            profileVerification: {
                type: String,
                enum: Object.values(PROFILE_VERIFICATION_STATUS),
                default: PROFILE_VERIFICATION_STATUS.PENDING,
            },
            rejectReason: { type: String, default: "" },
            assignedVehicle: { type: Schema.Types.ObjectId, ref: "Vehicle" },
            totalRating: { type: Number, default: 0 },
            averageRating: { type: Number, default: 0 },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

UserSchema.statics.isPasswordMatched = async function (
    givenPassword: string,
    savedPassword: string
) {
    return bcrypt.compare(givenPassword, savedPassword);
};

UserSchema.pre("save", async function (next) {
    try {
        if (this.isModified("email")) {
            const isExist = await User.findOne({
                email: this.email,
                status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
                _id: { $ne: this._id },
            });

            if (isExist) {
                return next(
                    new ApiError(
                        StatusCodes.BAD_REQUEST,
                        "An account with this email already exists"
                    )
                );
            }
        }
        if (this.isModified("password")) {
            this.password = await bcrypt.hash(
                this.password,
                Number(config.bcrypt_salt_rounds)
            );
        }

        next();
    } catch (error) {
        next(error as Error);
    }
});

export const User = mongoose.model<IUser, UserModel>("User", UserSchema);
