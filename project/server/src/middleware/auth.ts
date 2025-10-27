import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided. Please login first.'
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user to request
    req.user = decoded;
    
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token'
    });
  }
};

// Middleware to check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
    return;
  }
  next();
};

// Middleware to check if user is owner or admin
export const isOwnerOrAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const requestedUserId = req.params.userId;
  
  if (req.user?.userId !== requestedUserId && req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data.'
    });
    return;
  }
  next();
};
