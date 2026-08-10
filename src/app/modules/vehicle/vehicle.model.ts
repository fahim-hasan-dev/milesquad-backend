import mongoose, { Schema } from "mongoose";
import { IVehicle, VehicleModel } from "./vehicle.interface";
import { VEHICLE_TYPE } from "../../../enum/parcel";

const VehicleSchema = new Schema<IVehicle, VehicleModel>(
    {
        name: {
            type: String,
            required: true,
        },
        image: {
            type: String,
            default: "",
        },
        licensePlate: {
            type: String,
            required: true,
            unique: true,
        },
        type: {
            type: String,
            enum: Object.values(VEHICLE_TYPE),
            required: true,
        },
        assignedUser: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

export const Vehicle = mongoose.model<IVehicle, VehicleModel>("Vehicle", VehicleSchema);
