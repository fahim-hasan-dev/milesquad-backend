import { PARCEL_STATUS } from "../../../enum/parcel";
import { Parcel } from "../parcel/parcel.model";
import { User } from "../user/user.model";
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

const getMyEarningsSummary = async (driverId: string, query: Record<string, unknown>) => {
    checkMongooseIDValidation(driverId, "Driver");
    const id = new Types.ObjectId(driverId);

    const hasCustomRange = Boolean(query.fromDate && query.toDate);
    let startDate: Date;
    let endDate: Date;
    let filterType: "today" | "custom" = "today";

    if (hasCustomRange) {
        filterType = "custom";
        startDate = new Date(String(query.fromDate));
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(String(query.toDate));
        endDate.setHours(23, 59, 59, 999);
    } else {
        const now = new Date();
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
    }

    // Parallel DB execution for optimal speed
    const [driver, aggregationResult] = await Promise.all([
        User.findById(id).select("driverInfo.wallet driverInfo.averageRating").lean(),
        Parcel.aggregate([
            {
                $match: {
                    driver: id,
                    status: PARCEL_STATUS.DELIVERED,
                    deliveredAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    earnings: { $sum: { $ifNull: ["$totalRun", "$driverShare"] } }
                }
            }
        ])
    ]);

    const currentBalance = Number((driver?.driverInfo?.wallet || 0).toFixed(2));
    const rating = driver?.driverInfo?.averageRating || 5.0;
    const earnings = Number((aggregationResult[0]?.earnings || 0).toFixed(2));
    const totalDeliveries = aggregationResult[0]?.count || 0;

    return {
        currentBalance,
        earnings,
        totalDeliveries,
        rating,
        filter: {
            type: filterType,
            fromDate: startDate.toISOString().slice(0, 10),
            toDate: endDate.toISOString().slice(0, 10)
        }
    };
};

export const DriverStatsService = {
    getDriverStats,
    getMyEarningsSummary
};
