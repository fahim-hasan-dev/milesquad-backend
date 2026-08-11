import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Admin } from './admin.model';
import { IAdmin } from './admin.interface';
import { ADMIN_ROLES, USER_STATUS } from '../../../enum/user';
import { AuthHelper } from '../auth/auth.helper';
import { authResponse } from '../auth/loginService';
import { generateOtp } from '../../../utils/crypto';
import { emailTemplate } from '../../../shared/emailTemplate';
import { emailHelper } from '../../../helpers/emailHelper';
import QueryBuilder from '../../builder/QueryBuilder';
import bcrypt from 'bcrypt';
import config from '../../../config';

const loginAdmin = async (payload: { email: string; password: string }) => {
    const email = payload.email.trim().toLowerCase();
    const admin = await Admin.findOne({ email, status: { $ne: USER_STATUS.DELETED } }).select('+password +authentication');

    if (!admin) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'No admin account found with this email');
    }

    if (admin.status === USER_STATUS.RESTRICTED) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Your admin account is restricted');
    }

    const isPasswordMatched = await Admin.isPasswordMatched(payload.password, admin.password);
    if (!isPasswordMatched) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Incorrect password');
    }

    const tokens = AuthHelper.createToken(admin._id, admin.role, admin.fullName, admin.email);

    return authResponse(
        StatusCodes.OK,
        `Welcome back ${admin.fullName}`,
        admin.role,
        tokens.accessToken,
        tokens.refreshToken,
        undefined,
        {
            id: admin._id,
            role: admin.role,
            name: admin.fullName,
            email: admin.email,
            image: admin.image || '',
        }
    );
};

const createSubAdmin = async (payload: Partial<IAdmin>) => {
    payload.email = payload.email?.trim().toLowerCase();
    const existingAdmin = await Admin.findOne({ email: payload.email });
    if (existingAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'An admin account with this email already exists');
    }

    payload.role = ADMIN_ROLES.SUB_ADMIN;
    payload.status = USER_STATUS.ACTIVE;

    const result = await Admin.create(payload);
    return result;
};

const getAllAdmins = async (query: Record<string, unknown>) => {
    const adminQueryBuilder = new QueryBuilder(Admin.find().select('-password -authentication'), query)
        .search(['fullName', 'email', 'phone'])
        .filter()
        .sort()
        .fields()
        .paginate();

    const admins = await adminQueryBuilder.modelQuery.lean();
    const paginationInfo = await adminQueryBuilder.getPaginationInfo();

    return { admins, meta: paginationInfo };
};

const getSingleAdmin = async (id: string) => {
    const result = await Admin.findById(id).select('-password -authentication');
    if (!result) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }
    return result;
};

const updateAdmin = async (id: string, payload: Partial<IAdmin>) => {
    const existingAdmin = await Admin.findById(id);
    if (!existingAdmin) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }

    if (payload.email) {
        payload.email = payload.email.trim().toLowerCase();
        const existingEmail = await Admin.findOne({ email: payload.email, _id: { $ne: id } });
        if (existingEmail) {
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already in use');
        }
    }

    const result = await Admin.findByIdAndUpdate(id, payload, { new: true }).select('-password -authentication');
    return result;
};

const deleteAdmin = async (id: string) => {
    const admin = await Admin.findById(id);
    if (!admin) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }

    if (admin.role === ADMIN_ROLES.SUPER_ADMIN) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot delete Super Admin');
    }

    return await Admin.findByIdAndDelete(id);
};

const forgetPasswordAdmin = async (email: string) => {
    const admin = await Admin.findOne({ email: email.trim().toLowerCase(), status: { $ne: USER_STATUS.DELETED } });
    if (!admin) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'No admin found with this email');
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Admin.findByIdAndUpdate(admin._id, {
        $set: {
            authentication: {
                oneTimeCode: otp,
                expiresAt,
                resetPassword: true,
                latestRequestAt: new Date(),
                authType: 'resetPassword',
                wrongLoginAttempts: 0,
                restrictionLeftAt: null,
            },
        },
    });

    const emailContent = emailTemplate.resetPassword({
        name: admin.fullName,
        email: admin.email,
        otp,
    });

    setTimeout(() => {
        emailHelper.sendEmail(emailContent);
    }, 0);

    return 'OTP sent to your admin email successfully.';
};

const resetPasswordAdmin = async (payload: { email: string; otp: string; newPassword: string }) => {
    const admin = await Admin.findOne({ email: payload.email.trim().toLowerCase() }).select('+authentication');
    if (!admin) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found');
    }

    if (admin.authentication?.oneTimeCode !== payload.otp) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
    }

    if (admin.authentication?.expiresAt && new Date() > admin.authentication.expiresAt) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP has expired');
    }

    const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds));

    await Admin.findByIdAndUpdate(admin._id, {
        $set: {
            password: hashedPassword,
            authentication: {
                oneTimeCode: '',
                expiresAt: null,
                resetPassword: false,
                latestRequestAt: new Date(),
                wrongLoginAttempts: 0,
                restrictionLeftAt: null,
            },
        },
    });

    return 'Admin password reset successfully';
};

export const AdminServices = {
    loginAdmin,
    createSubAdmin,
    getAllAdmins,
    getSingleAdmin,
    updateAdmin,
    deleteAdmin,
    forgetPasswordAdmin,
    resetPasswordAdmin,
};
