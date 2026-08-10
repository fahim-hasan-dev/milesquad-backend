import { Types } from "mongoose";
import { PARCEL_STATUS, VEHICLE_TYPE } from "../../../enum/parcel";

export type IParcel = {
    _id: Types.ObjectId;
    name: string;
    itemValue: number;
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
    distance: number;
    duration: string;
    baseFare: number;
    totalDeliveryFee: number;
    driverShare: number;
    platformCommission: number;
    paymentId?: string;
    sender: Types.ObjectId;
    deliveryDate: Date;
    receiverName: string;
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
