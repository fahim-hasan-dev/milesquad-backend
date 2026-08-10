import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { ChatService } from "./chat.service";
import { JwtPayload } from "jsonwebtoken";

const createChat = catchAsync(async (req: Request, res: Response) => {
    const chat = await ChatService.createChatToDB(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Create Chat Successfully',
        data: chat,
    });
});

const getChat = catchAsync(async (req: Request, res: Response) => {
    const result = await ChatService.getChatFromDB(
        req.user as JwtPayload,
        req.query
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Chat Retrieve Successfully',
        data: result.data,
        meta: result.pagination
    });
});

const deleteChat = catchAsync(async (req: Request, res: Response) => {
    await ChatService.deleteChatFromDB(req.params.id, req.user.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Chat Deleted Successfully',
        data: null
    });
});

export const ChatController = {
    createChat,
    getChat,
    deleteChat
};