import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secure-jwt-secret-change-this';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as string;

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: JWTPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN as `${number}` | `${number}ms` | `${number}s` | `${number}m` | `${number}h` | `${number}d`
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const generateRefreshToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d' // Refresh tokens last longer
  });
};
