import { z } from "zod";

const createPartnerZodSchema = z.object({
    body: z.object({
        fullName: z.string({ required_error: "Full name is required" }),
        rolePosition: z.string({ required_error: "Role or position is required" }),
        email: z.string({ required_error: "Email address is required" }).email("Invalid email format"),
        phone: z.string({ required_error: "Phone number is required" }),
    }),
});

const updatePartnerZodSchema = z.object({
    body: z.object({
        fullName: z.string().optional(),
        rolePosition: z.string().optional(),
        email: z.string().email("Invalid email format").optional(),
        phone: z.string().optional(),
        status: z.enum(['active', 'inactive', 'deleted']).optional(),
    }),
});

export const PartnerValidation = {
    createPartnerZodSchema,
    updatePartnerZodSchema,
};
