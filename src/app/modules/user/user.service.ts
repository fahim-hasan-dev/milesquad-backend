import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IUser } from './user.interface';
import { User } from './user.model';
import { USER_ROLES, USER_STATUS } from '../../../enum/user';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import { AuthHelper } from '../auth/auth.helper';

const getAllUser = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(User.find().select('-password -authentication'), query)
        .search(['fullName', 'phone'])
        .filter()
        .sort()
        .fields()
        .paginate();

    const rawUsers = await userQueryBuilder.modelQuery.lean();
    const users = rawUsers.map((u: any) => {
        if (u.role !== USER_ROLES.DRIVER) {
            delete u.driverInfo;
        }
        return u;
    });

    const paginationInfo = await userQueryBuilder.getPaginationInfo();
    const totalUsers = await User.countDocuments({ status: { $ne: USER_STATUS.DELETED } });

    return {
        users,
        staticData: { totalUsers },
        meta: paginationInfo,
    };
};

const getSingleUser = async (id: string) => {
    const user: any = await User.findById(id).select('-password -authentication').lean();
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }
    if (user.role !== USER_ROLES.DRIVER) {
        delete user.driverInfo;
    }
    return user;
};

const deleteUser = async (id: string) => {
    const user = await User.findById(id);
    if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }
    return await User.findByIdAndDelete(id);
};

const updateProfile = async (
    user: JwtPayload,
    payload: Partial<IUser>
) => {
    const userId = user.authId || user.id;
    const existingUser = await User.findById(userId);

    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or deleted.');
    }

    const cleanEmail = payload.email?.trim();
    if (cleanEmail && cleanEmail !== existingUser.email) {
        payload.isEmailVerified = false;
        try {
            await AuthHelper.sendEmailVerificationMagicLink(
                userId,
                cleanEmail,
                payload.fullName || existingUser.fullName
            );
        } catch (error) {
            console.log('Failed to send verification email magic link:', error);
        }
    }

    const updatedUser: any = await User.findOneAndUpdate(
        { _id: userId, status: { $ne: USER_STATUS.DELETED } },
        payload,
        { new: true },
    ).select('-password -authentication').lean();

    if (!updatedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile');
    }

    if (updatedUser.role !== USER_ROLES.DRIVER) {
        delete updatedUser.driverInfo;
    }

    return updatedUser;
};

const getProfile = async (user: JwtPayload) => {
    const userId = user.authId || user.id;
    const existingUser: any = await User.findById(userId).select('-password -authentication').lean();
    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Profile not found or deleted.');
    }
    if (existingUser.role !== USER_ROLES.DRIVER) {
        delete existingUser.driverInfo;
    }
    return existingUser;
};

const deleteMyAccount = async (user: JwtPayload) => {
    const userId = user.authId || user.id;
    const existingUser = await User.findById(userId);
    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Profile not found or deleted.');
    }
    await User.findByIdAndDelete(userId);
    return 'Account deleted successfully';
};

export const UserServices = {
    updateProfile,
    getAllUser,
    getSingleUser,
    deleteUser,
    getProfile,
    deleteMyAccount,
};
