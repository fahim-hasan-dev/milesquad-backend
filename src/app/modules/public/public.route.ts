import express from 'express';
import { PublicController } from './public.controller';
import validateRequest from '../../middleware/validateRequest';
import { FaqValidations, PublicValidation } from './public.validation';
import { ADMIN_ROLES } from '../../../enum/user';
import auth from '../../middleware/auth';

const router = express.Router();

router.post(
  '/',
  auth(ADMIN_ROLES.SUPER_ADMIN,ADMIN_ROLES.SUB_ADMIN),
  validateRequest(PublicValidation.create),
  PublicController.createPublic,
);
router.get('/:type', PublicController.getAllPublics);
router.delete('/:id', PublicController.deletePublic);

router.post(
  '/contact',
  validateRequest(PublicValidation.contactZodSchema),
  PublicController.createContact,
);
router.get('/contact/all', PublicController.getAllContacts);

router.post(
  '/faq',
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validateRequest(FaqValidations.create),
  PublicController.createFaq,
);

router.patch(
  '/faq/:id',
  auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN),
  validateRequest(FaqValidations.update),
  PublicController.updateFaq,
);

router.get('/faq/single/:id', PublicController.getSingleFaq);
router.get('/faq/all', PublicController.getAllFaqs);
router.delete('/faq/:id', auth(ADMIN_ROLES.SUPER_ADMIN, ADMIN_ROLES.SUB_ADMIN), PublicController.deleteFaq);

export const PublicRoutes = router;
