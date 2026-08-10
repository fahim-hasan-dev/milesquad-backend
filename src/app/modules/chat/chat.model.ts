import { model, Schema } from 'mongoose';
import { ChatModel, IChat } from './chat.interface';

const chatSchema = new Schema<IChat, ChatModel>(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }
        ],
        isAdminSupport: {
            type: Boolean,
            default: false
        },
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: 'Message'
        },
        lastMessageAt: {
            type: Date
        },
        status: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
)

export const Chat = model<IChat, ChatModel>('Chat', chatSchema);