import { StatusCodes } from 'http-status-codes'
import { IPlan } from './plan.interface'
import { Plan } from './plan.model'
import mongoose from 'mongoose'
import ApiError from '../../../errors/ApiError'
import { Subscription } from '../subscription/subscription.model'
import { JwtPayload } from 'jsonwebtoken'
import { createStripeProductCatalog } from '../../../stripe/createStripeProductCatalog'
import { deleteStripeProductCatalog } from '../../../stripe/deleteStripeProductCatalog'
import { createCheckoutSession } from '../../../stripe/createCheckoutSession'
import config from '../../../config'

// Create plan in DB
const createPlanToDB = async (payload: IPlan): Promise<IPlan | null> => {
  // Create Strike Product and Price
  const stripeData = await createStripeProductCatalog(payload);

  if (stripeData) {
    payload.productId = stripeData.productId;
    payload.priceId = stripeData.priceId;
  }

  const result = await Plan.create(payload)
  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to created Package')
  }

  return result
}

const creatSession = async (user: JwtPayload, planId: string) => {
  const url = await createCheckoutSession(user, planId);
  return { url }
}

// Update plan in DB
const updatePlanToDB = async (
  id: string,
  payload: Partial<IPlan>,
): Promise<IPlan | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ID')
  }

  const existingPlan = await Plan.findById(id)
  if (!existingPlan) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Plan not found')
  }

  // Note: Stripe product updates are limited, usually we just update the DB
  // or create a new price if the price changes.

  const result = await Plan.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true },
  )

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update plan in DB')
  }

  return result
}

// Get plan from DB
const getPlanFromDB = async (paymentType: string) => {
  const query: any = {
    status: 'Active',
  }
  if (paymentType) {
    query.paymentType = paymentType
  }
  const result = await Plan.find(query)
  const activeSubscriptions = await Subscription.countDocuments({
    status: 'active',
  })
  const expiredSubscriptions = await Subscription.countDocuments({
    status: 'expired',
  })
  const failedSubscriptions = await Subscription.countDocuments({
    status: 'cancel',
  })

  return {
    plans: result,
    meta: {
      activeSubscriptions,
      expiredSubscriptions,
      failedSubscriptions,
    },
  }
}

// Get plan details from DB
const getPlanDetailsFromDB = async (id: string): Promise<IPlan | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ID')
  }
  return await Plan.findById(id)
}

// Delete plan from DB
const deletePlanToDB = async (id: string): Promise<IPlan | null> => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid ID')
  }

  const isExist = await Plan.findById(id)
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Plan not found')
  }

  if (isExist.productId) {
    await deleteStripeProductCatalog(isExist.productId);
  }

  const result = await Plan.findByIdAndUpdate(
    { _id: id },
    { status: 'Delete' },
    { new: true },
  )

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to deleted Package')
  }

  return result
}

export const PackageService = {
  createPlanToDB,
  updatePlanToDB,
  getPlanFromDB,
  getPlanDetailsFromDB,
  deletePlanToDB,
  creatSession,
}
