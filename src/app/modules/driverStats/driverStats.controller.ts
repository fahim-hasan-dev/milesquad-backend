import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { DriverStatsService } from "./driverStats.service";
import { JwtPayload } from "jsonwebtoken";

const getDriverStats = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await DriverStatsService.getDriverStats(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Driver statistics fetched successfully",
        data: result
    });
});

const getMyEarningsSummary = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const userId = user.authId || user.id;
    const result = await DriverStatsService.getMyEarningsSummary(userId, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Driver earnings summary fetched successfully",
        data: result
    });
});

export const DriverStatsController = {
    getDriverStats,
    getMyEarningsSummary
};
