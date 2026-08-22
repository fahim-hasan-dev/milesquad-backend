import { z } from 'zod';
import { USER_ROLES } from '../../../enum/user';
import { VEHICLE_TYPE } from '../../../enum/parcel';

const loginZodSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone number is required'),
    password: z.string().min(1, 'Password is required'),
    deviceToken: z.string().optional(),
  }),
});

const createUserZodSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.nativeEnum(USER_ROLES).optional(),
    image: z.string().optional(),
    driverInfo: z.object({
      vehicleType: z.nativeEnum(VEHICLE_TYPE).optional(),
      nidFront: z.string().optional(),
      nidBack: z.string().optional(),
      drivingLicense: z.string().optional(),
      criminalReport: z.string().optional(),
    }).optional(),
  }),
});

const verifyAccountZodSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone number is required'),
    oneTimeCode: z.string().min(1, 'OTP is required'),
  }),
});

const forgetPasswordZodSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone number is required'),
  }),
});

const resetPasswordZodSchema = z.object({
  query: z.object({
    token: z.string().optional(),
  }).optional(),
  body: z.object({
    token: z.string().optional(),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Confirm password must be at least 6 characters'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"],
  }),
});

const resendOtpZodSchema = z.object({
  body: z.object({
    phone: z.string().min(1, 'Phone number is required'),
  }),
});

const changePasswordZodSchema = z.object({
  body: z.object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  }),
});

const deleteAccountZodSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});

export const AuthValidations = {
  loginZodSchema,
  createUserZodSchema,
  verifyAccountZodSchema,
  forgetPasswordZodSchema,
  resetPasswordZodSchema,
  resendOtpZodSchema,
  changePasswordZodSchema,
  deleteAccount: deleteAccountZodSchema,
};
