import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { SettingServices } from "./setting.service";

const getSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await SettingServices.getSettings();

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Settings retrieved successfully",
        data: result,
    });
});

const updateSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await SettingServices.updateSettings(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Settings updated successfully",
        data: result,
    });
});

export const SettingControllers = {
    getSettings,
    updateSettings,
};
