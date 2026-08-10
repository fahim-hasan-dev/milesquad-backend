import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { VehicleServices } from './vehicle.service';

const createVehicle = catchAsync(async (req: Request, res: Response) => {
    const result = await VehicleServices.createVehicle(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Vehicle created successfully',
        data: result,
    });
});

const getAllVehicles = catchAsync(async (req: Request, res: Response) => {
    const result = await VehicleServices.getAllVehicles(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Vehicles fetched successfully',
        data: { ...result },
    });
});

const getSingleVehicle = catchAsync(async (req: Request, res: Response) => {
    const result = await VehicleServices.getSingleVehicle(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Vehicle fetched successfully',
        data: result,
    });
});

const updateVehicle = catchAsync(async (req: Request, res: Response) => {
    const result = await VehicleServices.updateVehicle(req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Vehicle updated successfully',
        data: result,
    });
});

const deleteVehicle = catchAsync(async (req: Request, res: Response) => {
    await VehicleServices.deleteVehicle(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Vehicle deleted successfully',
    });
});

const assignDriver = catchAsync(async (req: Request, res: Response) => {
    const result = await VehicleServices.assignDriver(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Driver assigned successfully',
        data: result,
    });
});

const removeDriver = catchAsync(async (req: Request, res: Response) => {
    const result = await VehicleServices.removeDriver(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Driver removed successfully',
        data: result,
    });
});

export const VehicleController = {
    createVehicle,
    getAllVehicles,
    getSingleVehicle,
    updateVehicle,
    deleteVehicle,
    assignDriver,
    removeDriver,
};
