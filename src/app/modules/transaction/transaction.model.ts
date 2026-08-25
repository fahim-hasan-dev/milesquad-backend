import { Schema, model } from "mongoose";
import { ITransaction, TransactionModel } from "./transaction.interface";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "../../../enum/transaction";
import { getNextCustomId } from "../counter/counter.model";

const TransactionSchema = new Schema<ITransaction, TransactionModel>(
    {
        transactionId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        parcel: {
            type: Schema.Types.ObjectId,
            ref: "Parcel",
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        type: {
            type: String,
            enum: Object.values(TRANSACTION_TYPE),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(TRANSACTION_STATUS),
            default: TRANSACTION_STATUS.COMPLETED,
        },
        paymentMethod: {
            type: String,
        },
        accountDetails: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        rejectReason: {
            type: String,
            default: "",
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
        },
    }
);

TransactionSchema.pre("validate", async function (next) {
    if (!this.transactionId) {
        this.transactionId = await getNextCustomId("TXN");
    }
    next();
});

export const Transaction = model<ITransaction, TransactionModel>("Transaction", TransactionSchema);
