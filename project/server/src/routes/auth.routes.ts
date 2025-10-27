import express, { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { User } from '../models/User.model';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// POST /api/auth/register - Register new user
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('fullName')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, fullName } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email 
            ? 'Email already registered' 
            : 'Username already taken'
        });
      }

      // Create new user
      const user = new User({
        username,
        email,
        password,
        fullName,
        role: 'member'
      });

      await user.save();

      // Generate tokens
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      const refreshToken = generateRefreshToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            avatar: user.avatar
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

// POST /api/auth/login - Login user
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user and include password
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      const refreshToken = generateRefreshToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      });

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            avatar: user.avatar,
            lastLogin: user.lastLogin
          },
          token,
          refreshToken
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/auth/profile - Update user profile
router.put(
  '/profile',
  [
    authenticate,
    body('fullName').optional().trim().isLength({ max: 100 }),
    body('bio').optional().trim().isLength({ max: 500 }),
    body('avatar').optional().isURL(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { fullName, bio, avatar } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user?.userId,
        {
          $set: {
            fullName,
            bio,
            avatar
          }
        },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          bio: user.bio,
          avatar: user.avatar,
          role: user.role
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

// PUT /api/auth/change-password - Change password
router.put(
  '/change-password',
  [
    authenticate,
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user?.userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      return next(error);
    }
  }
);

// GET /api/auth/users - Get all users (Admin only)
router.get('/users', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/auth/users/:userId - Delete user (Admin only)
router.delete('/users/:userId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const user = await User.findByIdAndDelete(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
