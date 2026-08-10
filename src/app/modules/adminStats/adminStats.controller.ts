import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { AdminStatsService } from './adminStats.service';

const getAdminDashboardStats = catchAsync(async (req: Request, res: Response) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const result = await AdminStatsService.getAdminDashboardStats(year);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin Dashboard Stats Retrieved Successfully',
        data: result,
    });
});

export const AdminStatsController = {
    getAdminDashboardStats
};
