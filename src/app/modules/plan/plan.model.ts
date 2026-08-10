import { model, Schema } from "mongoose";
import { IPlan, PlanModel } from "./plan.interface";

const planSchema = new Schema<IPlan, PlanModel>(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        duration: {
            type: String,
            enum: ['1 month' , '3 months' , '6 months' , '1 year'],
            required: true
        },
        paymentType: {
            type: String,
            enum: ['Monthly' , 'Yearly'],
            required: true
        },
        productId: {
            type: String,
            required: true
        },
        priceId: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Active', 'Delete'],
            default: "Active"
        },
        features: {
            type: [String],
            required: true
        }
    },
    {
        timestamps: true
    }
)

export const Plan = model<IPlan, PlanModel>("Plan", planSchema)