import { FilterQuery, Types } from 'mongoose';
import { Message } from '../message/message.model';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../builder/QueryBuilder';

const createChatToDB = async (payload: {
    participants: string[];
    isAdminSupport?: boolean;
}): Promise<IChat> => {
    // Check if chat already exists between these participants
    const isExistChat: IChat | null = await Chat.findOne({
        participants: { $all: payload.participants },
        $expr: { $eq: [{ $size: "$participants" }, payload.participants.length] }
    });

    if (isExistChat) {
        return isExistChat;
    }

    // Create new chat
    const chat: IChat = await Chat.create({
        participants: payload.participants,
        isAdminSupport: payload.isAdminSupport || false
    });

    return chat;
};

const getChatFromDB = async (
    user: JwtPayload,
    query: Record<string, unknown>
): Promise<any> => {
    // Build query to find chats where user is a participant
    const chatFilter: FilterQuery<IChat> = {
        participants: { $in: [user.id] },
    };

    if (query.searchTerm) {
        // Use QueryBuilder's native search implementation on the User model
        const userQueryBuilder = new QueryBuilder(User.find(), query)
            .search(['fullName', 'email']);

        const matchingUsers = await userQueryBuilder.modelQuery
            .select('_id')
            .lean();

        const matchingUserIds = matchingUsers.map((u: any) => u._id);

        // Add to query: at least one of the OTHER participants must be in matchingUserIds
        chatFilter.participants = {
            $all: [user.id],
            $in: matchingUserIds
        };
    }

    const chatQueryBuilder = new QueryBuilder(Chat.find(chatFilter), query);
    chatQueryBuilder
        .filter()
        .paginate();

    const chats = await chatQueryBuilder.modelQuery
        .populate({
            path: 'participants',
            select: '_id fullName profilePicture role email',
            match: { _id: { $ne: user.id } }
        })
        .populate({
            path: 'lastMessage',
            select: 'text files type createdAt sender'
        })
        .select('participants status isAdminSupport lastMessage lastMessageAt')
        .lean();

    const pagination = await chatQueryBuilder.getPaginationInfo();

    // Calculate unread count for each chat
    const chatsWithDetails = await Promise.all(
        chats.map(async (chat: any) => {
            const unreadCount = await Message.countDocuments({
                chatId: chat._id,
                sender: { $ne: new Types.ObjectId(user.id) },
                readBy: { $ne: new Types.ObjectId(user.id) }
            });

            return {
                ...chat,
                unreadCount
            };
        })
    );

    // Filter out chats where participants array is empty after filtering
    const filteredChats = chatsWithDetails.filter(
        (chat: any) => chat.participants.length > 0
    );

    return { data: filteredChats, pagination };
};

// Delete a chat
const deleteChatFromDB = async (chatId: string, userId: string): Promise<void> => {
    const chat = await Chat.findById(chatId);

    if (!chat) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
        (p) => p.toString() === userId
    );

    if (!isParticipant) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            'You are not authorized to delete this chat'
        );
    }

    // Delete all messages in the chat
    await Message.deleteMany({ chatId });

    // Delete the chat
    await Chat.findByIdAndDelete(chatId);
};

export const ChatService = {
    createChatToDB,
    getChatFromDB,
    deleteChatFromDB
};