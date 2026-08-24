import { Model, Types } from "mongoose";
import { TRANSACTION_STATUS, TRANSACTION_TYPE } from "../../../enum/transaction";
import { PAYMENT_METHOD } from "../../../enum/parcel";

export interface ITransaction {
    _id: Types.ObjectId;
    transactionId: string;
    user: Types.ObjectId;
    parcel?: Types.ObjectId;
    amount: number;
    type: TRANSACTION_TYPE;
    status: TRANSACTION_STATUS;
    paymentMethod?: PAYMENT_METHOD | string;
    accountDetails?: string;
    description?: string;
    rejectReason?: string;
    metadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
}

export type TransactionModel = Model<ITransaction>;
