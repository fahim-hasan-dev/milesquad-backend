import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ParcelServices } from "./parcel.service";
import { JwtPayload } from "jsonwebtoken";

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

export const ParcelController = {
    createParcel,
    selectPaymentMethod,
    getAllParcels,
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
};
