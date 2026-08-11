import express from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../middleware/validateRequest';
import { AuthValidations } from './auth.validation';
import { USER_ROLES } from '../../../enum/user';
import auth from '../../middleware/auth';
import { UserValidations } from '../user/user.validation';
import fileUploadHandler from '../../middleware/fileUploadHandler';
import { getSingleFilePath } from '../../../shared/getFilePath';

const router = express.Router();

router.post(
  '/signup',
  fileUploadHandler(),
  async (req, res, next) => {
    try {
      if (req.files) {
        const image = getSingleFilePath(req.files, "image");
        if (image) req.body.image = image;
      }
      next();
    } catch (error) {
      res.status(400).json({ message: "Failed to upload image" });
    }
  },
  validateRequest(UserValidations.userSignupSchema),
  AuthController.createUser,
);

router.post(
  '/login',
  validateRequest(AuthValidations.loginZodSchema),
  AuthController.login,
);

router.post(
  '/verify-account',
  validateRequest(AuthValidations.verifyAccountZodSchema),
  AuthController.verifyAccount,
);

router.post(
  '/forget-password',
  validateRequest(AuthValidations.forgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post(
  '/reset-password',
  validateRequest(AuthValidations.resetPasswordZodSchema),
  AuthController.resetPassword,
);

router.post(
  '/resend-otp',
  validateRequest(AuthValidations.resendOtpZodSchema),
  AuthController.resendOtp,
);

router.post(
  '/change-password',
  auth(USER_ROLES.USER, USER_ROLES.DRIVER),
  validateRequest(AuthValidations.changePasswordZodSchema),
  AuthController.changePassword,
);

router.delete(
  '/delete-account',
  auth(USER_ROLES.USER, USER_ROLES.DRIVER),
  validateRequest(AuthValidations.deleteAccount),
  AuthController.deleteAccount,
);

router.post('/access-token', AuthController.getAccessToken);
router.post('/logout', AuthController.logOut);

export const AuthRoutes = router;
