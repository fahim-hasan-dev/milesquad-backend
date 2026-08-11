import express from 'express';
import { ReviewController } from './review.controller';
import validateRequest from '../../middleware/validateRequest';
import { ReviewValidation } from './review.validation';
import auth from '../../middleware/auth';
import { ADMIN_ROLES, USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.post(
  '/',
  validateRequest(ReviewValidation.addReviewSchema),
  auth(USER_ROLES.USER),
  ReviewController.createReview,
);

router.get('/', ReviewController.getAllReviews);
router.get('/driver/:driverId', ReviewController.getReviewsByDriver);
router.get('/:id', ReviewController.getSingleReview);
router.delete('/:id', auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN), ReviewController.deleteReview);

export const ReviewRoutes = router;
