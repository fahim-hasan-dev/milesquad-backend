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

const getDriverEarnings = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const userId = user.authId || user.id;
    const range = (req.query.range as string) || "all";
    const result = await DriverStatsService.getDriverEarnings(userId, range);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Driver earnings statistics fetched successfully",
        data: result
    });
});

export const DriverStatsController = {
    getDriverStats,
    getDriverEarnings
};
