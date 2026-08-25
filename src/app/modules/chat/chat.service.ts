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
}): Promise<any> => {
    // Check if chat already exists between these participants
    let chat = await Chat.findOne({
        participants: { $all: payload.participants },
        $expr: { $eq: [{ $size: "$participants" }, payload.participants.length] }
    });

    if (!chat) {
        // Create new chat
        chat = await Chat.create({
            participants: payload.participants,
            isAdminSupport: payload.isAdminSupport || false
        });
    }

    const populatedChat = await Chat.findById(chat._id)
        .populate({
            path: 'participants',
            select: '_id fullName image role email',
        })
        .populate({
            path: 'lastMessage',
            select: 'text files type createdAt sender',
        })
        .lean();

    return populatedChat;
};


const getChatFromDB = async (
    user: JwtPayload,
    query: Record<string, unknown>
): Promise<any> => {
    // Build query to find chats where user is a participant
    const chatFilter: FilterQuery<IChat> = {
        participants: { $in: [user.authId] },
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
            $all: [user.authId],
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
            select: '_id fullName image role email',
            match: { _id: { $ne: user.authId } }
        })
        .populate({
            path: 'lastMessage',
            select: 'text files type createdAt sender'
        })
        .select('participants status lastMessage lastMessageAt')
        .lean();

    const pagination = await chatQueryBuilder.getPaginationInfo();

    // Calculate unread count for each chat
    const chatsWithDetails = await Promise.all(
        chats.map(async (chat: any) => {
            const unreadCount = await Message.countDocuments({
                chatId: chat._id,
                sender: { $ne: new Types.ObjectId(user.authId) },
                readBy: { $ne: new Types.ObjectId(user.authId) }
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

const getSingleChatFromDB = async (chatId: string, user: JwtPayload): Promise<any> => {
    const rawChat = await Chat.findById(chatId);
    if (!rawChat) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found');
    }

    const userIdStr = user.authId || user.id;
    const isParticipant = rawChat.participants.some(
        (p) => p.toString() === userIdStr?.toString()
    );

    if (!isParticipant) {
        throw new ApiError(
            StatusCodes.FORBIDDEN,
            'You are not authorized to view this chat'
        );
    }

    const chat = await Chat.findById(chatId)
        .populate({
            path: 'participants',
            select: '_id fullName image role email',
            match: { _id: { $ne: userIdStr } }
        })
        .populate({
            path: 'lastMessage',
            select: 'text files type createdAt sender'
        })
        .lean();

    const unreadCount = await Message.countDocuments({
        chatId: new Types.ObjectId(chatId),
        sender: { $ne: new Types.ObjectId(userIdStr) },
        readBy: { $ne: new Types.ObjectId(userIdStr) }
    });

    return {
        ...chat,
        unreadCount
    };
};

export const ChatService = {
    createChatToDB,
    getChatFromDB,
    getSingleChatFromDB,
    deleteChatFromDB
};