import mongoose, { Schema } from "mongoose"
import { IReview } from "./review.interface"
import { getNextCustomId } from "../counter/counter.model"

const ReviewSchema = new mongoose.Schema<IReview>({
  reviewId: {
    type: String,
    unique: true,
    sparse: true,
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parcel: {
    type: Schema.Types.ObjectId,
    ref: 'Parcel',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
  comment: {
    type: String
  },
}, {
  timestamps: true,
})

ReviewSchema.pre("save", async function (next) {
  if (!this.reviewId) {
    this.reviewId = await getNextCustomId("REV")
  }
  next()
})

export const Review = mongoose.model<IReview>('Review', ReviewSchema)
