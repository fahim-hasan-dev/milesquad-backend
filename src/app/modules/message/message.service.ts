import mongoose from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import { IMessage } from './message.interface';
import { Message } from './message.model';
import { checkMongooseIDValidation } from '../../../shared/checkMongooseIDValidation';
import { Chat } from '../chat/chat.model';
import { MESSAGE } from '../../../enum/message';
import { JwtPayload } from 'jsonwebtoken';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';
import { PushNotificationService } from '../notification/pushNotification.service';
import { User } from '../user/user.model';
import { ADMIN_ROLES } from '../../../enum/user';

const sendMessageToDB = async (payload: any): Promise<IMessage> => {
  // Initialize readBy with sender's ID
  payload.readBy = [payload.sender];


  const isExistChat = await Chat.findById(payload.chatId);
  if (!isExistChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Chat doesn't exist!");
  }

  if (!isExistChat.participants.some(p => p.toString() === payload.sender.toString())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You are not a participant!");
  }

  // Save to DB
  const response = await Message.create(payload);

  // Update chat's lastMessage and lastMessageAt
  await Chat.findByIdAndUpdate(payload.chatId, {
    lastMessage: response._id,
    lastMessageAt: new Date()
  });

  //@ts-ignore
  const io = global.io;
  if (io && payload.chatId) {
    // Send message to specific Chat room
    io.emit(`getMessage::${payload?.chatId}`, response);

    // Notify ALL participants to update their chat list (real-time sorting)
    isExistChat.participants.forEach((participantId: any) => {
      io.emit(`chatListUpdate::${participantId.toString()}`, {
        chatId: payload.chatId,
        lastMessage: response,
      });
    });

  }

  // Send Push Notification
  try {
    const chatStatus = await Chat.findById(payload.chatId);
    if (chatStatus) {
      // Fetch sender details for better title
      const sender = await User.findById(payload.sender).select('fullName role');
      const title = sender?.fullName || "New Message";
      const body = payload.text ?
        (payload.text.length > 50 ? payload.text.substring(0, 50) + "..." : payload.text) :
        "Sent an attachment";

      // Normal Chat recipient
      const recipientId = chatStatus.participants.find(
        (p: any) => p.toString() !== payload.sender.toString()
      );

      if (recipientId) {
        const recipient = await User.findById(recipientId).select('fcmToken');
        if (recipient?.fcmToken) {
          await PushNotificationService.sendPushNotification(
            recipient.fcmToken,
            title,
            body,
            { screen: "CHAT", chatId: payload.chatId?.toString() }
          );
        }
      }
    }
  } catch (error) {
    console.error("Failed to send push notification:", error);
    // Don't block the response if notification fails
  }

  return response;
};

// Get Message from db
const getMessageFromDB = async (
  id: string,
  user: JwtPayload,
  query: Record<string, any>
): Promise<{ messages: IMessage[], pagination: any, participant: any }> => {
  checkMongooseIDValidation(id, "Chat");

  const isExistChat = await Chat.findById(id);
  if (!isExistChat) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Chat doesn't exist!");
  }

  if (!isExistChat.participants.some(p => p.toString() === user.id.toString())) {
    throw new Error('You are not participant of this chat')
  }

  // Mark messages as read for this user
  await Message.updateMany(
    {
      chatId: new mongoose.Types.ObjectId(id),
      sender: { $ne: new mongoose.Types.ObjectId(user.id) },
      readBy: { $ne: new mongoose.Types.ObjectId(user.id) }
    },
    {
      $addToSet: { readBy: new mongoose.Types.ObjectId(user.id) }
    }
  );

  const result = new QueryBuilder(
    Message.find({ chatId: id })
      .populate('sender', 'fullName profilePicture')
      .sort({ createdAt: -1 }),
    query
  ).paginate();

  let messages = await result.modelQuery;
  const pagination = await result.getPaginationInfo();
  messages = messages.reverse();

  const participant = await Chat.findById(id).populate({
    path: 'participants',
    select: '-_id fullName profilePicture ',
    match: {
      _id: { $ne: new mongoose.Types.ObjectId(user.id) }
    }
  });

  return { messages, pagination, participant: participant?.participants[0] };
};


// Update a message
const updateMessageToDB = async (messageId: string, userId: string, payload: Partial<IMessage>): Promise<IMessage | null> => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Message not found");
  }

  // Check if the user is the sender
  if (message.sender.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You can only update your own messages");
  }

  // Update the message
  const updatedMessage = await Message.findByIdAndUpdate(
    messageId,
    payload,
    { new: true }
  );

  //@ts-ignore
  const io = global.io;
  if (io && updatedMessage) {
    io.emit(`getMessage::${updatedMessage.chatId}`, updatedMessage);
  }

  return updatedMessage;
};

// Get unread message count for a specific chat
const getUnreadCountForChat = async (chatId: string, userId: string): Promise<number> => {
  const count = await Message.countDocuments({
    chatId: new mongoose.Types.ObjectId(chatId),
    sender: { $ne: new mongoose.Types.ObjectId(userId) },
    readBy: { $ne: new mongoose.Types.ObjectId(userId) }
  });

  return count;
};

// Get total unread message count for a user
const getTotalUnreadCount = async (userId: string): Promise<number> => {
  // Get all chats for this user
  const chats = await Chat.find({
    participants: new mongoose.Types.ObjectId(userId)
  }).select('_id');

  const chatIds = chats.map(chat => chat._id);

  // Count unread messages across all chats
  const count = await Message.countDocuments({
    chatId: { $in: chatIds },
    sender: { $ne: new mongoose.Types.ObjectId(userId) },
    readBy: { $ne: new mongoose.Types.ObjectId(userId) }
  });

  return count;
};

// Delete message from DB
const deleteMessageFromDB = async (messageId: string, userId: string): Promise<IMessage | null> => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Message not found");
  }

  // Check if the user is the sender of the message
  if (message.sender.toString() !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You can only delete your own messages");
  }

  return await Message.findByIdAndDelete(messageId);
};

const updateMoneyRequestStatusToDB = async (messageId: string, user: JwtPayload, status: 'accepted' | 'rejected') => {
  return null;
};

export const MessageService = {
  sendMessageToDB,
  getMessageFromDB,
  updateMessageToDB,
  getUnreadCountForChat,
  getTotalUnreadCount,
  deleteMessageFromDB,
  updateMoneyRequestStatusToDB
};