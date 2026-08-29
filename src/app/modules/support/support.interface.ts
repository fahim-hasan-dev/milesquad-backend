import { Model, Types } from 'mongoose';

export type ISupportTicketStatus = 'pending' | 'solved' | 'closed';

export interface ISupportTicket {
    _id?: Types.ObjectId;
    ticketId: string;
    user: Types.ObjectId;
    title: string;
    status: ISupportTicketStatus;
    message: string;
    reply?: string;
    files?: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export type SupportTicketModel = Model<ISupportTicket, Record<string, unknown>>;
