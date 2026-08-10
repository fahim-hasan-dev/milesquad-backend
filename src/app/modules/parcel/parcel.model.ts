import mongoose, { Schema } from "mongoose";
import { IParcel } from "./parcel.interface";
import { PARCEL_STATUS, VEHICLE_TYPE } from "../../../enum/parcel";

const ParcelSchema = new Schema<IParcel>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        itemValue: {
            type: Number,
            required: true,
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
        receiverName: {
            type: String,
            required: true,
            trim: true,
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
        note: {
            type: String,
            default: "",
        },
        pickupProof: {
            type: [String],
            default: [],
        },
        deliveryProof: {
            type: [String],
            default: [],
        },
        estimatedArrival: { type: Date },
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
