import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { UserServices } from './user.service'
import { IUser } from './user.interface'
import config from '../../../config'
import { JwtPayload } from 'jsonwebtoken'
import ExcelJS from 'exceljs'



// Update Profile
const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.updateProfile(req.user! as JwtPayload, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile updated successfully',
  })
})

const getAllUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getAllUser(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User fetched successfully',
    data: {...result},
  })
})

// get single user
const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getSingleUser(req.params.id)
  sendResponse<IUser>(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User fetched successfully',
    data: result,
  })
})



// delete user
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.deleteUser(req.params.id)
  sendResponse<IUser>(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User deleted successfully',
  })
})

// get profile
const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getProfile(req.user! as JwtPayload)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Profile fetched successfully',
    data: result,
  })
})


// delete my account
const deleteMyAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.deleteMyAccount(req.user! as JwtPayload)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Account deleted successfully",
  })
})



const approveDriverProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserServices.approveDriverProfile(id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Driver profile status updated to ${req.body.status} successfully`,
    data: result,
  });
});

const exportUsers = catchAsync(async (req: Request, res: Response) => {
    const formattedData = await UserServices.exportUsersData(req.query);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Milesquad Admin";
    workbook.created = new Date();

    const sheetName = req.query.role?.toString().toUpperCase() === "DRIVER" ? "Riders Report" : "Users Report";
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

    const prefix = req.query.role?.toString().toUpperCase() === "DRIVER" ? "riders_export" : "users_export";

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

export const UserController = {
  getAllUser,
  updateProfile,
  getSingleUser,
  deleteUser,
  getProfile,
  deleteMyAccount,
  approveDriverProfile,
  exportUsers,
}
