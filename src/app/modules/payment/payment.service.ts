import QueryBuilder from "../../builder/QueryBuilder";
import { IPayment } from "./payment.interface";
import { Payment } from "./payment.model";
import { createPaymentSession } from "../../../stripe/createPaymentSession";
import config from "../../../config";
import { JwtPayload } from "jsonwebtoken";

// Create seassion
const creatSession = async (user: JwtPayload, referenceId: string, amount: number) => {
  const url = await createPaymentSession(user, amount, referenceId);

  return { url }
}

// create payment
const createPayment = async (payload: Partial<IPayment>) => {
  const payment = await Payment.create(payload);
  return payment;
};

// get payments
const getPayments = async (query: Record<string, unknown>) => {
  const paymentQueryBuilder = new QueryBuilder(Payment.find(), query)
    .filter()
    .sort()
    .paginate();

  const payments = await paymentQueryBuilder.modelQuery;
  const paginationInfo = await paymentQueryBuilder.getPaginationInfo();

  return {
    data: payments,
    meta: paginationInfo,
  };
};

// get payment by id
const getPaymentById = async (id: string) => {
  return await Payment.findById(id).populate('referenceId');
};

export const PaymentService = {
  creatSession,
  createPayment,
  getPayments,
  getPaymentById,
}
