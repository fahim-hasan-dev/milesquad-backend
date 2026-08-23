import mongoose, { Schema } from "mongoose";
import { IParcel } from "./parcel.interface";
import { PARCEL_STATUS, VEHICLE_TYPE, PAYMENT_METHOD } from "../../../enum/parcel";

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
        images: {
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
        // Measurements & Factors
        volume: { type: Number, default: 0 },
        volumeUtilization: { type: Number, default: 0 },
        weightUtilization: { type: Number, default: 0 },
        effectiveUtilization: { type: Number, default: 0 },
        loadFactor: { type: Number, default: 1 },

        // Costs
        baseFee: { type: Number, default: 0 },
        baseFare: { type: Number, default: 0 },
        fuelCost: { type: Number, default: 0 },
        timeCost: { type: Number, default: 0 },
        goodRisks: { type: Number, default: 0 },

        // Driver App Breakdown
        totalPrice: { type: Number, default: 0 },
        additionalCost: { type: Number, default: 0 },
        totalRun: { type: Number, default: 0 },
        driverShare: { type: Number, default: 0 },

        // Admin Panel Breakdown
        overhead: { type: Number, default: 0 },
        milesquadInsurance: { type: Number, default: 0 },
        marginMilesquad: { type: Number, default: 0 },
        platformCommission: { type: Number, default: 0 },

        // Customer App Breakdown
        totalOfRun: { type: Number, default: 0 },
        serviceFee: { type: Number, default: 0 },
        totalToPay: { type: Number, default: 0 },
        totalDeliveryFee: { type: Number, default: 0 },

        paymentId: {
            type: String,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PAYMENT_METHOD),
            default: PAYMENT_METHOD.ONLINE,
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
