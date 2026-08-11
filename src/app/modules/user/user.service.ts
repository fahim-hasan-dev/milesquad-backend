import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IUser } from './user.interface';
import { User } from './user.model';
import { USER_STATUS } from '../../../enum/user';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';

const getAllUser = async (query: Record<string, unknown>) => {
    const userQueryBuilder = new QueryBuilder(User.find().select('-password -authentication'), query)
        .search(['fullName', 'phone'])
        .filter()
        .sort()
        .fields()
        .paginate();

    const users = await userQueryBuilder.modelQuery.lean();
    const paginationInfo = await userQueryBuilder.getPaginationInfo();
    const totalUsers = await User.countDocuments({ status: { $ne: USER_STATUS.DELETED } });

    return {
        users,
        staticData: { totalUsers },
        meta: paginationInfo,
    };
};

const getSingleUser = async (id: string) => {
    const result = await User.findById(id).select('-password -authentication');
    if (!result) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }
    return result;
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
    const isExistUser = await User.findById(userId);

    if (!isExistUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or deleted.');
    }

    const updatedUser = await User.findOneAndUpdate(
        { _id: userId, status: { $ne: USER_STATUS.DELETED } },
        payload,
        { new: true },
    ).select('-password -authentication');

    if (!updatedUser) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update profile');
    }

    return updatedUser;
};

const getProfile = async (user: JwtPayload) => {
    const userId = user.authId || user.id;
    const isExistUser = await User.findById(userId).select('-password -authentication').lean();
    if (!isExistUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Profile not found or deleted.');
    }
    return isExistUser;
};

const deleteMyAccount = async (user: JwtPayload) => {
    const userId = user.authId || user.id;
    const isExistUser = await User.findById(userId);
    if (!isExistUser) {
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
