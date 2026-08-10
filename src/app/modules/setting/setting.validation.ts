import { z } from "zod";

const updateSettingZodSchema = z.object({
    body: z.object({
        vehicleBaseFares: z.object({
            motorcycle: z.number().positive().optional(),
            tricycle: z.number().positive().optional(),
            van: z.number().positive().optional(),
        }).optional(),
        perKiloCost: z.number().positive().optional(),
        platformCommissionPercentage: z.number().min(0).max(100).optional(),
    }),
});

export const SettingValidations = {
    updateSettingZodSchema,
};
