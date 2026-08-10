import { Types } from 'mongoose'

export interface IReview {
  _id?: Types.ObjectId
  driver: Types.ObjectId
  sender: Types.ObjectId
  parcel: Types.ObjectId
  rating: number
  comment?: string
}
