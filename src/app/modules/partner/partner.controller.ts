import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PartnerService } from "./partner.service";

const createPartner = catchAsync(async (req: Request, res: Response) => {
    const result = await PartnerService.createPartner(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Partner created successfully",
        data: result,
    });
});

const getAllPartners = catchAsync(async (req: Request, res: Response) => {
    const result = await PartnerService.getAllPartners(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Partners fetched successfully",
        data: result,
    });
});

const getSinglePartner = catchAsync(async (req: Request, res: Response) => {
    const result = await PartnerService.getSinglePartner(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Partner fetched successfully",
        data: result,
    });
});

const updatePartner = catchAsync(async (req: Request, res: Response) => {
    const result = await PartnerService.updatePartner(req.params.id, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Partner updated successfully",
        data: result,
    });
});

const deletePartner = catchAsync(async (req: Request, res: Response) => {
    await PartnerService.deletePartner(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Partner deleted successfully",
    });
});

export const PartnerController = {
    createPartner,
    getAllPartners,
    getSinglePartner,
    updatePartner,
    deletePartner,
};
