import { Schema, model } from "mongoose";
import { IPartner, PartnerModel } from "./partner.interface";
import { getNextCustomId } from "../counter/counter.model";

const PartnerSchema = new Schema<IPartner, PartnerModel>(
    {
        partnerId: {
            type: String,
            unique: true,
            sparse: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        rolePosition: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'deleted'],
            default: 'active',
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
        },
    }
);

PartnerSchema.pre("save", async function (next) {
    if (!this.partnerId) {
        this.partnerId = await getNextCustomId("PTR");
    }
    next();
});

export const Partner = model<IPartner, PartnerModel>("Partner", PartnerSchema);
