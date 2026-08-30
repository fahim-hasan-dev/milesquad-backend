import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ParcelServices } from "./parcel.service";
import { JwtPayload } from "jsonwebtoken";
import ExcelJS from "exceljs";

const createParcel = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await ParcelServices.createParcel(req.body, user);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "Parcel created successfully",
        data: result,
    });
});

const getAllParcels = catchAsync(async (req: Request, res: Response) => {
    const result = await ParcelServices.getAllParcels(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcels fetched successfully",
        data: result,
    });
});

const getUserOrders = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const result = await ParcelServices.getUserOrders(userId, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User order history fetched successfully",
        data: result,
    });
});

const getMyParcels = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const userId = user.authId || user.id;
    const result = await ParcelServices.getMyParcels(userId, user.role, req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcels fetched successfully",
        data: result,
    });
});

const getNearbyParcels = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const { latitude, longitude, distance, maxDistance } = req.query;
    const distanceVal = distance || maxDistance;

    const result = await ParcelServices.getNearbyParcels(
        Number(latitude),
        Number(longitude),
        distanceVal ? Number(distanceVal) : undefined,
        user,
        req.query
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Nearby parcels fetched successfully",
        data: result,
    });
});

const acceptParcel = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const userId = user.authId || user.id;
    const result = await ParcelServices.acceptParcel(req.params.id, userId);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcel accepted successfully",
        data: result,
    });
});

const getSingleParcel = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await ParcelServices.getSingleParcel(req.params.id, user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcel fetched successfully",
        data: result,
    });
});

const updateParcel = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const result = await ParcelServices.updateParcel(
        req.params.id,
        req.body,
        user
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcel updated successfully",
        data: result,
    });
});

const cancelParcel = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    await ParcelServices.cancelParcel(req.params.id, user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcel cancelled successfully"
    });
});

const deleteParcel = catchAsync(async (req: Request, res: Response) => {
    await ParcelServices.deleteParcel(req.params.id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Parcel deleted successfully",
    });
});

const calculateDistance = catchAsync(async (req: Request, res: Response) => {
    const result = await ParcelServices.getOrCalculateParcelDistance(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Distance calculated successfully",
        data: result,
    });
});

const selectPaymentMethod = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const result = await ParcelServices.selectPaymentMethod(id, user, paymentMethod);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const assignParcelByAdmin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { assigneeId, type } = req.body;

    const result = await ParcelServices.assignParcelByAdmin(id, assigneeId, type);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `Parcel assigned to ${type || 'driver'} successfully`,
        data: result,
    });
});

const downloadInvoice = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { format } = req.query;
    const result = await ParcelServices.getParcelInvoice(id);

    if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        res.send(result.html);
        return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.pdfBuffer);
});

const getAvailableDriversForParcel = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await ParcelServices.getAvailableDriversForParcel(id);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Available drivers fetched successfully",
        data: result,
    });
});

const getCurrentActiveParcel = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as JwtPayload;
    const userId = user.authId || user.id;
    const result = await ParcelServices.getCurrentActiveParcel(userId, user.role);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result ? "Current active parcel fetched successfully" : "No active running parcel found",
        data: result,
    });
});

const exportParcels = catchAsync(async (req: Request, res: Response) => {
    const formattedData = await ParcelServices.exportParcelsData(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Milesquad Admin";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Deliveries Report");

    if (formattedData.length > 0) {
        const headers = Object.keys(formattedData[0]);

        // Header row
        const headerRow = worksheet.addRow(headers);
        headerRow.height = 26;

        // Emerald Green Header Style
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

        // Data rows
        formattedData.forEach((dataObj) => {
            const row = worksheet.addRow(Object.values(dataObj));
            row.height = 20;
            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", horizontal: "left" };
            });
        });

        // Auto-fit column width based on max text length + padding!
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

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="deliveries_export_${Date.now()}.xlsx"`
    );
    res.status(StatusCodes.OK).send(buffer);
});

export const ParcelController = {
    createParcel,
    selectPaymentMethod,
    getAllParcels,
    getUserOrders,
    getMyParcels,
    getNearbyParcels,
    acceptParcel,
    getSingleParcel,
    calculateDistance,
    updateParcel,
    cancelParcel,
    deleteParcel,
    assignParcelByAdmin,
    downloadInvoice,
    getAvailableDriversForParcel,
    getCurrentActiveParcel,
    exportParcels,
};
