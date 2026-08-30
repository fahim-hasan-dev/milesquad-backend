import { z } from "zod";

const fareSettingValidation = z.object({
    baseFee: z.number().optional(),
    freeTime: z.number().optional(),
    timeRate: z.number().optional(),
    fuelRate: z.number().optional(),
    margin: z.number().optional(),
    overhead: z.number().optional(),
    riskIndex1: z.number().optional(),
    riskIndex2: z.number().optional(),
    riskIndex3: z.number().optional(),
    loadFactor: z.number().optional(),
    scheduledDelivery: z.number().optional(),
    maxWeight: z.number().optional(),
    maxVolume: z.number().optional(),
}).optional();

const updateSettingZodSchema = z.object({
    body: z.object({
        fareSettings: z.object({
            motorcycle: fareSettingValidation,
            tricycle: fareSettingValidation,
            car: fareSettingValidation,
            van: fareSettingValidation,
            small_cargo: fareSettingValidation,
        }).optional(),
    }),
});

export const SettingValidations = {
    updateSettingZodSchema,
};
