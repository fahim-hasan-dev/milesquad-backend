import { Model, Types } from 'mongoose';

export type IChat = {
    _id?: Types.ObjectId;
    participants: Types.ObjectId[];
    isAdminSupport: boolean; 
    lastMessage?: Types.ObjectId; 
    lastMessageAt?: Date; 
    status: boolean;
}

export type ChatModel = Model<IChat, Record<string, unknown>>;