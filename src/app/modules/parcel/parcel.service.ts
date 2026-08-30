import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IParcel, IStatusProgress } from "./parcel.interface";
import { Parcel } from "./parcel.model";
import { PARCEL_STATUS, PAYMENT_METHOD } from "../../../enum/parcel";
import { parcelCleanupQueue, reviewReminderQueue } from "../../../queues";
import stripe from "../../../config/stripe";
import { Payment } from "../payment/payment.model";
import QueryBuilder from "../../builder/QueryBuilder";
import { trackingService } from "../../../helpers/trackingService";
import { getDistanceAndDuration } from "../../../utils/googleMaps.util";
import { SettingServices } from "../setting/setting.service";
import { redisClient } from "../../../helpers/redis";
import { cacheDel, cacheDelByPattern } from "../../../helpers/cacheHelper";
import { createPaymentSession } from "../../../stripe/createPaymentSession";
import { JwtPayload } from "jsonwebtoken";
import { NotificationService } from "../notification/notification.service";
import { ADMIN_ROLES, USER_ROLES, USER_STATUS } from "../../../enum/user";
import { Review } from "../review/review.model";
import { calculateParcelPricing } from "../../../utils/pricingCalculator.util";
import { User } from "../user/user.model";
import { Partner } from "../partner/partner.model";
import { emailHelper } from "../../../helpers/emailHelper";
import { Transaction } from "../transaction/transaction.model";
import { getNextCustomId } from "../counter/counter.model";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "../../../enum/transaction";
import config from "../../../config";
import { generateInvoiceHTML, generateInvoicePDFBuffer } from "../../../helpers/invoiceHelper";
import {
    emitParcelStatusUpdate,
    updateStatusProgress,
    notifyNearbyDriversOfNewParcel,
    notifyNearbyDriversOfRemovedParcel,
    calculatePickUpMetrics,
} from "./parcel.utils";

const getOrCalculateParcelDistance = async (query: Record<string, any>) => {
    const { pickupLat, pickupLng, dropLat, dropLng } = query;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "Missing coordinates. Required: pickupLat, pickupLng, dropLat, dropLng."
        );
    }

    const pickupLatitude = Number(pickupLat);
    const pickupLongitude = Number(pickupLng);
    const dropLatitude = Number(dropLat);
    const dropLongitude = Number(dropLng);

    if (isNaN(pickupLatitude) || isNaN(pickupLongitude) || isNaN(dropLatitude) || isNaN(dropLongitude)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Coordinates must be valid numbers.");
    }

    const distanceCacheKey = `dist_cache_v2:${pickupLatitude.toFixed(5)}:${pickupLongitude.toFixed(5)}:${dropLatitude.toFixed(5)}:${dropLongitude.toFixed(5)}`;
    const cachedDistanceData = await redisClient.get(distanceCacheKey);
    let calculatedDistance;

    if (cachedDistanceData) {
        calculatedDistance = JSON.parse(cachedDistanceData);
    } else {
        calculatedDistance = await getDistanceAndDuration(
            { lat: pickupLatitude, lng: pickupLongitude },
            { lat: dropLatitude, lng: dropLongitude }
        );
        await redisClient.set(distanceCacheKey, JSON.stringify(calculatedDistance), "EX", 3600);
    }

    const durationMins = typeof calculatedDistance.durationMinutes === 'number' && !isNaN(calculatedDistance.durationMinutes)
        ? calculatedDistance.durationMinutes
        : (typeof calculatedDistance.durationText === 'string' ? parseFloat(calculatedDistance.durationText) || 1 : 1);

    return {
        distanceKm: Number(calculatedDistance.distanceKm || 0),
        dropDuration: Math.max(1, durationMins),
    };
};

const createParcel = async (payload: IParcel, user: JwtPayload) => {
    payload.deliveryDate = new Date(payload.deliveryDate);

    const calculatedDistanceData = await getOrCalculateParcelDistance({
        pickupLat: payload.pickupLocation.coordinates[1],
        pickupLng: payload.pickupLocation.coordinates[0],
        dropLat: payload.dropLocation.coordinates[1],
        dropLng: payload.dropLocation.coordinates[0],
    });

    payload.dropDistance = calculatedDistanceData.distanceKm;
    payload.dropDuration = calculatedDistanceData.dropDuration;

    const systemSettings = await SettingServices.getSettings();
    if (!systemSettings) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Pricing settings not configured.");
    }

    const selectedVehicleType = payload.vehicleType.toLowerCase() as 'motorcycle' | 'tricycle' | 'car' | 'van' | 'truck';
    const allFareSettings = systemSettings.fareSettings || {} as any;
    const selectedVehicleFareSettings = allFareSettings[selectedVehicleType];

    if (!selectedVehicleFareSettings) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Fare settings not found for ${payload.vehicleType}.`
        );
    }

    const parcelWeight = payload.totalWeight || 0;
    const vehicleMaxWeight = selectedVehicleFareSettings.maxWeight || 0;
    const vehicleMaxVolume = selectedVehicleFareSettings.maxVolume || 0;

    if (vehicleMaxWeight > 0 && parcelWeight > vehicleMaxWeight) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Parcel exceeds max weight for ${payload.vehicleType}. Please select a larger vehicle.`
        );
    }

    const lengthCm = payload.dimension?.length ?? 0;
    const widthCm = payload.dimension?.width ?? 0;
    const heightCm = payload.dimension?.height ?? 0;
    const parcelVolume = Number((lengthCm * widthCm * heightCm * 1e-6).toFixed(6));

    if (vehicleMaxVolume > 0 && parcelVolume > vehicleMaxVolume) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Parcel exceeds max size for ${payload.vehicleType}. Please select a larger vehicle.`
        );
    }

    const isScheduledDelivery = payload.sameDayPickup === false || (payload.deliveryDate > new Date());

    const calculatedPricing = calculateParcelPricing({
        dimension: payload.dimension,
        totalWeight: payload.totalWeight,
        distanceKm: payload.dropDistance,
        dropDuration: payload.dropDuration,
        itemValue: payload.itemValue,
        fareSetting: selectedVehicleFareSettings,
        isScheduled: isScheduledDelivery,
    });

    payload.baseFee = calculatedPricing.baseFee;
    payload.fuelCost = calculatedPricing.fuelCost;
    payload.timeCost = calculatedPricing.timeCost;
    payload.goodRisks = calculatedPricing.goodRisks;

    payload.volume = calculatedPricing.volume;
    payload.volumeUtilization = calculatedPricing.volumeUtilization;
    payload.weightUtilization = calculatedPricing.weightUtilization;
    payload.effectiveUtilization = calculatedPricing.effectiveUtilization;
    payload.loadFactor = calculatedPricing.loadFactor;

    payload.totalPrice = calculatedPricing.totalPrice;
    payload.additionalCost = calculatedPricing.additionalCost;
    payload.totalRun = calculatedPricing.totalRun;

    payload.overhead = calculatedPricing.overhead;
    payload.milesquadInsurance = calculatedPricing.milesquadInsurance;
    payload.marginMilesquad = calculatedPricing.marginMilesquad;

    payload.totalOfRun = calculatedPricing.totalOfRun;
    payload.serviceFee = calculatedPricing.serviceFee;
    payload.totalToPay = calculatedPricing.totalToPay;
    payload.totalDeliveryFee = calculatedPricing.totalDeliveryFee;

    payload.sender = new Types.ObjectId(user.authId || user.id);
    payload.status = PARCEL_STATUS.CREATED;
    payload.statusProgress = updateStatusProgress({}, PARCEL_STATUS.CREATED);

    const createdParcel = await Parcel.create(payload);
    return createdParcel;
};

const selectPaymentMethod = async (
    id: string,
    user: JwtPayload,
    paymentMethod: PAYMENT_METHOD
) => {
    const parcel = await Parcel.findById(id);

    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    const currentUserId = user.authId || user.id;
    if (parcel.sender.toString() !== currentUserId) {
        throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this parcel");
    }

    if (parcel.status !== PARCEL_STATUS.CREATED) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Cannot select payment method for parcel with current status: ${parcel.status}`
        );
    }

    if (paymentMethod === PAYMENT_METHOD.ONLINE) {
        parcel.paymentMethod = PAYMENT_METHOD.ONLINE;
        await parcel.save();

        await parcelCleanupQueue.add(
            'cleanupUnpaidParcel',
            { parcelId: parcel._id.toString() },
            { delay: 60 * 60 * 1000 }
        );

        const amountToPay = parcel.totalToPay || parcel.totalDeliveryFee;
        const paymentLink = await createPaymentSession(
            user,
            amountToPay,
            parcel._id.toString()
        );

        return {
            paymentMethod: PAYMENT_METHOD.ONLINE,
            paymentUrl: paymentLink,
            message: "Payment link generated successfully. Please complete payment to confirm your order.",
        };
    } else if (paymentMethod === PAYMENT_METHOD.HAND_CASH) {
        parcel.paymentMethod = PAYMENT_METHOD.HAND_CASH;
        parcel.status = PARCEL_STATUS.PENDING;
        parcel.statusProgress = updateStatusProgress(parcel.statusProgress, PARCEL_STATUS.PENDING);

        const updatedParcel = await parcel.save();

        // Send Invoice Email to Customer if email exists
        try {
            const customer = await User.findById(parcel.sender);
            if (customer?.email) {
                const html = generateInvoiceHTML(updatedParcel, customer);
                const pdfBuffer = await generateInvoicePDFBuffer(updatedParcel, customer);
                const invoiceNo = `INV-${updatedParcel._id.toString().slice(-8).toUpperCase()}`;

                await emailHelper.sendEmail({
                    to: customer.email,
                    subject: `Booking Confirmation & Invoice #${invoiceNo} - Milesquad`,
                    html,
                    attachments: [
                        {
                            filename: `${invoiceNo}.pdf`,
                            content: pdfBuffer,
                            contentType: 'application/pdf',
                        },
                    ],
                });
            }
        } catch (mailErr) {
            console.error("Failed to send hand_cash invoice email:", mailErr);
        }

        notifyNearbyDriversOfNewParcel(updatedParcel);

        return {
            paymentMethod: PAYMENT_METHOD.HAND_CASH,
            parcel: updatedParcel,
            message: "Cash payment selected. Your parcel order is confirmed and pending driver assignment.",
        };
    }

    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid payment method");
};

const getAllParcels = async (query: Record<string, unknown>) => {
    const defaultFields = "parcelId goodType status totalDeliveryFee totalToPay totalPrice itemValue vehicleType pickupLocation dropLocation receiverPhone sender driver partner createdAt";
    const selectedFields = query.fields ? (query.fields as string).split(',').join(' ') : defaultFields;

    const extraOrConditions: any[] = [];
    if (query.searchTerm && typeof query.searchTerm === "string" && query.searchTerm.trim()) {
        const term = query.searchTerm.trim();
        const searchRegex = { $regex: term, $options: "i" };

        if (Types.ObjectId.isValid(term)) {
            extraOrConditions.push({ _id: term });
        }

        const matchingUsers = await User.find({
            $or: [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { userId: searchRegex }
            ]
        }).select("_id");
        const matchingUserIds = matchingUsers.map(u => u._id);

        const matchingPartners = await Partner.find({
            $or: [
                { fullName: searchRegex },
                { email: searchRegex },
                { phone: searchRegex },
                { partnerId: searchRegex }
            ]
        }).select("_id");
        const matchingPartnerIds = matchingPartners.map(p => p._id);

        if (matchingUserIds.length > 0) {
            extraOrConditions.push({ sender: { $in: matchingUserIds } });
            extraOrConditions.push({ driver: { $in: matchingUserIds } });
        }
        if (matchingPartnerIds.length > 0) {
            extraOrConditions.push({ partner: { $in: matchingPartnerIds } });
        }
    }

    const parcelQuery = new QueryBuilder(
        Parcel.find({ status: { $ne: PARCEL_STATUS.CREATED } }).populate([
            { path: "sender driver", select: "userId fullName phone email image" },
            { path: "partner", select: "partnerId fullName phone rolePosition email" }
        ]),
        query
    )
        .search(["parcelId", "goodType", "receiverPhone", "pickupLocation.address", "dropLocation.address"], extraOrConditions)
        .filter()
        .sort()
        .paginate();

    parcelQuery.modelQuery.select(selectedFields).lean();

    const parcels = await parcelQuery.modelQuery;
    const meta = await parcelQuery.getPaginationInfo();

    return { parcels, meta };
};

const getUserOrders = async (userId: string, query: Record<string, unknown>) => {
    let filter: any = {};
    const isObjectId = Types.ObjectId.isValid(userId);

    if (isObjectId) {
        filter = {
            $or: [{ sender: userId }, { driver: userId }],
            status: { $ne: PARCEL_STATUS.CREATED }
        };
    } else {
        const userObj = await User.findOne({ userId }).select("_id");
        if (userObj) {
            filter = {
                $or: [{ sender: userObj._id }, { driver: userObj._id }],
                status: { $ne: PARCEL_STATUS.CREATED }
            };
        } else {
            filter = { sender: userId, status: { $ne: PARCEL_STATUS.CREATED } };
        }
    }

    const defaultFields = "parcelId goodType status totalDeliveryFee totalToPay totalPrice itemValue vehicleType pickupLocation dropLocation receiverPhone sender driver partner createdAt";
    const selectedFields = query.fields ? (query.fields as string).split(',').join(' ') : defaultFields;

    const extraOrConditions: any[] = [];
    if (query.searchTerm && typeof query.searchTerm === "string" && query.searchTerm.trim()) {
        const term = query.searchTerm.trim();
        if (Types.ObjectId.isValid(term)) {
            extraOrConditions.push({ _id: term });
        }
    }

    const parcelQuery = new QueryBuilder(
        Parcel.find(filter).populate([
            { path: "sender driver", select: "userId fullName phone email image" },
            { path: "partner", select: "partnerId fullName phone rolePosition email" }
        ]),
        query
    )
        .search(["parcelId", "goodType", "receiverPhone", "pickupLocation.address", "dropLocation.address"], extraOrConditions)
        .filter()
        .sort()
        .paginate();

    parcelQuery.modelQuery.select(selectedFields).lean();

    const parcels = await parcelQuery.modelQuery;
    const meta = await parcelQuery.getPaginationInfo();

    const allUserParcels = await Parcel.find(filter).select("totalToPay totalPrice totalDeliveryFee status").lean();
    let totalSpent = 0;
    allUserParcels.forEach((p: any) => {
        totalSpent += Number(p.totalToPay || p.totalPrice || p.totalDeliveryFee || 0);
    });

    return { parcels, meta, totalOrders: meta.total, totalSpent };
};

const getMyParcels = async (
    userId: string,
    role: string,
    query: Record<string, unknown>
) => {
    const filter = role === USER_ROLES.DRIVER
        ? { driver: userId, status: { $ne: PARCEL_STATUS.CREATED } }
        : { sender: userId, status: { $ne: PARCEL_STATUS.CREATED } };

    const defaultFields = "parcelId goodType status totalDeliveryFee totalToPay totalPrice itemValue vehicleType pickupLocation dropLocation receiverPhone sender driver partner createdAt";
    const selectedFields = query.fields ? (query.fields as string).split(',').join(' ') : defaultFields;

    const parcelQuery = new QueryBuilder(
        Parcel.find(filter).populate([
            { path: "sender driver", select: "userId fullName phone image driverInfo.averageRating driverInfo.totalRating" },
            { path: "partner", select: "partnerId fullName phone rolePosition email" }
        ]),
        query
    )
        .filter()
        .search(["goodType", "receiverPhone", "_id", "parcelId"])
        .sort()
        .paginate();

    parcelQuery.modelQuery.select(selectedFields).lean();

    const parcels = await parcelQuery.modelQuery;
    const meta = await parcelQuery.getPaginationInfo();

    return { parcels, meta };
};

const getNearbyParcels = async (
    lat: number,
    lng: number,
    maxDistanceKm: number = 50,
    user?: JwtPayload,
    query: Record<string, unknown> = {}
) => {
    if (!lat || !lng) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Latitude and Longitude are required.");
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    const matchQuery: Record<string, any> = {
        status: PARCEL_STATUS.PENDING,
        isDriverAssigned: false,
        deliveryDate: { $lte: oneHourFromNow }
    };

    if (user) {
        const userId = user.authId || user.id;
        const driver = await User.findById(userId).select("driverInfo.vehicleType").lean();
        if (driver?.driverInfo?.vehicleType) {
            matchQuery.vehicleType = driver.driverInfo.vehicleType;
        }
    }

    const parcels = await Parcel.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [lng, lat] },
                distanceField: "distanceFromDriver",
                maxDistance: maxDistanceKm * 1000,
                spherical: true,
                query: matchQuery,
            },
        },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "users",
                localField: "sender",
                foreignField: "_id",
                as: "sender",
                pipeline: [{ $project: { fullName: 1, image: 1, phone: 1 } }],
            },
        },
        { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                goodType: 1,
                numberOfGoods: 1,
                totalWeight: 1,
                dimension: 1,
                sameDayPickup: 1,
                vehicleType: 1,
                pickupLocation: 1,
                dropLocation: 1,
                dropDistance: 1,
                distanceFromDriver: 1,
                deliveryDate: 1,
                sender: 1,
                status: 1,
                driverShare: 1,
                receiverPhone: 1,
                packagePhotos: 1,
                pdfDocument: 1
            }
        }
    ]);

    const totalResult = await Parcel.aggregate([
        {
            $geoNear: {
                near: { type: "Point", coordinates: [lng, lat] },
                distanceField: "distanceFromDriver",
                maxDistance: maxDistanceKm * 1000,
                spherical: true,
                query: matchQuery,
            },
        },
        { $count: "total" },
    ]);

    const total = totalResult[0]?.total || 0;

    return {
        parcels,
        meta: {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit),
        },
    };
};

const acceptParcel = async (parcelId: string, driverId: string) => {
    const activeDelivery = await Parcel.findOne({
        driver: driverId,
        status: { $nin: [PARCEL_STATUS.DELIVERED, PARCEL_STATUS.CANCELLED] },
    });

    if (activeDelivery) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "You already have an active delivery. Complete it first."
        );
    }

    const parcel = await Parcel.findById(parcelId);

    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    if (parcel.status !== PARCEL_STATUS.PENDING) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "This parcel is not available for acceptance."
        );
    }

    if (parcel.isDriverAssigned) {
        throw new ApiError(
            StatusCodes.CONFLICT,
            "This parcel was already accepted by another driver."
        );
    }

    const updatedProgress = updateStatusProgress(parcel.statusProgress, PARCEL_STATUS.ON_THE_WAY_TO_PICKUP);

    const pickUpMetrics = await calculatePickUpMetrics(
        driverId,
        parcel.pickupLocation?.coordinates
    );

    const updateFields: Record<string, any> = {
        driver: driverId,
        partner: null,
        isDriverAssigned: true,
        driverAssignedAt: new Date(),
        status: PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
        statusProgress: updatedProgress,
    };

    if (pickUpMetrics.pickUpDistance > 0) {
        updateFields.pickUpDistance = pickUpMetrics.pickUpDistance;
    }
    if (pickUpMetrics.pickUpDuration) {
        updateFields.pickUpDuration = pickUpMetrics.pickUpDuration;
    }

    const updatedParcel = await Parcel.findByIdAndUpdate(
        parcelId,
        updateFields,
        { new: true }
    ).populate("sender driver partner");

    await NotificationService.insertNotification({
        receiver: parcel.sender,
        title: "Driver Assigned",
        message: "A driver has accepted your parcel!",
        screen: "PARCEL_TRACKING",
        type: USER_ROLES.CUSTOMER
    });

    emitParcelStatusUpdate(updatedParcel);
    notifyNearbyDriversOfRemovedParcel(parcelId);

    return updatedParcel;
};

const getSingleParcel = async (id: string, user?: JwtPayload) => {
    const isObjectId = Types.ObjectId.isValid(id);
    const queryFilter = isObjectId ? { _id: id } : { parcelId: id };

    const parcel = await Parcel.findOne(queryFilter).populate("sender driver partner");

    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    const review = await Review.findOne({ parcel: parcel._id });
    const parcelObj = parcel.toObject() as any;

    const liveLocation = await trackingService.getDriverLocation(parcel._id.toString());

    if (liveLocation) {
        parcelObj.driverLocation = {
            type: "Point",
            coordinates: [liveLocation.lng, liveLocation.lat],
            updatedAt: new Date(liveLocation.timestamp),
        };
    }

    parcelObj.review = review;

    const driverPricing = {
        baseFee: parcel.baseFee || 0,
        timeCost: parcel.timeCost || 0,
        fuelCost: parcel.fuelCost || 0,
        totalPrice: parcel.totalPrice || 0,
        additionalCost: parcel.additionalCost || 0,
        totalRun: parcel.totalRun || 0,
    };

    const customerPricing = {
        totalOfRun: parcel.totalOfRun || 0,
        serviceFee: parcel.serviceFee || 0,
        goodInsurance: parcel.goodRisks || 0,
        totalToPay: parcel.totalToPay || parcel.totalDeliveryFee || 0,
    };

    const adminPricing = {
        overhead: parcel.overhead || 0,
        milesquadInsurance: parcel.milesquadInsurance || 0,
        marginMilesquad: parcel.marginMilesquad || 0,
    };

    const userRole = user?.role;

    if (userRole === USER_ROLES.DRIVER) {
        parcelObj.pricingDetails = driverPricing;
    } else if (userRole === USER_ROLES.CUSTOMER) {
        parcelObj.pricingDetails = customerPricing;
    } else if (userRole === ADMIN_ROLES.SUPER_ADMIN || userRole === ADMIN_ROLES.SUB_ADMIN) {
        parcelObj.pricingDetails = {
            driver: driverPricing,
            customer: customerPricing,
            admin: adminPricing,
        };
    } else {
        parcelObj.pricingDetails = customerPricing;
    }

    return parcelObj;
};

const updateParcel = async (
    id: string,
    payload: Partial<IParcel>,
    user: JwtPayload
) => {
    const parcel = await Parcel.findById(id);
    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    if (payload.deliveryDate) {
        payload.deliveryDate = new Date(payload.deliveryDate);
    }

    const currentUserId = user.authId || user.id;

    if (user.role === USER_ROLES.DRIVER) {
        if (parcel.driver?.toString() !== currentUserId) {
            throw new ApiError(StatusCodes.FORBIDDEN, "You are not assigned to this parcel");
        }

        const allowedFields = ["status", "note", "deliveryProof"];
        const keys = Object.keys(payload);
        const isAllowed = keys.every(key => allowedFields.includes(key));
        if (!isAllowed) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Drivers can only update status, note, and delivery proof.");
        }

        if (payload.status === PARCEL_STATUS.ON_THE_WAY_TO_PICKUP) {
            if (parcel.status !== PARCEL_STATUS.RIDER_ASSIGNED) {
                throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid status transition from ${parcel.status}`);
            }
        }

        if (payload.status === PARCEL_STATUS.PICKED_UP || payload.status === PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY) {
            payload.status = PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY;
        }

        if (payload.status === PARCEL_STATUS.DELIVERED) {
            if (parcel.status !== PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY && parcel.status !== PARCEL_STATUS.ON_THE_WAY_TO_PICKUP) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Parcel must be picked up or on the way before delivery.");
            }
        }
    }

    if (user.role === USER_ROLES.CUSTOMER) {
        if (parcel.sender.toString() !== currentUserId) {
            throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this parcel");
        }

        const forbiddenFields = ["name", "pickupLocation", "dropLocation", "itemValue"];
        const keys = Object.keys(payload);
        const hasForbidden = keys.some(key => forbiddenFields.includes(key));
        if (hasForbidden) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Senders cannot update restricted fields.");
        }
    }

    if (payload.status) {
        payload.statusProgress = updateStatusProgress(parcel.statusProgress, payload.status);
    }

    if (payload.status === PARCEL_STATUS.PICKED_UP || payload.status === PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY) {
        payload.pickedUpAt = new Date();
        await NotificationService.insertNotification({
            receiver: parcel.sender,
            title: "Parcel Picked Up",
            message: `Your parcel "${parcel.goodType || "Parcel"}" is on the way!`,
            screen: "PARCEL_TRACKING",
            type: USER_ROLES.CUSTOMER
        });
    } else if (payload.status === PARCEL_STATUS.DELIVERED) {
        payload.deliveredAt = new Date();
        await trackingService.removeDriverTracking(id, parcel.driver!.toString());

        // Invalidate driver stats, driver earnings, user profile, and admin dashboard stats caches
        if (parcel.driver) {
            const driverIdStr = parcel.driver.toString();
            await cacheDel(`cache:driver:stats:${driverIdStr}`, `cache:user:profile:${driverIdStr}`, `cache:user:single:${driverIdStr}`);
            await cacheDelByPattern(`cache:driver:earnings:${driverIdStr}:*`);
        }
        await cacheDelByPattern('cache:admin:stats:*');

        // Credit driver's wallet balance if parcel was paid online
        if (parcel.driver && parcel.paymentMethod === PAYMENT_METHOD.ONLINE) {
            const driverPayout = parcel.totalRun || 0;
            if (driverPayout > 0) {
                await User.findByIdAndUpdate(parcel.driver, {
                    $inc: { 'driverInfo.wallet': driverPayout },
                });

                try {
                    await Transaction.create({
                        transactionId: await getNextCustomId("TXN"),
                        user: parcel.driver,
                        parcel: parcel._id,
                        amount: driverPayout,
                        type: TRANSACTION_TYPE.WALLET_CREDIT,
                        status: TRANSACTION_STATUS.COMPLETED,
                        paymentMethod: parcel.paymentMethod,
                        description: `Wallet credit for delivering Parcel #${parcel._id}`,
                    });
                } catch (txnErr) {
                    console.log("Failed to log wallet credit transaction:", txnErr);
                }
            }
        }

        await NotificationService.insertNotification({
            receiver: parcel.sender,
            title: "Parcel Delivered",
            message: `Your parcel "${parcel.goodType || "Parcel"}" was successfully delivered.`,
            screen: "PARCEL_DETAILS",
            type: USER_ROLES.CUSTOMER
        });

        await reviewReminderQueue.add(
            'sendReviewReminder',
            { parcelId: parcel._id.toString() },
            { delay: 24 * 60 * 60 * 1000 }
        );
    } else if (payload.status === PARCEL_STATUS.CANCELLED) {
        const recipients = [
            { id: parcel.sender, role: USER_ROLES.CUSTOMER },
            ...(parcel.driver ? [{ id: parcel.driver, role: USER_ROLES.DRIVER }] : [])
        ];

        for (const recipient of recipients) {
            await NotificationService.insertNotification({
                receiver: recipient.id,
                title: "Parcel Cancelled",
                message: `The parcel "${parcel.goodType || "Parcel"}" was cancelled.`,
                screen: "PARCEL_DETAILS",
                type: recipient.role
            });
        }
    }

    const updatedParcel = await Parcel.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    }).populate("sender driver");

    emitParcelStatusUpdate(updatedParcel);

    return updatedParcel;
};

const cancelParcel = async (id: string, user: JwtPayload) => {
    const parcel = await Parcel.findById(id);

    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    const currentUserId = user.authId || user.id;

    if (user.role === USER_ROLES.CUSTOMER) {
        if (parcel.sender.toString() !== currentUserId) {
            throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this parcel");
        }

        if (parcel.status !== PARCEL_STATUS.CREATED && parcel.status !== PARCEL_STATUS.PENDING) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                "Cannot cancel parcel once accepted or in progress."
            );
        }
    } else if (user.role === ADMIN_ROLES.SUPER_ADMIN || user.role === ADMIN_ROLES.SUB_ADMIN) {
        if (parcel.status === PARCEL_STATUS.DELIVERED) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot cancel a delivered parcel.");
        }
        if (parcel.status === PARCEL_STATUS.CANCELLED) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Parcel is already cancelled.");
        }
    } else {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
    }

    const paidStatuses = [
        PARCEL_STATUS.PENDING,
        PARCEL_STATUS.RIDER_ASSIGNED,
        PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
        PARCEL_STATUS.PICKED_UP,
        PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY
    ];
    if (paidStatuses.includes(parcel.status)) {
        const payment = await Payment.findOne({ referenceId: parcel._id });
        if (payment && payment.transactionId) {
            try {
                let paymentIntentId = payment.transactionId;
                if (paymentIntentId.startsWith("cs_")) {
                    const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
                    if (session.payment_intent) {
                        paymentIntentId = session.payment_intent as string;
                    }
                }
                await stripe.refunds.create({ payment_intent: paymentIntentId });
            } catch (stripeError: any) {
                throw new ApiError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    `Stripe refund failed: ${stripeError.message || stripeError}`
                );
            }
        }
    }

    const updatedProgress = updateStatusProgress(parcel.statusProgress, PARCEL_STATUS.CANCELLED);

    const updatedParcel = await Parcel.findByIdAndUpdate(
        id,
        {
            $unset: { driver: 1, partner: 1 },
            $set: {
                status: PARCEL_STATUS.CANCELLED,
                isDriverAssigned: false,
                statusProgress: updatedProgress,
            }
        },
        { new: true }
    ).populate("sender driver partner");

    if (parcel.driver) {
        await trackingService.removeDriverTracking(id, parcel.driver.toString());
    }

    const recipients = [
        { id: parcel.sender, role: USER_ROLES.CUSTOMER },
        ...(parcel.driver ? [{ id: parcel.driver, role: USER_ROLES.DRIVER }] : [])
    ];

    for (const recipient of recipients) {
        await NotificationService.insertNotification({
            receiver: recipient.id,
            title: "Parcel Cancelled",
            message: `The parcel "${parcel.goodType || "Parcel"}" was cancelled.`,
            screen: "PARCEL_DETAILS",
        });
    }

    emitParcelStatusUpdate(updatedParcel);
    notifyNearbyDriversOfRemovedParcel(id);

    return updatedParcel;
};

const deleteParcel = async (id: string) => {
    const parcel = await Parcel.findById(id);
    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }
    return await Parcel.findByIdAndDelete(id);
};

const assignParcelByAdmin = async (
    parcelId: string,
    assigneeId: string,
    type: 'driver' | 'partner' = 'driver'
) => {
    const parcel = await Parcel.findById(parcelId);

    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    if (parcel.status !== PARCEL_STATUS.PENDING) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Cannot assign delivery agent. Parcel status must be pending (Current status: ${parcel.status}).`
        );
    }

    if (parcel.isDriverAssigned || parcel.driver || parcel.partner) {
        throw new ApiError(
            StatusCodes.CONFLICT,
            "Parcel is already assigned to a driver or partner. Overwriting is not allowed."
        );
    }

    const updateData: Record<string, any> = {
        isDriverAssigned: true,
        driverAssignedAt: new Date(),
        status: PARCEL_STATUS.RIDER_ASSIGNED,
    };

    let assigneeUser: any = null;

    if (type === 'partner') {
        assigneeUser = await Partner.findById(assigneeId);
        if (!assigneeUser) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Selected partner not found.");
        }
        updateData.partner = assigneeId;
        updateData.driver = null;
    } else {
        assigneeUser = await User.findById(assigneeId);
        if (!assigneeUser) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Selected driver user not found.");
        }
        updateData.driver = assigneeId;
        updateData.partner = null;

        if (type === 'driver' && assigneeId && parcel.pickupLocation?.coordinates) {
            const pickUpMetrics = await calculatePickUpMetrics(
                assigneeId,
                parcel.pickupLocation.coordinates
            );
            if (pickUpMetrics.pickUpDistance > 0) {
                updateData.pickUpDistance = pickUpMetrics.pickUpDistance;
            }
            if (pickUpMetrics.pickUpDuration) {
                updateData.pickUpDuration = pickUpMetrics.pickUpDuration;
            }
        }
    }

    const updatedProgress = updateStatusProgress(parcel.statusProgress, PARCEL_STATUS.RIDER_ASSIGNED);
    updateData.statusProgress = updatedProgress;

    const updatedParcel = await Parcel.findByIdAndUpdate(
        parcelId,
        updateData,
        { new: true }
    ).populate("sender driver partner");

    try {
        if (type === 'partner' && assigneeUser?.email) {
            await emailHelper.sendEmail({
                to: assigneeUser.email,
                subject: "New Parcel Delivery Assigned - Milesquad",
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    ${config.logo_url ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${config.logo_url}" alt="Milesquad Logo" style="max-height: 60px; max-width: 200px; width: auto; height: auto; display: inline-block; object-fit: contain;" /></div>` : ''}
                    <h2 style="color: #2ecc71; text-align: center; margin-top: 0;">New Parcel Delivery Assignment</h2>
                    <p>Dear <strong>${assigneeUser.fullName}</strong>,</p>
                    <p>You have been assigned a new parcel delivery order by the Milesquad Admin team.</p>
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2ecc71;">
                      <p style="margin: 5px 0;"><strong>Parcel ID:</strong> ${parcel._id}</p>
                      <p style="margin: 5px 0;"><strong>Good Type:</strong> ${parcel.goodType || "N/A"}</p>
                      <p style="margin: 5px 0;"><strong>Pickup Address:</strong> ${parcel.pickupLocation?.address || "N/A"}</p>
                      <p style="margin: 5px 0;"><strong>Delivery Address:</strong> ${parcel.dropLocation?.address || "N/A"}</p>
                      <p style="margin: 5px 0;"><strong>Receiver Phone:</strong> ${parcel.receiverPhone || "N/A"}</p>
                    </div>
                    <p>Please manage this delivery through your partner portal.</p>
                    <p>Best regards,<br/>Milesquad Operations Team</p>
                  </div>
                `,
            });
        } else if (type === 'driver' && assigneeUser) {
            await NotificationService.insertNotification({
                receiver: assigneeUser._id,
                title: "New Delivery Assigned",
                message: `You have been assigned to deliver a parcel by admin.`,
                screen: "PARCEL_DETAILS",
                type: assigneeUser.role,
            });
        }

        await NotificationService.insertNotification({
            receiver: parcel.sender,
            title: "Delivery Agent Assigned",
            message: `A ${type} (${assigneeUser?.fullName || 'agent'}) has been assigned to your parcel delivery by admin.`,
            screen: "PARCEL_TRACKING",
            type: USER_ROLES.CUSTOMER,
        });
    } catch (error) {
        console.log("Failed to send assignment notifications/email:", error);
    }

    emitParcelStatusUpdate(updatedParcel);
    notifyNearbyDriversOfRemovedParcel(parcelId);

    return updatedParcel;
};

const getParcelInvoice = async (parcelId: string) => {
    const isObjectId = Types.ObjectId.isValid(parcelId);
    const queryFilter = isObjectId ? { _id: parcelId } : { parcelId: parcelId };

    const parcel = await Parcel.findOne(queryFilter).populate("sender driver partner");
    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    const customer = parcel.sender;
    const html = generateInvoiceHTML(parcel, customer);
    const pdfBuffer = await generateInvoicePDFBuffer(parcel, customer);

    const formattedId = parcel.parcelId || `INV-${parcel._id.toString().slice(-8).toUpperCase()}`;

    return {
        parcel,
        customer,
        html,
        pdfBuffer,
        filename: `${formattedId}.pdf`,
    };
};

const getAvailableDriversForParcel = async (parcelId: string) => {
    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    const pickupCoords = parcel.pickupLocation?.coordinates;
    if (!pickupCoords || pickupCoords.length < 2) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Parcel pickup location coordinates missing");
    }

    const pickupLocation = {
        lng: pickupCoords[0],
        lat: pickupCoords[1],
    };

    const activeParcels = await Parcel.find({
        isDriverAssigned: true,
        driver: { $ne: null },
        status: {
            $in: [
                PARCEL_STATUS.RIDER_ASSIGNED,
                PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
                PARCEL_STATUS.PICKED_UP,
                PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY,
            ],
        },
    }).select("driver");

    const busyDriverIds = activeParcels
        .map((p) => p.driver?.toString())
        .filter(Boolean);

    const availableDrivers = await User.find({
        role: USER_ROLES.DRIVER,
        status: USER_STATUS.ACTIVE,
        _id: { $nin: busyDriverIds },
    }).select("fullName phone email image driverInfo status");

    const driversWithDistance = await Promise.all(
        availableDrivers.map(async (driver) => {
            const driverObj = driver.toObject();

            const liveLocation = await trackingService.getSingleDriverLocationById(driver._id.toString());
            let driverLat: number | null = liveLocation?.lat ?? null;
            let driverLng: number | null = liveLocation?.lng ?? null;

            const driverInfoAny = driver.driverInfo as any;
            if ((driverLat === null || driverLng === null) && driverInfoAny?.lastLocation?.coordinates) {
                driverLng = driverInfoAny.lastLocation.coordinates[0];
                driverLat = driverInfoAny.lastLocation.coordinates[1];
            }

            let distanceKm: number = 999999;
            let distanceText = "Unknown";

            if (driverLat !== null && driverLng !== null) {
                const calculated = await getDistanceAndDuration(
                    { lat: driverLat, lng: driverLng },
                    { lat: pickupLocation.lat, lng: pickupLocation.lng }
                );
                distanceKm = calculated.distanceKm;
                distanceText = `${calculated.distanceKm} km`;
            }

            return {
                ...driverObj,
                driverLocation: driverLat !== null && driverLng !== null ? { lat: driverLat, lng: driverLng } : null,
                distanceKm,
                distanceText,
            };
        })
    );

    driversWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    return {
        parcelId: parcel._id,
        pickupLocation: parcel.pickupLocation,
        totalAvailableDrivers: driversWithDistance.length,
        drivers: driversWithDistance,
    };
};

const getCurrentActiveParcel = async (userId: string, role: string) => {
    const runningStatuses = [
        PARCEL_STATUS.RIDER_ASSIGNED,
        PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
        PARCEL_STATUS.PICKED_UP,
        PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY,
    ];

    const baseFilter = role === USER_ROLES.DRIVER
        ? { driver: userId }
        : { sender: userId };

    const selectedFields =
        "_id parcelId goodType numberOfGoods vehicleType status isDriverAssigned " +
        "pickupLocation dropLocation receiverPhone deliveryDate pickedUpAt deliveredAt " +
        "totalToPay totalDeliveryFee paymentMethod sender driver partner statusProgress createdAt";

    const populateOptions = [
        { path: "sender", select: "userId fullName phone email image" },
        { path: "driver", select: "userId fullName phone image driverInfo.vehicleType driverInfo.vehicleModel driverInfo.licensePlate driverInfo.averageRating" },
        { path: "partner", select: "partnerId fullName phone email rolePosition" },
    ];

    let activeParcel = await Parcel.findOne({
        ...baseFilter,
        status: { $in: runningStatuses },
    })
        .select(selectedFields)
        .sort({ updatedAt: -1 })
        .populate(populateOptions);

    if (!activeParcel) {
        activeParcel = await Parcel.findOne({
            ...baseFilter,
            status: { $nin: [PARCEL_STATUS.DELIVERED, PARCEL_STATUS.CANCELLED] },
        })
            .select(selectedFields)
            .sort({ createdAt: -1 })
            .populate(populateOptions);
    }

    return activeParcel;
};

const exportParcelsData = async (query: Record<string, any>) => {
    const { startDate, endDate, status, filter } = query;

    const filterObj: Record<string, any> = {
        status: { $ne: PARCEL_STATUS.CREATED }
    };

    // Date range filter
    if (startDate || endDate) {
        filterObj.createdAt = {};
        if (startDate) {
            filterObj.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filterObj.createdAt.$lte = end;
        }
    }

    // Status filter
    const statusVal = filter || status;
    if (statusVal && statusVal.toUpperCase() !== "ALL") {
        const normalized = statusVal.toUpperCase();
        if (normalized === "PENDING") {
            filterObj.status = PARCEL_STATUS.PENDING;
        } else if (normalized === "ASSIGNED") {
            filterObj.status = {
                $in: [
                    PARCEL_STATUS.RIDER_ASSIGNED,
                    PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
                    PARCEL_STATUS.PICKED_UP,
                    PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY,
                ],
            };
        } else if (normalized === "DELIVERED") {
            filterObj.status = PARCEL_STATUS.DELIVERED;
        } else if (normalized === "CANCELLED") {
            filterObj.status = PARCEL_STATUS.CANCELLED;
        } else {
            filterObj.status = statusVal;
        }
    }

    const parcels = await Parcel.find(filterObj)
        .populate("sender driver partner")
        .sort({ createdAt: -1 });

    return parcels.map((parcel: any) => {
        const pickupAddr = parcel.pickupLocation?.address || parcel.pickupLocation?.name || "";
        const dropAddr = parcel.dropLocation?.address || parcel.dropLocation?.name || "";
        const dimStr = parcel.dimension
            ? `${parcel.dimension.length || 0} x ${parcel.dimension.width || 0} x ${parcel.dimension.height || 0} cm`
            : "N/A";

        return {
            "Order ID": parcel.parcelId || `#${parcel._id.toString().slice(-6).toUpperCase()}`,
            "Created Date": parcel.createdAt ? new Date(parcel.createdAt).toISOString().replace("T", " ").substring(0, 19) : "",
            "Delivery Date": parcel.deliveryDate ? new Date(parcel.deliveryDate).toISOString().substring(0, 10) : "",
            "Driver Assigned Date": parcel.driverAssignedAt ? new Date(parcel.driverAssignedAt).toISOString().replace("T", " ").substring(0, 19) : "N/A",
            "Status": (parcel.status || "").replace(/_/g, " ").toUpperCase(),
            "Good Type": parcel.goodType || "N/A",
            "Vehicle Type": (parcel.vehicleType || "N/A").toUpperCase(),
            "Number of Goods": parcel.numberOfGoods || 1,
            "Total Weight (kg)": parcel.totalWeight || 0,
            "Dimensions": dimStr,
            "Same Day Pickup": parcel.sameDayPickup ? "Yes" : "No",
            "Customer Name": parcel.sender?.fullName || "N/A",
            "Customer Email": parcel.sender?.email || "N/A",
            "Customer Phone": parcel.sender?.phone || "N/A",
            "Driver Name": parcel.driver?.fullName || "N/A",
            "Driver Phone": parcel.driver?.phone || "N/A",
            "Partner Name": parcel.partner?.fullName || "N/A",
            "Pickup Address": pickupAddr,
            "Dropoff Address": dropAddr,
            "Receiver Phone": parcel.receiverPhone || "N/A",
            "Drop Distance (km)": parcel.dropDistance || parcel.distance || 0,
            "Drop Duration (mins)": parcel.dropDuration || 0,
            "Pickup Distance (km)": parcel.pickUpDistance || 0,
            "Pickup Duration (mins)": parcel.pickUpDuration || 0,
            "Item Value ($)": parcel.itemValue || 0,
            "Base Fee ($)": parcel.baseFee || 0,
            "Fuel Cost ($)": parcel.fuelCost || 0,
            "Time Cost ($)": parcel.timeCost || 0,
            "Service Fee ($)": parcel.serviceFee || 0,
            "Goods Risk ($)": parcel.goodRisks || 0,
            "Overhead ($)": parcel.overhead || 0,
            "Total To Pay ($)": parcel.totalToPay || parcel.totalDeliveryFee || 0,
            "Payment Method": (parcel.paymentMethod || "ONLINE").replace(/_/g, " ").toUpperCase(),
            "Note": parcel.note || "",
        };
    });
};

export const ParcelServices = {
    createParcel,
    selectPaymentMethod,
    getAllParcels,
    getUserOrders,
    getMyParcels,
    getNearbyParcels,
    acceptParcel,
    getSingleParcel,
    getOrCalculateParcelDistance,
    updateParcel,
    cancelParcel,
    deleteParcel,
    assignParcelByAdmin,
    getParcelInvoice,
    getAvailableDriversForParcel,
    getCurrentActiveParcel,
    exportParcelsData,
};
