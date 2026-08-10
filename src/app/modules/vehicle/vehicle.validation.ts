import { z } from "zod";
import { VEHICLE_TYPE } from "../../../enum/parcel";

const createVehicleSchema = z.object({
    body: z.object({
        name: z.string().min(1, "Vehicle name is required"),
        image: z.string().optional(),
        licensePlate: z.string().min(1, "License plate is required"),
        type: z.nativeEnum(VEHICLE_TYPE, {
            errorMap: () => ({ message: "Invalid vehicle type" }),
        }),
    }),
});

const updateVehicleSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        image: z.string().optional(),
        licensePlate: z.string().optional(),
        type: z.nativeEnum(VEHICLE_TYPE).optional(),
    }),
});

const assignDriverSchema = z.object({
    body: z.object({
        vehicleId: z.string().min(1, "Vehicle ID is required"),
        driverId: z.string().min(1, "Driver ID is required"),
    }),
});

const removeDriverSchema = z.object({
    body: z.object({
        vehicleId: z.string().min(1, "Vehicle ID is required"),
        driverId: z.string().min(1, "Driver ID is required"),
    }),
});

export const VehicleValidations = {
    createVehicleSchema,
    updateVehicleSchema,
    assignDriverSchema,
    removeDriverSchema,
};
