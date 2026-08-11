import { Types } from "mongoose";
import { PARCEL_STATUS, VEHICLE_TYPE } from "../../../enum/parcel";

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
    packagePhotos?: string[];
    pdfDocument?: string;
    distance: number;
    duration: string;
    baseFare: number;
    totalDeliveryFee: number;
    driverShare: number;
    platformCommission: number;
    volume?: number;
    volumeUtilization?: number;
    weightUtilization?: number;
    effectiveUtilization?: number;
    loadFactor?: number;
    fuelCost?: number;
    timeCost?: number;
    goodRisks?: number;
    subtotalFee?: number;
    operationFee?: number;
    platformFee?: number;
    paymentId?: string;
    sender: Types.ObjectId;
    deliveryDate: Date;
    receiverPhone: string;
    isDriverAssigned: boolean;
    driver?: Types.ObjectId;
    status: PARCEL_STATUS;
    note?: string;
    pickupProof?: string[];
    deliveryProof?: string[];
    estimatedArrival?: Date;
    pickedUpAt?: Date;
    deliveredAt?: Date;
};
