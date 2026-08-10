import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { PaymentService } from "./payment.service";
import { StatusCodes } from "http-status-codes";
import sendResponse from "../../../shared/sendResponse";
import handleStripeWebhook from "../../../stripe/handleStripeWebhook";

const createCheckoutSession = catchAsync(async (req: Request, res: Response) => {
  const { amount } = req.body; // User should provide amount or it should be fetched based on referenceId
  const result = await PaymentService.creatSession(req.user!, req.params.referenceId as string, amount);

  res.status(StatusCodes.OK).json({ url: result.url })

})


// create payment
export const createPaymentController = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const payment = await PaymentService.createPayment(payload);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Payment created successfully',
    data: payment,
  });
});

// get payments
export const getPaymentsController = catchAsync(async (req: Request, res: Response) => {
  const payments = await PaymentService.getPayments(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payments retrieved successfully',
    data: payments.data,
    meta: payments.meta,
  });
});

// get payment by id
export const getPaymentByIdController = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const payment = await PaymentService.getPaymentById(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment retrieved successfully',
    data: payment,
  });
});



export const PaymentController = {
  createCheckoutSession,
  createPaymentController,
  getPaymentsController,
  getPaymentByIdController,
  handleStripeWebhook,
}
