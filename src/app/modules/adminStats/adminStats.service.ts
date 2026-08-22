import { User } from '../user/user.model';
import { Parcel } from '../parcel/parcel.model';
import { USER_ROLES } from '../../../enum/user';
import { PARCEL_STATUS } from '../../../enum/parcel';

const getAdminDashboardStats = async (year: number) => {
    const totalRevenueResult = await Parcel.aggregate([
        { $match: { status: PARCEL_STATUS.DELIVERED } },
        {
            $group: {
                _id: null,
                total: { $sum: '$platformCommission' }
            }
        }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const totalUsers = await User.countDocuments({ role: USER_ROLES.CUSTOMER });
    const totalDrivers = await User.countDocuments({ role: USER_ROLES.DRIVER });
    const totalDelivery = await Parcel.countDocuments({ status: PARCEL_STATUS.DELIVERED });

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const monthlyRevenue = await Parcel.aggregate([
        {
            $match: {
                status: PARCEL_STATUS.DELIVERED,
                deliveredAt: { $gte: startOfYear, $lte: endOfYear }
            }
        },
        {
            $group: {
                _id: { $month: '$deliveredAt' },
                revenue: { $sum: '$platformCommission' }
            }
        },
        { $sort: { '_id': 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const salesAnalytics = months.map((month, index) => {
        const found = monthlyRevenue.find(item => item._id === index + 1);
        return {
            month,
            revenue: found ? found.revenue : 0
        };
    });

    const totalActiveUsers = totalUsers + totalDrivers;
    const userDistribution = {
        drivers: totalDrivers,
        users: totalUsers,
        driverPercentage: totalActiveUsers > 0 ? Math.round((totalDrivers / totalActiveUsers) * 100) : 0,
        userPercentage: totalActiveUsers > 0 ? Math.round((totalUsers / totalActiveUsers) * 100) : 0
    };

    return {
        overview: {
            totalRevenue,
            totalUsers,
            totalDrivers,
            totalDelivery
        },
        salesAnalytics,
        userDistribution
    };
};

export const AdminStatsService = {
    getAdminDashboardStats
};
