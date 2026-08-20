import { Schema, model } from "mongoose";
import { ISetting } from "./setting.interface";

const FareSettingSubSchema = new Schema({
    baseFee: { type: Number, default: 0 },
    freeTime: { type: Number, default: 0 },
    timeRate: { type: Number, default: 0 },
    fuelRate: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    overhead: { type: Number, default: 0 },
    riskIndex1: { type: Number, default: 0 },
    riskIndex2: { type: Number, default: 0 },
    riskIndex3: { type: Number, default: 0 },
    loadFactor: { type: Number, default: 0 },
    scheduledDelivery: { type: Number, default: 0 },
    maxWeight: { type: Number, default: 0 },
    maxVolume: { type: Number, default: 0 },
}, { _id: false });

const SettingSchema = new Schema<ISetting>({
    fareSettings: {
        motorcycle: { type: FareSettingSubSchema, default: () => ({}) },
        tricycle: { type: FareSettingSubSchema, default: () => ({}) },
        car: { type: FareSettingSubSchema, default: () => ({}) },
        van: { type: FareSettingSubSchema, default: () => ({}) },
        truck: { type: FareSettingSubSchema, default: () => ({}) },
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
});

export const Setting = model<ISetting>("Setting", SettingSchema);
