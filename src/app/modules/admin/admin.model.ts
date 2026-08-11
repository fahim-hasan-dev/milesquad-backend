import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import { AdminModel, IAdmin } from "./admin.interface";
import { ADMIN_ROLES, USER_STATUS } from "../../../enum/user";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import config from "../../../config";

const AdminSchema = new Schema<IAdmin, AdminModel>(
    {
        fullName: {
            type: String,
            required: true,
        },
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
        role: {
            type: String,
            enum: Object.values(ADMIN_ROLES),
            default: ADMIN_ROLES.SUB_ADMIN,
        },
        status: {
            type: String,
            enum: Object.values(USER_STATUS),
            default: USER_STATUS.ACTIVE,
        },
        authentication: {
            restrictionLeftAt: { type: Date, default: null },
            resetPassword: { type: Boolean, default: false },
            wrongLoginAttempts: { type: Number, default: 0 },
            passwordChangedAt: Date,
            oneTimeCode: { type: String, default: "" },
            latestRequestAt: { type: Date, default: Date.now },
            expiresAt: Date,
            requestCount: { type: Number, default: 0 },
            authType: { type: String, enum: ['resetPassword'] },
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

AdminSchema.statics.isPasswordMatched = async function (
    givenPassword: string,
    savedPassword: string
) {
    return bcrypt.compare(givenPassword, savedPassword);
};

AdminSchema.pre("save", async function (next) {
    try {
        if (this.isModified("email")) {
            const isExist = await Admin.findOne({
                email: this.email,
                _id: { $ne: this._id },
            });
            if (isExist) {
                return next(new ApiError(StatusCodes.BAD_REQUEST, "An admin with this email already exists"));
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

export const Admin = mongoose.model<IAdmin, AdminModel>("Admin", AdminSchema);
