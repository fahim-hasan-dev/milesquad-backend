import { Types, Model } from "mongoose";
import { VEHICLE_TYPE } from "../../../enum/parcel";

export type IVehicle = {
    _id: Types.ObjectId;
    name: string;
    image?: string;
    licensePlate: string;
    type: VEHICLE_TYPE;
    assignedUser?: Types.ObjectId;
};

export type VehicleModel = Model<IVehicle>;
