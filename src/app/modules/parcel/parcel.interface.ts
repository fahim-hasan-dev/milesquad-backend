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
    distance: number;
    duration: string;
    volume: number;
    volumeUtilization: number;
    weightUtilization: number;
    effectiveUtilization: number;
    loadFactor: number;
    baseFee: number;
    fuelCost: number;
    timeCost: number;
    goodRisks: number;
    totalPrice: number;
    additionalCost: number;
    totalRun: number;
    overhead: number;
    milesquadInsurance: number;
    marginMilesquad: number;
    totalOfRun: number;
    serviceFee: number;
    totalToPay: number;
    totalDeliveryFee: number;
    paymentId?: string;
    paymentMethod?: PAYMENT_METHOD;
    sender: Types.ObjectId;
    deliveryDate: Date;
    receiverPhone: string;
    isDriverAssigned: boolean;
    driver?: Types.ObjectId;
    partner?: Types.ObjectId;
    status: PARCEL_STATUS;
    statusProgress?: IStatusProgress;
    note?: string;
    pickedUpAt?: Date;
    deliveredAt?: Date;
    deliveryProof?: string[];
    parcelId?: string;
};
