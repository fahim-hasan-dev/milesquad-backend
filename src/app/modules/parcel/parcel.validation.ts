import { z } from "zod";
import { PARCEL_STATUS, VEHICLE_TYPE, PAYMENT_METHOD } from "../../../enum/parcel";

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
        sameDayPickup: z.boolean().optional(),
        itemValue: z.number({ required_error: "Item value is required" }),
        numberOfGoods: z.number().optional(),
        goodType: z.string().optional(),
        totalWeight: z.number().optional(),
        dimension: z.object({
            height: z.number().optional(),
            width: z.number().optional(),
            length: z.number().optional(),
        }).optional(),
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
        receiverPhone: z.string({ required_error: "Receiver phone is required" }),
        paymentMethod: z.nativeEnum(PAYMENT_METHOD).optional(),
        note: z.string().optional(),
        packagePhotos: z.array(z.string()).optional(),
        pdfDocument: z.string().optional(),
    }),
});

const updateParcelSchema = z.object({
    body: z.object({
        sameDayPickup: z.boolean().optional(),
        itemValue: z.number().optional(),
        numberOfGoods: z.number().optional(),
        goodType: z.string().optional(),
        totalWeight: z.number().optional(),
        dimension: z.object({
            height: z.number().optional(),
            width: z.number().optional(),
            length: z.number().optional(),
        }).optional(),
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
        receiverPhone: z.string().optional(),
        status: z.nativeEnum(PARCEL_STATUS).optional(),
        note: z.string().optional(),
        packagePhotos: z.array(z.string()).optional(),
        pdfDocument: z.string().optional(),
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

const selectPaymentMethodSchema = z.object({
    body: z.object({
        paymentMethod: z.nativeEnum(PAYMENT_METHOD, {
            required_error: "Payment method is required",
        }),
    }),
});

const assignParcelSchema = z.object({
    body: z.object({
        assigneeId: z.string({ required_error: "Assignee ID is required" }),
        type: z.enum(['driver', 'partner']).optional().default('driver'),
    }),
});

export const ParcelValidation = {
    createParcelSchema,
    updateParcelSchema,
    getNearbyParcelsSchema,
    selectPaymentMethodSchema,
    assignParcelSchema,
};
