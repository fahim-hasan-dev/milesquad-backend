import { z } from "zod";
import { ADMIN_ROLES, USER_STATUS } from "../../../enum/user";

export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
  })
});

export const createSubAdminSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional(),
    image: z.string().optional(),
  })
});

export const updateAdminSchema = z.object({
  body: z.object({
    fullName: z.string().optional(),
    email: z.string().email("Invalid email address").toLowerCase().trim().optional(),
    phone: z.string().optional(),
    image: z.string().optional(),
    status: z.nativeEnum(USER_STATUS).optional(),
    role: z.nativeEnum(ADMIN_ROLES).optional(),
  })
});

export const forgetPasswordAdminSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
  })
});

export const resetPasswordAdminSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").toLowerCase().trim(),
    otp: z.string().min(1, "OTP is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  })
});

export const AdminValidations = {
  adminLoginSchema,
  createSubAdminSchema,
  updateAdminSchema,
  forgetPasswordAdminSchema,
  resetPasswordAdminSchema,
};
