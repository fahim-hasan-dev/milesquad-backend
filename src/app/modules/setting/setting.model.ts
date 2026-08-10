import { Schema, model } from "mongoose";
import { ISetting } from "./setting.interface";

const SettingSchema = new Schema<ISetting>({
    vehicleBaseFares: {
        motorcycle: { type: Number, required: true, default: 50 },
        tricycle: { type: Number, required: true, default: 80 },
        van: { type: Number, required: true, default: 150 }
    },
    perKiloCost: { 
        type: Number, 
        required: true, 
        default: 15 
    },
    platformCommissionPercentage: { 
        type: Number, 
        required: true, 
        default: 10 
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }
});

export const Setting = model<ISetting>("Setting", SettingSchema);
