import { Schema, model } from 'mongoose'
import { ContactModel, FaqModel, IContact, IFaq, IPublic, PublicModel } from './public.interface'
import { PUBLIC_TYPE } from '../../../enum/public'

const publicSchema = new Schema<IPublic, PublicModel>(
  {
    content: { type: String, required: true },
    type: { type: String, enum: Object.values(PUBLIC_TYPE), required: true },
  },
  {
    timestamps: true,
  },
)

export const Public = model<IPublic, PublicModel>('Public', publicSchema)

const faqSchema = new Schema<IFaq, FaqModel>(
  {
    question: { type: String },
    answer: { type: String },
    target: { type: String, enum: ['customer', 'rider', 'all'], default: 'all' },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  {
    timestamps: true,
  },
)


export const Faq = model<IFaq, FaqModel>('Faq', faqSchema)


const contactSchema = new Schema<IContact, ContactModel>(
  {
    name: { type: String },
    email: { type: String },
    phone: { type: String, optional: true },
    message: { type: String },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  {
    timestamps: true,
  },
)

export const Contact = model<IContact, ContactModel>('Contact', contactSchema)
