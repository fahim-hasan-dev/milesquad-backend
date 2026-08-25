import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { MessageService } from './message.service';

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  req.body.sender = req.user.authId
  const message = await MessageService.sendMessageToDB(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Send Message Successfully',
    data: message,
  });
});

const getMessage = catchAsync(async (req: Request, res: Response) => {
  const messages = await MessageService.getMessageFromDB(
    req.params.id,
    req.user,
    req.query
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Message Retrieve Successfully',
    data: messages,
  });
});

const updateMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.updateMessageToDB(
    req.params.id,
    req.user.authId,
    req.body
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Message Updated Successfully',
    data: result,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const count = await MessageService.getTotalUnreadCount(req.user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Unread count retrieved successfully',
    data: { unreadCount: count },
  });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.deleteMessageFromDB(req.params.id, req.user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Message Deleted Successfully',
    data: result,
  });
});



export const MessageController = {
  sendMessage,
  getMessage,
  updateMessage,
  getUnreadCount,
  deleteMessage
};
