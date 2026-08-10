import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PackageService } from "./plan.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const createPlan = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.createPlanToDB(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Package created Successfully",
        data: result
    })
})

const updatePlan = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.updatePlanToDB(req.params.id, req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Plan updated Successfully",
        data: result
    })
})

const getPlan = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.getPlanFromDB(req.query.paymentType as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Plan Retrieved Successfully",
        data: result
    })
})

const planDetails = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.getPlanDetailsFromDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Plan Details Retrieved Successfully",
        data: result
    })
})


const deletePlan = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.deletePlanToDB(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Plan Deleted Successfully",
        data: result
    })
})

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
    const result = await PackageService.creatSession(req.user!, req.params.planId as string);

    res.status(StatusCodes.OK).json({ url: result.url })

})


export const PlanController = {
    createPlan,
    updatePlan,
    getPlan,
    planDetails,
    deletePlan,
    createCheckoutSession
}
