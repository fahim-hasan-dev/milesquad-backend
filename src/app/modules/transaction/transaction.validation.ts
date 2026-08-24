import { z } from "zod";
import { TRANSACTION_STATUS } from "../../../enum/transaction";

const payoutRequestZodSchema = z.object({
    body: z.object({
        amount: z.number({ required_error: "Payout amount is required" }).positive("Amount must be greater than zero"),
        accountDetails: z.string({ required_error: "Account or bank details are required" }),
        description: z.string().optional(),
    }),
});

const updatePayoutStatusZodSchema = z.object({
    body: z.object({
        status: z.enum([TRANSACTION_STATUS.COMPLETED, TRANSACTION_STATUS.REJECTED, TRANSACTION_STATUS.CANCELLED, TRANSACTION_STATUS.FAILED] as const, {
            required_error: "Status is required",
        }),
        rejectReason: z.string().optional(),
    }),
});

export const TransactionValidation = {
    payoutRequestZodSchema,
    updatePayoutStatusZodSchema,
};
