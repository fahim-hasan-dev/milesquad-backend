import { Schema, model } from 'mongoose';
import { ISupportTicket, SupportTicketModel } from './support.interface';

const supportTicketSchema = new Schema<ISupportTicket, SupportTicketModel>(
    {
        ticketId: {
            type: String,
            required: true,
            unique: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['pending', 'solved', 'closed'],
            default: 'pending',
        },
        message: {
            type: String,
            required: true,
        },
        reply: {
            type: String,
            default: '',
        },
        files: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
        },
    }
);

export const SupportTicket = model<ISupportTicket, SupportTicketModel>('SupportTicket', supportTicketSchema);
