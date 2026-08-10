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
    const { latitude, longitude, distance } = req.query;

    const result = await ParcelServices.getNearbyParcels(
        Number(latitude),
        Number(longitude),
        distance ? Number(distance) : undefined,
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
    const result = await ParcelServices.getSingleParcel(req.params.id);

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
    const result = await ParcelServices.calculateParcelDistanceAndPrice(req.query);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Distance and price calculated successfully",
        data: result,
    });
});

export const ParcelController = {
    createParcel,
    getAllParcels,
    getMyParcels,
    getNearbyParcels,
    acceptParcel,
    getSingleParcel,
    calculateDistance,
    updateParcel,
    cancelParcel,
    deleteParcel,
};
