import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TransactionService } from "./transaction.service";
import { JwtPayload } from "jsonwebtoken";

const getMyTransactions = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const userId = user.authId;
    const result = await TransactionService.getMyTransactions(userId, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Transactions fetched successfully",
        data: result,
    });
});

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
    const result = await TransactionService.getAllTransactions(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Transactions fetched successfully",
        data: result,
    });
});

const getSingleTransaction = catchAsync(async (req: Request, res: Response) => {
    const result = await TransactionService.getSingleTransaction(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Transaction fetched successfully",
        data: result,
    });
});

const requestPayout = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const driverId = user.authId || user.id;
    const { amount, accountDetails, description } = req.body;

    const result = await TransactionService.requestPayout(
        driverId,
        amount,
        accountDetails,
        description
    );

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Payout request submitted successfully",
        data: result,
    });
});

const updatePayoutStatus = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    const result = await TransactionService.updatePayoutStatus(id, status, rejectReason);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Payout status updated successfully",
        data: result,
    });
});

export const TransactionController = {
    getMyTransactions,
    getAllTransactions,
    getSingleTransaction,
    requestPayout,
    updatePayoutStatus,
};
