import express from 'express'
import { AuthController } from './auth.controller'
import validateRequest from '../../middleware/validateRequest'
import { AuthValidations } from './auth.validation'
import { USER_ROLES } from '../../../enum/user'
import auth, { tempAuth } from '../../middleware/auth'
import { UserValidations } from '../user/user.validation'
import fileUploadHandler from '../../middleware/fileUploadHandler'
import { getSingleFilePath } from '../../../shared/getFilePath'

const router = express.Router()

router.post(
  '/signup',
  fileUploadHandler(),
  async (req, res, next) => {
    try {
      const image = getSingleFilePath(req.files, "image");
      req.body = {
        image,
        ...req.body
      };
      next();
    } catch (error) {
      res.status(400).json({ message: "Failed to upload User Image" });
    }
  },
  validateRequest(UserValidations.userSignupSchema),
  AuthController.createUser,
)
router.post(
  '/admin-login',
  validateRequest(AuthValidations.loginZodSchema),
  AuthController.adminLogin,
)
router.post(
  '/login',
  validateRequest(AuthValidations.loginZodSchema),
  AuthController.login,
)



router.post(
  '/verify-account',
  validateRequest(AuthValidations.verifyAccountZodSchema),
  AuthController.verifyAccount,
)

router.post(
  '/custom-login',
  validateRequest(AuthValidations.loginZodSchema),
  AuthController.login,
)

router.post(
  '/forget-password',
  validateRequest(AuthValidations.forgetPasswordZodSchema),
  AuthController.forgetPassword,
)
router.post(
  '/reset-password',
  validateRequest(AuthValidations.resetPasswordZodSchema),
  AuthController.resetPassword,
)

router.post(
  '/resend-otp',

  validateRequest(AuthValidations.resendOtpZodSchema),
  AuthController.resendOtp,
)

router.post(
  '/change-password',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  validateRequest(AuthValidations.changePasswordZodSchema),
  AuthController.changePassword,
)

router.delete(
  '/delete-account',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  validateRequest(AuthValidations.deleteAccount),
  AuthController.deleteAccount,
)
router.post('/access-token', AuthController.getAccessToken)

router.post('/logout', AuthController.logOut)
export const AuthRoutes = router
