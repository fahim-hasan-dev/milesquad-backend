import { Types } from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { IParcel } from "./parcel.interface";
import { Parcel } from "./parcel.model";
import { PARCEL_STATUS } from "../../../enum/parcel";
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
import { USER_ROLES } from "../../../enum/user";
import { Review } from "../review/review.model";

const calculateParcelDistanceAndPrice = async (query: Record<string, any>) => {
    const { pickupLat, pickupLng, dropLat, dropLng } = query;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
        throw new ApiError(
            StatusCodes.BAD_REQUEST,
            "Missing coordinates. Required: pickupLat, pickupLng, dropLat, dropLng."
        );
    }

    const fromLat = Number(pickupLat);
    const fromLng = Number(pickupLng);
    const toLat = Number(dropLat);
    const toLng = Number(dropLng);

    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Coordinates must be valid numbers.");
    }

    const cacheKey = `dist_cache:${fromLat.toFixed(5)}:${fromLng.toFixed(5)}:${toLat.toFixed(5)}:${toLng.toFixed(5)}`;
    const cachedData = await redisClient.get(cacheKey);
    let distanceData;

    if (cachedData) {
        distanceData = JSON.parse(cachedData);
    } else {
        distanceData = await getDistanceAndDuration(
            { lat: fromLat, lng: fromLng },
            { lat: toLat, lng: toLng }
        );
        await redisClient.set(cacheKey, JSON.stringify(distanceData), "EX", 3600);
    }

    const settings = await SettingServices.getSettings();
    if (!settings) {
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Pricing settings not configured.");
    }

    const perKiloCost = settings.perKiloCost || 0;
    const distanceKm = distanceData.distanceKm;

    const vehicleFares = settings.vehicleBaseFares || {};
    const vehicles = {
        motorcycle: {
            baseFare: vehicleFares.motorcycle || 0,
            totalPrice: Math.ceil((vehicleFares.motorcycle || 0) + distanceKm * perKiloCost),
        },
        tricycle: {
            baseFare: vehicleFares.tricycle || 0,
            totalPrice: Math.ceil((vehicleFares.tricycle || 0) + distanceKm * perKiloCost),
        },
        van: {
            baseFare: vehicleFares.van || 0,
            totalPrice: Math.ceil((vehicleFares.van || 0) + distanceKm * perKiloCost),
        },
        car: {
            baseFare: (vehicleFares as any).car || vehicleFares.van || 0,
            totalPrice: Math.ceil(((vehicleFares as any).car || vehicleFares.van || 0) + distanceKm * perKiloCost),
        },
        truck: {
            baseFare: (vehicleFares as any).truck || (vehicleFares.van ? vehicleFares.van * 1.5 : 0),
            totalPrice: Math.ceil(((vehicleFares as any).truck || (vehicleFares.van ? vehicleFares.van * 1.5 : 0)) + distanceKm * perKiloCost),
        },
    };

    return {
        distanceKm,
        duration: distanceData.durationText,
        distanceSource: distanceData.source,
        perKiloCost,
        vehicles,
    };
};

const createParcel = async (payload: IParcel, user: JwtPayload) => {
    payload.deliveryDate = new Date(payload.deliveryDate);

    const calculation = await calculateParcelDistanceAndPrice({
        pickupLat: payload.pickupLocation.coordinates[1],
        pickupLng: payload.pickupLocation.coordinates[0],
        dropLat: payload.dropLocation.coordinates[1],
        dropLng: payload.dropLocation.coordinates[0],
    });

    const vt = payload.vehicleType.toLowerCase() as keyof typeof calculation.vehicles;
    const vehicleData = calculation.vehicles[vt];

    if (!vehicleData) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid vehicle type: ${payload.vehicleType}`);
    }

    payload.distance = calculation.distanceKm;
    payload.duration = calculation.duration;
    payload.baseFare = vehicleData.baseFare;
    payload.totalDeliveryFee = vehicleData.totalPrice;

    const settings = await SettingServices.getSettings();
    const commissionPercentage = settings?.platformCommissionPercentage || 0;

    payload.platformCommission = Number(((payload.totalDeliveryFee * commissionPercentage) / 100).toFixed(2));
    payload.driverShare = Number((payload.totalDeliveryFee - payload.platformCommission).toFixed(2));
    payload.sender = new Types.ObjectId(user.authId || user.id);

    const parcel = await Parcel.create(payload);

    await parcelCleanupQueue.add(
        'cleanupUnpaidParcel',
        { parcelId: parcel._id.toString() },
        { delay: 60 * 60 * 1000 }
    );

    const paymentLink = await createPaymentSession(user, vehicleData.totalPrice, parcel._id.toString());

    return { parcel, paymentLink };
};

const getAllParcels = async (query: Record<string, unknown>) => {
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
        .paginate()
        .fields();

    parcelQuery.modelQuery.select("goodType itemValue status totalDeliveryFee vehicleType sameDayPickup numberOfGoods totalWeight dimension packagePhotos pdfDocument receiverPhone sender driver createdAt").lean();

    const parcels = await parcelQuery.modelQuery;
    const meta = await parcelQuery.getPaginationInfo();

    return { parcels, meta };
};

const getMyParcels = async (
    userId: string,
    role: string,
    query: Record<string, unknown>
) => {
    const filter = role === "driver"
        ? { driver: userId, status: { $ne: PARCEL_STATUS.CREATED } }
        : { sender: userId, status: { $ne: PARCEL_STATUS.CREATED } };

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
        .paginate()
        .fields();

    parcelQuery.modelQuery.select("goodType status totalDeliveryFee vehicleType pickupLocation.address dropLocation.address deliveryDate sameDayPickup numberOfGoods totalWeight dimension packagePhotos pdfDocument receiverPhone createdAt").lean();

    const parcels = await parcelQuery.modelQuery;
    const meta = await parcelQuery.getPaginationInfo();

    return { parcels, meta };
};

const getNearbyParcels = async (
    lat: number,
    lng: number,
    maxDistanceKm: number = 50,
    query: Record<string, unknown>
) => {
    if (!lat || !lng) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Latitude and Longitude are required.");
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const oneHourFromNow = new Date();
    oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);

    const matchQuery = {
        status: PARCEL_STATUS.PENDING,
        isDriverAssigned: false,
        deliveryDate: { $lte: oneHourFromNow }
    };

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

    const updatedParcel = await Parcel.findByIdAndUpdate(
        parcelId,
        {
            driver: driverId,
            isDriverAssigned: true,
            status: PARCEL_STATUS.ACCEPTED,
        },
        { new: true }
    ).populate("sender driver");

    await NotificationService.insertNotification({
        receiver: parcel.sender,
        title: "Driver Assigned",
        message: "A driver has accepted your parcel!",
        screen: "PARCEL_TRACKING",
        type: USER_ROLES.USER
    });

    return updatedParcel;
};

const getSingleParcel = async (id: string) => {
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

    const settings = await SettingServices.getSettings();
    parcelObj.perKiloCost = settings?.perKiloCost;
    parcelObj.review = review;

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

    if (user.role === "driver") {
        if (parcel.driver?.toString() !== currentUserId) {
            throw new ApiError(StatusCodes.FORBIDDEN, "You are not assigned to this parcel");
        }

        const allowedFields = ["status", "note", "pickupProof", "deliveryProof"];
        const keys = Object.keys(payload);
        const isAllowed = keys.every(key => allowedFields.includes(key));
        if (!isAllowed) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Drivers can only update status, note, and proof images.");
        }

        if (payload.status === PARCEL_STATUS.PICKED_UP && !payload.pickupProof) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Pickup proof is required.");
        }
        if (payload.status === PARCEL_STATUS.DELIVERED && !payload.deliveryProof) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery proof is required.");
        }

        if (payload.status === PARCEL_STATUS.PICKED_UP) {
            if (parcel.status !== PARCEL_STATUS.ACCEPTED) {
                throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid status transition from ${parcel.status}`);
            }
            payload.status = PARCEL_STATUS.IN_TRANSIT;
        }

        if (payload.status === PARCEL_STATUS.DELIVERED) {
            if (parcel.status !== PARCEL_STATUS.IN_TRANSIT) {
                throw new ApiError(StatusCodes.BAD_REQUEST, "Parcel must be in transit before delivery.");
            }
        }
    }

    if (user.role === "sender") {
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

    if (payload.status === PARCEL_STATUS.PICKED_UP || payload.status === PARCEL_STATUS.IN_TRANSIT) {
        payload.pickedUpAt = new Date();
        await NotificationService.insertNotification({
            receiver: parcel.sender,
            title: "Parcel Picked Up",
            message: `Your parcel "${parcel.goodType || "Parcel"}" is on the way!`,
            screen: "PARCEL_TRACKING",
            type: USER_ROLES.USER
        });
    } else if (payload.status === PARCEL_STATUS.DELIVERED) {
        payload.deliveredAt = new Date();
        await trackingService.removeDriverTracking(id, parcel.driver!.toString());

        await NotificationService.insertNotification({
            receiver: parcel.sender,
            title: "Parcel Delivered",
            message: `Your parcel "${parcel.goodType || "Parcel"}" was successfully delivered.`,
            screen: "PARCEL_DETAILS",
            type: USER_ROLES.USER
        });

        await reviewReminderQueue.add(
            'sendReviewReminder',
            { parcelId: parcel._id.toString() },
            { delay: 24 * 60 * 60 * 1000 }
        );
    } else if (payload.status === PARCEL_STATUS.CANCELLED) {
        const recipients = [
            { id: parcel.sender, role: USER_ROLES.USER },
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

    if (user.role === USER_ROLES.USER) {
        if (parcel.sender.toString() !== currentUserId) {
            throw new ApiError(StatusCodes.FORBIDDEN, "You do not own this parcel");
        }

        if (parcel.status !== PARCEL_STATUS.CREATED && parcel.status !== PARCEL_STATUS.PENDING) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                "Cannot cancel parcel once accepted or in progress."
            );
        }
    } else if (user.role === "super_admin" || user.role === "sub_admin" || user.role === "admin") {
        if (parcel.status === PARCEL_STATUS.DELIVERED) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot cancel a delivered parcel.");
        }
        if (parcel.status === PARCEL_STATUS.CANCELLED) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "Parcel is already cancelled.");
        }
    } else {
        throw new ApiError(StatusCodes.FORBIDDEN, "Unauthorized");
    }

    const paidStatuses = [PARCEL_STATUS.PENDING, PARCEL_STATUS.ACCEPTED, PARCEL_STATUS.PICKED_UP, PARCEL_STATUS.IN_TRANSIT];
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

    const updatedParcel = await Parcel.findByIdAndUpdate(
        id,
        {
            status: PARCEL_STATUS.CANCELLED,
            isDriverAssigned: false,
        },
        { new: true }
    ).populate("sender driver");

    if (parcel.driver) {
        await trackingService.removeDriverTracking(id, parcel.driver.toString());
    }

    const recipients = [
        { id: parcel.sender, role: USER_ROLES.USER },
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
    calculateParcelDistanceAndPrice,
    updateParcel,
    cancelParcel,
    deleteParcel,
};
