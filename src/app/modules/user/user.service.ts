import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IUser } from './user.interface';
import { User } from './user.model';
import { PROFILE_VERIFICATION_STATUS, USER_ROLES, USER_STATUS } from '../../../enum/user';
import { JwtPayload } from 'jsonwebtoken';
import QueryBuilder from '../../builder/QueryBuilder';
import { AuthHelper } from '../auth/auth.helper';
import { NotificationService } from '../notification/notification.service';

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
    const userId = user.authId;
    const existingUser = await User.findById(userId);

    if (!existingUser) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found or deleted.');
    }

    const cleanEmail = payload.email?.trim();
    if (cleanEmail && cleanEmail !== existingUser.email) {
        payload.isEmailVerified = false;
           setTimeout(()=>{
            AuthHelper.sendEmailVerificationMagicLink(
                userId,
                cleanEmail,
                payload.fullName || existingUser.fullName
            );
      
           },0)
    }

    if (existingUser.role === USER_ROLES.DRIVER && existingUser.driverInfo) {
        const hasDriverDocUpdates = payload.driverInfo && (
            payload.driverInfo.nidFront ||
            payload.driverInfo.nidBack ||
            payload.driverInfo.drivingLicense ||
            payload.driverInfo.criminalReport ||
            payload.driverInfo.vehicleType
        );

        if (hasDriverDocUpdates && existingUser.driverInfo.profileVerification === PROFILE_VERIFICATION_STATUS.REJECTED) {
            payload.driverInfo = {
                ...existingUser.driverInfo,
                ...payload.driverInfo,
                profileVerification: PROFILE_VERIFICATION_STATUS.RESUBMITTED,
                rejectReason: '',
            };
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

const approveDriverProfile = async (
    id: string,
    payload: { status: PROFILE_VERIFICATION_STATUS; rejectReason?: string }
) => {
    const driver = await User.findById(id);
    if (!driver) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found');
    }

    if (driver.role !== USER_ROLES.DRIVER) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Selected user is not a driver');
    }

    const updatedUser = await User.findByIdAndUpdate(
        id,
        {
            $set: {
                'driverInfo.profileVerification': payload.status,
                'driverInfo.rejectReason': payload.status === PROFILE_VERIFICATION_STATUS.REJECTED ? (payload.rejectReason || '') : '',
                ...(payload.status === PROFILE_VERIFICATION_STATUS.APPROVED ? { status: USER_STATUS.ACTIVE } : {}),
            },
        },
        { new: true }
    ).select('-password -authentication');

    try {
        await NotificationService.insertNotification({
            receiver: driver._id,
            title: payload.status === PROFILE_VERIFICATION_STATUS.APPROVED ? 'Profile Verification Approved' : 'Profile Verification Rejected',
            message: payload.status === PROFILE_VERIFICATION_STATUS.APPROVED
                ? 'Your driver profile verification has been approved by admin. You can now accept parcel deliveries!'
                : `Your driver profile verification was rejected by admin. Reason: ${payload.rejectReason || 'Invalid or unclear documents'}`,
            screen: 'PROFILE',
            type: USER_ROLES.DRIVER,
        });
    } catch (err) {
        console.log('Failed to send driver verification notification:', err);
    }

    return updatedUser;
};

export const UserServices = {
    updateProfile,
    getAllUser,
    getSingleUser,
    deleteUser,
    getProfile,
    deleteMyAccount,
    approveDriverProfile,
};
