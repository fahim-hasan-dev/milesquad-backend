import { z } from 'zod'

const addReviewSchema = z.object({
  body: z.object({
    parcelId: z.string({ required_error: 'Parcel ID is required' }),
    rating: z
      .number()
      .min(1, 'Rating must be at least 1')
      .max(5, 'Rating must be at most 5'),
    comment: z.string().optional(),
  }),
})

export const ReviewValidation = {
  addReviewSchema,
}
