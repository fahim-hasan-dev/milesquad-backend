import { User } from '../user/user.model';
import { Parcel } from '../parcel/parcel.model';
import { USER_ROLES } from '../../../enum/user';
import { PARCEL_STATUS } from '../../../enum/parcel';
import { getOrSetCache } from '../../../helpers/cacheHelper';

const CACHE_TTL_ADMIN_STATS = 180; // 3 minutes

const getAdminDashboardStats = async (year: number) => {
    return getOrSetCache(
        `cache:admin:stats:${year}`,
        async () => {
            const totalRevenueResult = await Parcel.aggregate([
                { $match: { status: PARCEL_STATUS.DELIVERED } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $ifNull: ['$totalToPay', { $ifNull: ['$totalPrice', '$totalDeliveryFee'] }] } }
                    }
                }
            ]);
            const totalRevenue = totalRevenueResult[0]?.total || 0;

            const totalUsers = await User.countDocuments({ role: USER_ROLES.CUSTOMER, status: { $ne: 'deleted' } });
            const totalDrivers = await User.countDocuments({ role: USER_ROLES.DRIVER, status: { $ne: 'deleted' } });
            const totalDelivery = await Parcel.countDocuments({ status: { $ne: PARCEL_STATUS.CREATED } });

            const startOfYear = new Date(year, 0, 1);
            const endOfYear = new Date(year, 11, 31, 23, 59, 59);

            const monthlyRevenue = await Parcel.aggregate([
                {
                    $match: {
                        status: PARCEL_STATUS.DELIVERED,
                        createdAt: { $gte: startOfYear, $lte: endOfYear }
                    }
                },
                {
                    $group: {
                        _id: { $month: '$createdAt' },
                        revenue: { $sum: { $ifNull: ['$totalToPay', { $ifNull: ['$totalPrice', '$totalDeliveryFee'] }] } }
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
                userPercentage: totalActiveUsers > 0 ? Math.round((totalUsers / totalActiveUsers) * 100) : 0,
                data: [
                    { name: "Driver", value: totalDrivers, fill: "#10B981", color: "#10B981" },
                    { name: "User", value: totalUsers, fill: "#E2E8F0", color: "#E2E8F0" }
                ]
            };

            const deliveredCount = await Parcel.countDocuments({ status: PARCEL_STATUS.DELIVERED });
            const inTransitCount = await Parcel.countDocuments({
                status: {
                    $in: [
                        PARCEL_STATUS.RIDER_ASSIGNED,
                        PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
                        PARCEL_STATUS.PICKED_UP,
                        PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY,
                    ]
                }
            });
            const pendingCount = await Parcel.countDocuments({ status: { $in: [PARCEL_STATUS.PENDING, PARCEL_STATUS.CREATED, PARCEL_STATUS.CONFIRMED] } });
            const cancelledCount = await Parcel.countDocuments({ status: PARCEL_STATUS.CANCELLED });

            const deliveriesOverview = {
                total: totalDelivery,
                data: [
                    { name: "Completed", value: deliveredCount, percentage: totalDelivery > 0 ? `${((deliveredCount / totalDelivery) * 100).toFixed(1)}%` : "0%", fill: "#10B981", color: "#10B981" },
                    { name: "In Progress", value: inTransitCount, percentage: totalDelivery > 0 ? `${((inTransitCount / totalDelivery) * 100).toFixed(1)}%` : "0%", fill: "#3B82F6", color: "#3B82F6" },
                    { name: "Cancelled", value: cancelledCount, percentage: totalDelivery > 0 ? `${((cancelledCount / totalDelivery) * 100).toFixed(1)}%` : "0%", fill: "#EF4444", color: "#EF4444" },
                    { name: "Pending", value: pendingCount, percentage: totalDelivery > 0 ? `${((pendingCount / totalDelivery) * 100).toFixed(1)}%` : "0%", fill: "#F59E0B", color: "#F59E0B" },
                ]
            };

            const recentParcels = await Parcel.find({ status: { $ne: PARCEL_STATUS.CREATED } })
                .sort({ createdAt: -1 })
                .limit(6)
                .populate("sender", "fullName phone")
                .populate("driver", "fullName phone")
                .lean();

            const completedOrders = recentParcels.map((p: any, idx: number) => {
                const numPrice = Number(p.totalToPay || p.totalPrice || p.totalDeliveryFee || 0);
                return {
                    id: p._id.toString(),
                    sl: idx + 1,
                    bookingId: p.parcelId || p._id.toString(),
                    customerName: p.sender?.fullName || "Guest Customer",
                    driverName: p.driver?.fullName || "Unassigned",
                    price: `$${numPrice.toFixed(2)}`,
                    date: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "N/A",
                    status: p.status || "PENDING"
                };
            });

            return {
                overview: {
                    totalRevenue,
                    totalUsers,
                    totalDrivers,
                    totalDelivery
                },
                salesAnalytics,
                userDistribution,
                deliveriesOverview,
                completedOrders
            };
        },
        CACHE_TTL_ADMIN_STATS
    );
};

export const AdminStatsService = {
    getAdminDashboardStats
};

