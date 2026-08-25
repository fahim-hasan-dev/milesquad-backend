import { Model } from "mongoose";

export interface IPartner {
    partnerId?: string;
    fullName: string;
    rolePosition: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive' | 'deleted';
}

export type PartnerModel = Model<IPartner>;
