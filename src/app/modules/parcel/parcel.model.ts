import mongoose, { Schema } from "mongoose";
import { IParcel } from "./parcel.interface";
import { PARCEL_STATUS, VEHICLE_TYPE } from "../../../enum/parcel";

const ParcelSchema = new Schema<IParcel>(
    {
        sameDayPickup: {
            type: Boolean,
            default: false,
        },
        itemValue: {
            type: Number,
            required: true,
        },
        numberOfGoods: {
            type: Number,
            default: 1,
        },
        goodType: {
            type: String,
            default: "",
            trim: true,
        },
        totalWeight: {
            type: Number,
            default: 0,
        },
        dimension: {
            height: { type: Number, default: 0 },
            width: { type: Number, default: 0 },
            length: { type: Number, default: 0 },
        },
        pickupLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            address: { type: String, required: true },
            coordinates: { type: [Number], required: true },
        },
        dropLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            address: { type: String, required: true },
            coordinates: { type: [Number], required: true },
        },
        vehicleType: {
            type: String,
            enum: Object.values(VEHICLE_TYPE),
            required: true,
        },
        packagePhotos: {
            type: [String],
            default: [],
        },
        pdfDocument: {
            type: String,
            default: "",
        },
        distance: {
            type: Number,
            required: true,
        },
        duration: {
            type: String,
            required: true,
        },
        baseFare: {
            type: Number,
            required: true,
        },
        totalDeliveryFee: {
            type: Number,
            required: true,
        },
        driverShare: {
            type: Number,
            required: true,
        },
        platformCommission: {
            type: Number,
            required: true,
        },
        volume: { type: Number, default: 0 },
        volumeUtilization: { type: Number, default: 0 },
        weightUtilization: { type: Number, default: 0 },
        effectiveUtilization: { type: Number, default: 0 },
        loadFactor: { type: Number, default: 1 },
        fuelCost: { type: Number, default: 0 },
        timeCost: { type: Number, default: 0 },
        goodRisks: { type: Number, default: 0 },
        subtotalFee: { type: Number, default: 0 },
        operationFee: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        paymentId: {
            type: String,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        deliveryDate: {
            type: Date,
            required: true,
        },
        receiverPhone: {
            type: String,
            required: true,
        },
        isDriverAssigned: {
            type: Boolean,
            default: false,
        },
        driver: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: Object.values(PARCEL_STATUS),
            default: PARCEL_STATUS.CREATED,
        },
        statusProgress: {
            CREATED: { type: Boolean, default: true },
            CONFIRMED: { type: Boolean, default: false },
            PENDING: { type: Boolean, default: false },
            RIDER_ASSIGNED: { type: Boolean, default: false },
            ON_THE_WAY_TO_PICKUP: { type: Boolean, default: false },
            PICKED_UP: { type: Boolean, default: false },
            ON_THE_WAY_TO_DELIVERY: { type: Boolean, default: false },
            DELIVERED: { type: Boolean, default: false },
            CANCELLED: { type: Boolean, default: false },
        },
        note: {
            type: String,
            default: "",
        },
        pickedUpAt: { type: Date },
        deliveredAt: { type: Date },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
    }
);

ParcelSchema.index({ "pickupLocation.coordinates": "2dsphere" });
ParcelSchema.index({ sender: 1, status: 1 });
ParcelSchema.index({ driver: 1, status: 1 });

export const Parcel = mongoose.model<IParcel>("Parcel", ParcelSchema);
