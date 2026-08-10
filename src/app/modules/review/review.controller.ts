import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ReviewService } from "./review.service";
import { StatusCodes } from 'http-status-codes'

const createReview = catchAsync(async (req, res) => {
  const user = req.user as any
  const result = await ReviewService.createReview(user, req.body)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review created successfully',
    data: result,
  })
})

const getAllReviews = catchAsync(async (req, res) => {
  const result = await ReviewService.getAllReviews(req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result,
  })
})

const getSingleReview = catchAsync(async (req, res) => {
  const id = req.params.id
  const result = await ReviewService.getSingleReview(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review retrieved successfully',
    data: result,
  })
})

const deleteReview = catchAsync(async (req, res) => {
  const id = req.params.id
  await ReviewService.deleteReview(id)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Review deleted successfully',
  })
})

const getReviewsByDriver = catchAsync(async (req, res) => {
  const driverId = req.params.driverId
  const result = await ReviewService.getReviewsByDriver(driverId, req.query)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Driver reviews retrieved successfully',
    data: result,
  })
})

export const ReviewController = {
  createReview,
  getAllReviews,
  getSingleReview,
  deleteReview,
  getReviewsByDriver,
}
