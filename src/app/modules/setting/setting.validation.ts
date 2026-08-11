import { z } from "zod";

const fareSettingValidation = z.object({
    baseFee: z.number().optional(),
    freeTime: z.number().optional(),
    timeRate: z.number().optional(),
    fuelRate: z.number().optional(),
    maxWeight: z.number().optional(),
    maxVolume: z.number().optional(),
    loadFactor: z.number().optional(),
    commission: z.object({
        platformMargin: z.number().optional(),
        ridersMargin: z.number().optional(),
    }).optional(),
    riskIndex: z.object({
        riskIndex1: z.number().optional(),
        riskIndex2: z.number().optional(),
        riskIndex3: z.number().optional(),
    }).optional(),
}).optional();

const updateSettingZodSchema = z.object({
    body: z.object({
        fareSettings: z.object({
            motorcycle: fareSettingValidation,
            tricycle: fareSettingValidation,
            car: fareSettingValidation,
            van: fareSettingValidation,
            truck: fareSettingValidation,
        }).optional(),
        vehicleBaseFares: z.object({
            motorcycle: z.number().optional(),
            tricycle: z.number().optional(),
            car: z.number().optional(),
            van: z.number().optional(),
            truck: z.number().optional(),
        }).optional(),
        perKiloCost: z.number().optional(),
        platformCommissionPercentage: z.number().optional(),
    }),
});

export const SettingValidations = {
    updateSettingZodSchema,
};
