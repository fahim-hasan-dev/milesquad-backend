import { Model } from 'mongoose'
import { PUBLIC_TYPE } from '../../../enum/public'

export type IPublic = {
  content: string
  type: PUBLIC_TYPE | string
}

export interface IContact {
  name: string
  email: string
  phone?: string
  message: string
  createdAt?: Date
  updatedAt?: Date
}

export type ContactModel = Model<IContact>

export type PublicModel = Model<IPublic>

export type IFaq = {
  question: string
  answer: string
  target?: 'customer' | 'rider' | 'all'
  createdAt: Date
  updatedAt: Date
}

export type FaqModel = Model<IFaq>
