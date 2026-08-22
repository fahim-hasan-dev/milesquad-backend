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
import { createPaymentSession } from "../../../stripe/createPaymentSession";
import { JwtPayload } from "jsonwebtoken";
import { NotificationService } from "../notification/notification.service";
import { ADMIN_ROLES, USER_ROLES } from "../../../enum/user";
import { Review } from "../review/review.model";
import { calculateParcelPricing } from "../../../utils/pricingCalculator.util";
import { User } from "../user/user.model";

const updateStatusProgress = (
    currentProgress: Partial<IStatusProgress> = {},
    newStatus: PARCEL_STATUS
): IStatusProgress => {
    const stepsOrder = [
        PARCEL_STATUS.CREATED,
        PARCEL_STATUS.CONFIRMED,
        PARCEL_STATUS.PENDING,
        PARCEL_STATUS.RIDER_ASSIGNED,
        PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
        PARCEL_STATUS.PICKED_UP,
        PARCEL_STATUS.ON_THE_WAY_TO_DELIVERY,
        PARCEL_STATUS.DELIVERED,
    ];

    const progress: IStatusProgress = {
        CREATED: currentProgress.CREATED ?? true,
        CONFIRMED: currentProgress.CONFIRMED ?? false,
        PENDING: currentProgress.PENDING ?? false,
        RIDER_ASSIGNED: currentProgress.RIDER_ASSIGNED ?? false,
        ON_THE_WAY_TO_PICKUP: currentProgress.ON_THE_WAY_TO_PICKUP ?? false,
        PICKED_UP: currentProgress.PICKED_UP ?? false,
        ON_THE_WAY_TO_DELIVERY: currentProgress.ON_THE_WAY_TO_DELIVERY ?? false,
        DELIVERED: currentProgress.DELIVERED ?? false,
        CANCELLED: currentProgress.CANCELLED ?? false,
    };

    if (newStatus === PARCEL_STATUS.CANCELLED) {
        progress.CANCELLED = true;
        return progress;
    }

    const targetIndex = stepsOrder.indexOf(newStatus);
    if (targetIndex !== -1) {
        for (let i = 0; i <= targetIndex; i++) {
            progress[stepsOrder[i]] = true;
        }
    }

    return progress;
};

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

    const distanceCacheKey = `dist_cache:${pickupLatitude.toFixed(5)}:${pickupLongitude.toFixed(5)}:${dropLatitude.toFixed(5)}:${dropLongitude.toFixed(5)}`;
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

    return {
        distanceKm: calculatedDistance.distanceKm,
        duration: calculatedDistance.durationText,
    };
};

const createParcel = async (payload: IParcel, user: JwtPayload) => {
    delete (payload as any).distance;
    delete (payload as any).duration;

    payload.deliveryDate = new Date(payload.deliveryDate);

    const calculatedDistanceData = await getOrCalculateParcelDistance({
        pickupLat: payload.pickupLocation.coordinates[1],
        pickupLng: payload.pickupLocation.coordinates[0],
        dropLat: payload.dropLocation.coordinates[1],
        dropLng: payload.dropLocation.coordinates[0],
    });

    payload.distance = calculatedDistanceData.distanceKm;
    payload.duration = calculatedDistanceData.duration;

    const systemSettings = await SettingServices.getSettings();
    if (!systemSettings) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Pricing settings not configured.");
    }

    const selectedVehicleType = payload.vehicleType.toLowerCase() as 'motorcycle' | 'tricycle' | 'car' | 'van' | 'truck';
    const allFareSettings = systemSettings.fareSettings || {} as any;
    const selectedVehicleFareSettings = allFareSettings[selectedVehicleType];

    const isScheduledDelivery = payload.sameDayPickup === false || (payload.deliveryDate > new Date());

    const calculatedPricing = calculateParcelPricing({
        dimension: payload.dimension,
        totalWeight: payload.totalWeight,
        distanceKm: payload.distance,
        durationText: payload.duration,
        itemValue: payload.itemValue,
        fareSetting: selectedVehicleFareSettings,
        isScheduled: isScheduledDelivery,
    });

    if (selectedVehicleFareSettings) {
        const vehicleMaxWeight = selectedVehicleFareSettings.maxWeight || 0;
        const vehicleMaxVolume = selectedVehicleFareSettings.maxVolume || 0;
        const parcelWeight = payload.totalWeight || 0;

        if (vehicleMaxWeight > 0 && parcelWeight > vehicleMaxWeight) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Parcel weight (${parcelWeight} kg) exceeds the maximum allowed limit (${vehicleMaxWeight} kg) for a ${payload.vehicleType}. Please select a larger vehicle.`
            );
        }

        if (vehicleMaxVolume > 0 && calculatedPricing.volume > vehicleMaxVolume) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                `Parcel volume (${calculatedPricing.volume} m³) exceeds the maximum allowed limit (${vehicleMaxVolume} m³) for a ${payload.vehicleType}. Please select a larger vehicle.`
            );
        }
    }

    payload.baseFare = calculatedPricing.baseFare;
    payload.totalDeliveryFee = calculatedPricing.totalDeliveryFee;
    payload.platformCommission = calculatedPricing.platformCommission;
    payload.driverShare = calculatedPricing.driverShare;
    payload.volume = calculatedPricing.volume;
    payload.volumeUtilization = calculatedPricing.volumeUtilization;
    payload.weightUtilization = calculatedPricing.weightUtilization;
    payload.effectiveUtilization = calculatedPricing.effectiveUtilization;
    payload.loadFactor = calculatedPricing.loadFactor;
    payload.fuelCost = calculatedPricing.fuelCost;
    payload.timeCost = calculatedPricing.timeCost;
    payload.goodRisks = calculatedPricing.goodRisks;
    payload.subtotalFee = calculatedPricing.subtotalFee;
    payload.operationFee = calculatedPricing.operationFee;
    payload.platformFee = calculatedPricing.platformFee;

    payload.sender = new Types.ObjectId(user.authId || user.id);

    const isHandCash = payload.paymentMethod === PAYMENT_METHOD.HAND_CASH;

    if (isHandCash) {
        payload.status = PARCEL_STATUS.PENDING;
        payload.statusProgress = updateStatusProgress({}, PARCEL_STATUS.PENDING);
    } else {
        payload.status = PARCEL_STATUS.CREATED;
        payload.statusProgress = updateStatusProgress({}, PARCEL_STATUS.CREATED);
    }

    const createdParcel = await Parcel.create(payload);

    let paymentLink: string | null = null;

    if (!isHandCash) {
        await parcelCleanupQueue.add(
            'cleanupUnpaidParcel',
            { parcelId: createdParcel._id.toString() },
            { delay: 60 * 60 * 1000 }
        );

        paymentLink = await createPaymentSession(user, calculatedPricing.totalDeliveryFee, createdParcel._id.toString());
    }

    return { parcel: createdParcel, paymentLink };
};

const getAllParcels = async (query: Record<string, unknown>) => {
    const defaultFields = "goodType status totalDeliveryFee vehicleType pickupLocation dropLocation receiverPhone sender driver createdAt";
    const selectedFields = query.fields ? (query.fields as string).split(',').join(' ') : defaultFields;

    const parcelQuery = new QueryBuilder(
        Parcel.find({ status: { $ne: PARCEL_STATUS.CREATED } }).populate({
            path: "sender driver",
            select: "fullName phone image"
        }),
        query
    )
        .search(["goodType", "receiverPhone"])
        .filter()
        .sort()
        .paginate();

    parcelQuery.modelQuery.select(selectedFields).lean();

    const parcels = await parcelQuery.modelQuery;
    const meta = await parcelQuery.getPaginationInfo();

    return { parcels, meta };
};

const getMyParcels = async (
    userId: string,
    role: string,
    query: Record<string, unknown>
) => {
    const filter = role === USER_ROLES.DRIVER
        ? { driver: userId, status: { $ne: PARCEL_STATUS.CREATED } }
        : { sender: userId, status: { $ne: PARCEL_STATUS.CREATED } };

    const defaultFields = "goodType status totalDeliveryFee vehicleType pickupLocation dropLocation receiverPhone sender driver createdAt";
    const selectedFields = query.fields ? (query.fields as string).split(',').join(' ') : defaultFields;

    const parcelQuery = new QueryBuilder(
        Parcel.find(filter).populate({
            path: "sender driver",
            select: "fullName phone image driverInfo.averageRating driverInfo.totalRating"
        }),
        query
    )
        .filter()
        .search(["goodType", "receiverPhone", "_id"])
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
                distance: 1,
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

    const updatedParcel = await Parcel.findByIdAndUpdate(
        parcelId,
        {
            driver: driverId,
            isDriverAssigned: true,
            status: PARCEL_STATUS.ON_THE_WAY_TO_PICKUP,
            statusProgress: updatedProgress,
        },
        { new: true }
    ).populate("sender driver");

    await NotificationService.insertNotification({
        receiver: parcel.sender,
        title: "Driver Assigned",
        message: "A driver has accepted your parcel!",
        screen: "PARCEL_TRACKING",
        type: USER_ROLES.CUSTOMER
    });

    return updatedParcel;
};

const getSingleParcel = async (id: string, user?: JwtPayload) => {
    const parcel = await Parcel.findOne({ _id: id, status: { $ne: PARCEL_STATUS.CREATED } }).populate("sender driver");

    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }

    const review = await Review.findOne({ parcel: id });
    const parcelObj = parcel.toObject() as any;

    const liveLocation = await trackingService.getDriverLocation(id);

    if (liveLocation) {
        parcelObj.driverLocation = {
            type: "Point",
            coordinates: [liveLocation.lng, liveLocation.lat],
            updatedAt: new Date(liveLocation.timestamp),
        };
    }

    parcelObj.review = review;

    const baseFee = parcel.baseFare || 0;
    const timeCost = parcel.timeCost || 0;
    const fuelCost = parcel.fuelCost || 0;
    const goodRisks = parcel.goodRisks || 0;
    const operationFee = parcel.operationFee || 0;
    const platformFee = parcel.platformFee || 0;

    // Driver App Formulas (from stored DB fields)
    const totalPrice = Number((baseFee + timeCost + fuelCost).toFixed(2));
    const additionalCost = Number((goodRisks / 2).toFixed(2));
    const totalRun = Number((totalPrice + additionalCost).toFixed(2));

    // Admin Panel Formulas (from stored DB fields)
    const overhead = operationFee;
    const milesquadInsurance = Number((goodRisks / 2).toFixed(2));

    // Customer App Formulas (from stored DB fields)
    const totalOfRun = Number((totalPrice + overhead).toFixed(2));
    const totalToPay = parcel.totalDeliveryFee || Number((totalOfRun + platformFee + goodRisks).toFixed(2));
    const goodInsurance = goodRisks;
    const serviceFee = Number((totalToPay - goodInsurance).toFixed(2));

    // Admin Margin Formula
    const marginMilesquad = Number((totalToPay - overhead - milesquadInsurance).toFixed(2));

    const driverPricing = {
        baseFee,
        timeCost,
        fuelCost,
        totalPrice,
        additionalCost,
        totalRun,
    };

    const customerPricing = {
        totalOfRun,
        serviceFee,
        goodInsurance,
        totalToPay,
    };

    const adminPricing = {
        overhead,
        milesquadInsurance,
        marginMilesquad,
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

        const allowedFields = ["status", "note"];
        const keys = Object.keys(payload);
        const isAllowed = keys.every(key => allowedFields.includes(key));
        if (!isAllowed) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Drivers can only update status and note.");
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
            status: PARCEL_STATUS.CANCELLED,
            isDriverAssigned: false,
            statusProgress: updatedProgress,
        },
        { new: true }
    ).populate("sender driver");

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
            type: recipient.role
        });
    }

    return updatedParcel;
};

const deleteParcel = async (id: string) => {
    const parcel = await Parcel.findById(id);
    if (!parcel) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Parcel not found");
    }
    return await Parcel.findByIdAndDelete(id);
};

export const ParcelServices = {
    createParcel,
    getAllParcels,
    getMyParcels,
    getNearbyParcels,
    acceptParcel,
    getSingleParcel,
    getOrCalculateParcelDistance,
    updateParcel,
    cancelParcel,
    deleteParcel,
};
