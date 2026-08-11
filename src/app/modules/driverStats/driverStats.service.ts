import { PARCEL_STATUS } from "../../../enum/parcel";
import { Parcel } from "../parcel/parcel.model";
import { Types } from "mongoose";
import { checkMongooseIDValidation } from "../../../shared/checkMongooseIDValidation";

const getDriverStats = async (driverId: string) => {
    checkMongooseIDValidation(driverId, "Driver");
    const id = new Types.ObjectId(driverId);
    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    const aggregateStats = async (startDate?: Date) => {
        const matchQuery: any = {
            driver: id,
            status: PARCEL_STATUS.DELIVERED
        };

        if (startDate) {
            matchQuery.deliveredAt = { $gte: startDate, $lte: todayEnd };
        }

        const result = await Parcel.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    earnings: { $sum: "$driverShare" }
                }
            }
        ]);

        return {
            count: result[0]?.count || 0,
            earnings: result[0]?.earnings || 0
        };
    };

    const [today, week, month, total] = await Promise.all([
        aggregateStats(todayStart),
        aggregateStats(weekStart),
        aggregateStats(monthStart),
        aggregateStats()
    ]);

    return {
        todaysEarning: today.earnings,
        todayDeliverdParcel: today.count,
        thisWeekEarning: week.earnings,
        thisWeekDelivery: week.count,
        thisMonthEarning: month.earnings,
        thisMonthDelivery: month.count,
        totalEarning: total.earnings,
        totalDelivered: total.count
    };
};

const getDriverEarnings = async (driverId: string, range: string = 'all') => {
    const id = new Types.ObjectId(driverId);
    const now = new Date();
    const matchQuery: any = {
        driver: id,
        status: PARCEL_STATUS.DELIVERED
    };

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    if (range === 'today') {
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        matchQuery.deliveredAt = { $gte: todayStart, $lte: todayEnd };
    } else if (range === 'weekly') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        matchQuery.deliveredAt = { $gte: weekStart, $lte: todayEnd };
    } else if (range === 'monthly') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        matchQuery.deliveredAt = { $gte: monthStart, $lte: todayEnd };
    }

    const parcels = await Parcel.find(matchQuery)
        .select('_id goodType distance driverShare deliveredAt')
        .sort({ deliveredAt: -1 })
        .lean();

    const totalEarnings = parcels.reduce((sum, p) => sum + (p.driverShare || 0), 0);
    const earningsList = parcels.map(p => ({
        _id: p._id.toString(),
        trackingId: `#TR-${p._id.toString().slice(-4).toUpperCase()}`,
        goodType: p.goodType || 'Parcel',
        distance: p.distance,
        driverShare: p.driverShare,
        deliveredAt: p.deliveredAt
    }));

    return {
        totalEarnings: Number(totalEarnings.toFixed(2)),
        earningsList
    };
};

export const DriverStatsService = {
    getDriverStats,
    getDriverEarnings
};
