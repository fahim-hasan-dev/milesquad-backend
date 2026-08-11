import { z } from "zod";
import { PROFILE_VERIFICATION_STATUS, USER_ROLES, USER_STATUS, VEHICLE_TYPE } from "./user.interface";

export const userSignupSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, "Full name is required"),
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.nativeEnum(USER_ROLES, {
      errorMap: () => ({ message: "Role must be user or driver" }),
    }),
    image: z.string().optional(),
    driverInfo: z.object({
      vehicleType: z.nativeEnum(VEHICLE_TYPE).optional(),
      nidFront: z.string().optional(),
      nidBack: z.string().optional(),
      drivingLicense: z.string().optional(),
      criminalReport: z.string().optional(),
    }).optional(),
  })
});

export const userLoginSchema = z.object({
  body: z.object({
    phone: z.string().min(1, "Phone number is required"),
    password: z.string().min(1, "Password is required"),
    deviceToken: z.string().optional(),
  })
});

export const userUpdateSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, "Full name is required").optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    location: z.array(z.number()).length(2).optional(),
    image: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
    verified: z.boolean().optional(),
    role: z.nativeEnum(USER_ROLES).optional(),
    driverInfo: z.object({
      vehicleType: z.nativeEnum(VEHICLE_TYPE).optional(),
      nidFront: z.string().optional(),
      nidBack: z.string().optional(),
      drivingLicense: z.string().optional(),
      criminalReport: z.string().optional(),
      profileVerification: z.nativeEnum(PROFILE_VERIFICATION_STATUS).optional(),
      rejectReason: z.string().optional(),
    }).optional(),
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  })
});

export const UserValidations = {
  userSignupSchema,
  userLoginSchema,
  userUpdateSchema,
  changePasswordSchema,
};
