import { Model, Types } from 'mongoose';

export type ISubscription = {
    _id?:string;
    user: Types.ObjectId;
    customerId: string;
    price: number;
    plan: Types.ObjectId;
    trxId?: string;
    subscriptionId: string;
    status: 'expired' | 'active' | 'cancel';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    invoice?: string;
};



export type SubscriptionModel = Model<ISubscription, Record<string, unknown>>;