import { Types } from "mongoose";
import { PARCEL_STATUS, VEHICLE_TYPE, PAYMENT_METHOD } from "../../../enum/parcel";

export type IStatusProgress = {
    CREATED: boolean;
    CONFIRMED: boolean;
    PENDING: boolean;
    RIDER_ASSIGNED: boolean;
    ON_THE_WAY_TO_PICKUP: boolean;
    PICKED_UP: boolean;
    ON_THE_WAY_TO_DELIVERY: boolean;
    DELIVERED: boolean;
    CANCELLED: boolean;
};

export type IParcel = {
    _id: Types.ObjectId;
    itemValue: number;
    sameDayPickup?: boolean;
    numberOfGoods?: number;
    goodType?: string;
    totalWeight?: number;
    dimension?: {
        height?: number;
        width?: number;
        length?: number;
    };
    pickupLocation: {
        type: string;
        address: string;
        coordinates: [number, number];
    };
    dropLocation: {
        type: string;
        address: string;
        coordinates: [number, number];
    };
    vehicleType: VEHICLE_TYPE;
    images?: string[];
    pdfDocument?: string;

    // Google Maps Route Info
    distance: number;
    duration: string;

    // Measurement & Factors
    volume: number;
    volumeUtilization: number;
    weightUtilization: number;
    effectiveUtilization: number;
    loadFactor: number;

    // Costs
    baseFee: number;
    baseFare: number;
    fuelCost: number;
    timeCost: number;
    goodRisks: number;

    // Driver App Breakdown
    totalPrice: number;
    additionalCost: number;
    totalRun: number;
    driverShare: number;

    // Admin Panel Breakdown
    overhead: number;
    milesquadInsurance: number;
    marginMilesquad: number;
    platformCommission: number;

    // Customer App Breakdown
    totalOfRun: number;
    serviceFee: number;
    totalToPay: number;
    totalDeliveryFee: number;

    // Payment & Delivery Details
    paymentId?: string;
    paymentMethod?: PAYMENT_METHOD;
    sender: Types.ObjectId;
    deliveryDate: Date;
    receiverPhone: string;
    isDriverAssigned: boolean;
    driver?: Types.ObjectId;
    status: PARCEL_STATUS;
    statusProgress?: IStatusProgress;
    note?: string;
    pickedUpAt?: Date;
    deliveredAt?: Date;
};
