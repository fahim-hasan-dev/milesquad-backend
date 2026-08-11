import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminServices } from './admin.service';

const loginAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.loginAdmin(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result.message,
        data: result,
    });
});

const createSubAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.createSubAdmin(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Sub Admin created successfully',
        data: result,
    });
});

const getAllAdmins = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.getAllAdmins(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admins retrieved successfully',
        data: result,
    });
});

const getSingleAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.getSingleAdmin(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin retrieved successfully',
        data: result,
    });
});

const updateAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.updateAdmin(req.params.id, req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin updated successfully',
        data: result,
    });
});

const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.deleteAdmin(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Admin deleted successfully',
        data: result,
    });
});

const forgetPasswordAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.forgetPasswordAdmin(req.body.email);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result,
    });
});

const resetPasswordAdmin = catchAsync(async (req: Request, res: Response) => {
    const result = await AdminServices.resetPasswordAdmin(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: result,
    });
});

export const AdminControllers = {
    loginAdmin,
    createSubAdmin,
    getAllAdmins,
    getSingleAdmin,
    updateAdmin,
    deleteAdmin,
    forgetPasswordAdmin,
    resetPasswordAdmin,
};
