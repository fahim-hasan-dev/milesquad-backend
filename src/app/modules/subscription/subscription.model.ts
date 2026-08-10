import { model, Schema } from "mongoose";
import { ISubscription, SubscriptionModel } from "./subscription.interface";

const subscriptionSchema = new Schema<ISubscription, SubscriptionModel>(
    {
        customerId: {
            type: String,
            required: true
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        plan: {
            type: Schema.Types.ObjectId,
            ref: "Plan",
            required: true
        },
        trxId: {
            type: String,
            required: false
        },
        subscriptionId: {
            type: String,
            required: true
        },
        currentPeriodStart: {
            type: Date,
            required: true
        },
        currentPeriodEnd: {
            type: Date,
            required: true
        },
        invoice: {
            type: String,
            required: false
        },
        status: {
            type: String,
            enum: ["expired", "active", "cancel"],
            default: "active",
            required: true
        },
        

    },
    {
        timestamps: true
    }
)

export const Subscription = model<ISubscription, SubscriptionModel>("Subscription", subscriptionSchema)