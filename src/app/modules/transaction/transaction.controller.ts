import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TransactionService } from "./transaction.service";
import { JwtPayload } from "jsonwebtoken";
import ExcelJS from "exceljs";

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

const exportTransactions = catchAsync(async (req: Request, res: Response) => {
    const formattedData = await TransactionService.exportTransactionsData(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Milesquad Admin";
    workbook.created = new Date();

    const sheetName = req.query.type?.toString().toUpperCase() === "PAYOUT" ? "Payouts Report" : "Transactions Report";
    const worksheet = workbook.addWorksheet(sheetName);

    if (formattedData.length > 0) {
        const headers = Object.keys(formattedData[0]);

        const headerRow = worksheet.addRow(headers);
        headerRow.height = 26;

        headerRow.eachCell((cell) => {
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "10B981" },
            };
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.border = {
                top: { style: "thin", color: { argb: "059669" } },
                bottom: { style: "medium", color: { argb: "047857" } },
            };
        });

        formattedData.forEach((dataObj) => {
            const row = worksheet.addRow(Object.values(dataObj));
            row.height = 20;
            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            });
        });

        worksheet.columns.forEach((column) => {
            let maxLen = 14;
            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const val = cell.value !== null && cell.value !== undefined ? String(cell.value) : "";
                if (val.length > maxLen) {
                    maxLen = val.length;
                }
            });
            column.width = Math.min(Math.max(maxLen + 4, 14), 60);
        });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    const prefix = req.query.type?.toString().toUpperCase() === "PAYOUT" ? "payouts_export" : "transactions_export";

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${prefix}_${Date.now()}.xlsx"`
    );
    res.status(StatusCodes.OK).send(buffer);
});

export const TransactionController = {
    getMyTransactions,
    getAllTransactions,
    getSingleTransaction,
    requestPayout,
    updatePayoutStatus,
    exportTransactions,
};
