import { z } from 'zod'
import { PUBLIC_TYPE } from '../../../enum/public'

const contactZodSchema = z.object({
  body: z.object({
    name: z.string({
      required_error: 'Name is required',
    }),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email format'),
    phone: z.string().optional(),
    message: z.string({
      required_error: 'Message is required',
    }),
  }),
})

export const PublicValidation = {
  create: z.object({
    body: z.object({
      content: z.string({ required_error: 'Content is required' }),
      type: z.nativeEnum(PUBLIC_TYPE, {
        errorMap: () => ({ message: 'Invalid public content type' }),
      }),
    }),
  }),

  update: z.object({
    body: z.object({
      content: z.string({ required_error: 'Content is required' }),
      type: z.nativeEnum(PUBLIC_TYPE, {
        errorMap: () => ({ message: 'Invalid public content type' }),
      }),
    }),
  }),
  contactZodSchema,
}

export const FaqValidations = {
  create: z.object({
    body: z.object({
      question: z.string({ required_error: 'Question is required' }),
      answer: z.string({ required_error: 'Answer is required' }),
      target: z.enum(['customer', 'rider', 'all']).optional(),
    }),
  }),

  update: z.object({
    body: z.object({
      question: z.string().optional(),
      answer: z.string().optional(),
      target: z.enum(['customer', 'rider', 'all']).optional(),
    }),
  }),
}
