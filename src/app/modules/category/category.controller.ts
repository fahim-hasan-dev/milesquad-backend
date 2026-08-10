import { Request, Response } from "express";
import sendResponse from "../../../shared/sendResponse";
import { serviceService } from "./category.service";
import { ICategory } from "./category.interface";
import { StatusCodes } from "http-status-codes";

// create service
const createCategory = async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await serviceService.createCategory(payload);
  sendResponse<ICategory>(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
};

// get all services
const getAllCategories = async (req: Request, res: Response) => {
  const result = await serviceService.getAllCategories(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
};

// update service
const updateCategory = async (req: Request, res: Response) => {
  const id = req.params.id;
  const payload = req.body;
  const result = await serviceService.updateCategory(id, payload);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
};


// delete service
const deleteCategory = async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await serviceService.deleteCategory(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Category deleted successfully",
  });
};

export const categoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
