import { z } from "zod";
import { PARCEL_STATUS, VEHICLE_TYPE } from "../../../enum/parcel";

const coordinateSchema = z.array(z.number())
    .length(2)
    .refine((coords) => {
        const [lng, lat] = coords;
        return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
    }, {
        message: "Invalid coordinates. Format must be [longitude, latitude]."
    });

const createParcelSchema = z.object({
    body: z.object({
        name: z.string({ required_error: "Parcel name is required" }),
        itemValue: z.number({ required_error: "Item value is required" }),
        pickupLocation: z.object({
            address: z.string({ required_error: "Pickup address is required" }),
            coordinates: coordinateSchema,
        }),
        dropLocation: z.object({
            address: z.string({ required_error: "Drop address is required" }),
            coordinates: coordinateSchema,
        }),
        vehicleType: z.nativeEnum(VEHICLE_TYPE),
        deliveryDate: z.string({ required_error: "Delivery date is required" }),
        receiverName: z.string({ required_error: "Receiver name is required" }),
        receiverPhone: z.string({ required_error: "Receiver phone is required" }),
        note: z.string().optional(),
    }),
});

const updateParcelSchema = z.object({
    body: z.object({
        name: z.string().optional(),
        itemValue: z.number().optional(),
        pickupLocation: z.object({
            address: z.string(),
            coordinates: coordinateSchema,
        }).optional(),
        dropLocation: z.object({
            address: z.string(),
            coordinates: coordinateSchema,
        }).optional(),
        vehicleType: z.nativeEnum(VEHICLE_TYPE).optional(),
        deliveryDate: z.string().optional(),
        receiverName: z.string().optional(),
        receiverPhone: z.string().optional(),
        status: z.nativeEnum(PARCEL_STATUS).optional(),
        note: z.string().optional(),
        pickupProof: z.array(z.string()).optional(),
        deliveryProof: z.array(z.string()).optional(),
        estimatedArrival: z.string().optional(),
    }),
});

const getNearbyParcelsSchema = z.object({
    query: z.object({
        latitude: z.string({ required_error: "Latitude is required" }),
        longitude: z.string({ required_error: "Longitude is required" }),
        distance: z.string().optional(),
        page: z.string().optional(),
        limit: z.string().optional(),
    }),
});

export const ParcelValidation = {
    createParcelSchema,
    updateParcelSchema,
    getNearbyParcelsSchema,
};
