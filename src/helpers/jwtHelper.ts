import jwt, { JwtPayload, Secret } from 'jsonwebtoken'

const createToken = (
  payload: string | object | Buffer,
  secret: Secret,
  expireTime: string
) => {
  return jwt.sign(payload, secret, { expiresIn: expireTime } as jwt.SignOptions);
}
const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token);
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as JwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}


const verifyToken = (token: string, secret: Secret) => {
  console.log({token, secret})
  return jwt.verify(token, secret) as JwtPayload
}

export const jwtHelper = { createToken, verifyToken }
