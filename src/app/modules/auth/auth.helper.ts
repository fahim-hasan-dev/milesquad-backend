import { Secret } from 'jsonwebtoken';
import { jwtHelper } from '../../../helpers/jwtHelper';
import config from '../../../config';
import { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { emailHelper } from '../../../helpers/emailHelper';
import { emailTemplate } from '../../../shared/emailTemplate';

const createToken = (authId: Types.ObjectId, role: string, name?: string, phoneOrEmail?: string, deviceToken?: string) => {
  const accessToken = jwtHelper.createToken(
    { authId, role, name, phoneOrEmail, deviceToken },
    config.jwt.jwt_secret as Secret,
    config.jwt.jwt_expire_in as string,
  );
  const refreshToken = jwtHelper.createToken(
    { authId, role, name, phoneOrEmail, deviceToken },
    config.jwt.jwt_refresh_secret as Secret,
    config.jwt.jwt_refresh_expire_in as string,
  );

  return { accessToken, refreshToken };
};

const isPasswordMatched = async (
  plainTextPassword: string,
  hashedPassword: string,
) => {
  return await bcrypt.compare(plainTextPassword, hashedPassword);
};

// Send magic link for email verification
const sendEmailVerificationMagicLink = async (
  userId: Types.ObjectId | string,
  email: string,
  name: string
) => {
  const cleanEmail = email?.trim();
  if (!cleanEmail) return;

  const token = jwtHelper.createToken(
    { authId: userId, email: cleanEmail },
    config.jwt.jwt_secret as Secret,
    '24h'
  );

  const url = `${config.frontend_url || 'http://localhost:3000'}/verify-email?token=${token}`;

  await emailHelper.sendEmail(
    emailTemplate.sendMagicLink({
      email: cleanEmail,
      name: name || 'User',
      url,
    })
  );
};

export const AuthHelper = { createToken, isPasswordMatched, sendEmailVerificationMagicLink };
