import express from 'express'
import { ReviewController } from './review.controller'
import validateRequest from '../../middleware/validateRequest'
import { ReviewValidation } from './review.validation'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'

const router = express.Router()

router.post(
  '/',
  validateRequest(ReviewValidation.addReviewSchema),
  auth(USER_ROLES.SENDER, USER_ROLES.USER),
  ReviewController.createReview,
)

router.get('/', ReviewController.getAllReviews)
router.get('/driver/:driverId', ReviewController.getReviewsByDriver)
router.get('/:id', ReviewController.getSingleReview)
router.delete('/:id', auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), ReviewController.deleteReview)

export const ReviewRoutes = router
