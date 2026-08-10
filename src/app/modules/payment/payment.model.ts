import { model, Schema } from "mongoose";
import { IPayment } from "./payment.interface";

const PaymentSchema = new Schema<IPayment>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    customerName: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

// Index for better search performance
PaymentSchema.index({ email: 1, dateTime: -1 });


export const Payment = model<IPayment>('Payment', PaymentSchema);
