import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SupportService } from './support.service';
import ApiError from '../../../errors/ApiError';

const createSupportTicket = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.authId || (req.user as any)?.id;
    if (!userId) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'User authentication required');
    }
    const result = await SupportService.createSupportTicket(req.body, userId);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Support ticket created successfully',
        data: result,
    });
});

const getAllSupportTickets = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.authId || (req.user as any)?.id;
    const role = (req.user as any)?.role;
    const result = await SupportService.getAllSupportTickets(req.query, userId, role);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Support tickets fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});

const getSingleSupportTicket = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await SupportService.getSingleSupportTicket(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Support ticket fetched successfully',
        data: result,
    });
});

const replySupportTicket = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await SupportService.replySupportTicket(id, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Reply sent and support ticket updated successfully',
        data: result,
    });
});

const updateSupportTicketStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const result = await SupportService.updateSupportTicketStatus(id, status);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Support ticket status updated successfully',
        data: result,
    });
});

const deleteSupportTicket = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await SupportService.deleteSupportTicket(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Support ticket deleted successfully',
        data: result,
    });
});

export const SupportController = {
    createSupportTicket,
    getAllSupportTickets,
    getSingleSupportTicket,
    replySupportTicket,
    updateSupportTicketStatus,
    deleteSupportTicket,
};
