import { z } from 'zod';

export const createPlanZodValidationSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }),
        description: z.string({ required_error: "Description is required" }),
        price: z.number({ required_error: "Price is required" }),
        duration: z.enum(["1 month", "3 months", "6 months", "1 year"], { required_error: "Duration is required" }),
        paymentType: z.enum(["Monthly", "Yearly"], { required_error: "Payment type is required" }),
        features: z.array(z.string({ required_error: "Feature is required" }), { required_error: "Features are required" }),
    })
});

// update plan zod validation schema
export const updatePlanZodValidationSchema = z.object({
    body: z.object({
        title: z.string({ required_error: "Title is required" }).optional(),
        description: z.string({ required_error: "Description is required" }).optional(),
        price: z.number({ required_error: "Price is required" }).optional(),
        duration: z.enum(["1 month", "3 months", "6 months", "1 year"], { required_error: "Duration is required" }).optional(),
        paymentType: z.enum(["Monthly", "Yearly"], { required_error: "Payment type is required" }).optional(),
        features: z.array(z.string({ required_error: "Feature is required" }), { required_error: "Features are required" }).optional(),
    })
});
