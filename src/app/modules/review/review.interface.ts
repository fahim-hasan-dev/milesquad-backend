import { Types } from 'mongoose'

export interface IReview {
  _id?: Types.ObjectId
  reviewId?: string
  driver: Types.ObjectId
  sender: Types.ObjectId
  parcel: Types.ObjectId
  rating: number
  comment?: string
}
