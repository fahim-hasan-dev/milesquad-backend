import { Model } from "mongoose";

export type IPlan = {
    title: string;
    description: string;
    price: number;
    duration: '1 month' | '3 months' | '6 months' | '1 year'; 
    paymentType: 'Monthly' | 'Yearly';
    productId?: string;
    status: 'Active' | 'Delete';
    priceId?: string;
    features: string[];
}

export type PlanModel = Model<IPlan, Record<string, unknown>>;