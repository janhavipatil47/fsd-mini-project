import express, { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { ReadingAnalytics } from '../models/ReadingAnalytics.model';

const router = express.Router();

router.get(
  '/:userId',
  [
    param('userId').isString().notEmpty(),
    query('clubId').optional().isString(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { clubId } = req.query;

      const filter: any = { userId };
      if (clubId) filter.clubId = clubId;

      const analytics = await ReadingAnalytics.find(filter)
        .sort({ lastActivity: -1 })
        .limit(50);

      res.json({
        success: true,
        data: analytics,
        count: analytics.length
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/',
  [
    body('userId').isString().notEmpty(),
    body('clubId').isString().notEmpty(),
    body('bookId').isString().notEmpty(),
    body('readingSpeed').optional().isNumeric(),
    body('avgSessionDuration').optional().isNumeric(),
    body('totalReadingTime').optional().isNumeric(),
    body('completionRate').optional().isNumeric().custom((value) => value >= 0 && value <= 100),
    body('sessionsCount').optional().isInt({ min: 0 }),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, clubId, bookId, ...analyticsData } = req.body;

      const analytics = await ReadingAnalytics.findOneAndUpdate(
        { userId, clubId, bookId },
        {
          $set: {
            ...analyticsData,
            lastActivity: new Date()
          },
          $inc: { sessionsCount: 1 }
        },
        { new: true, upsert: true }
      );

      res.status(201).json({
        success: true,
        data: analytics,
        message: 'Analytics updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:userId/summary',
  [
    param('userId').isString().notEmpty(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;

      const summary = await ReadingAnalytics.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalBooks: { $sum: 1 },
            avgReadingSpeed: { $avg: '$readingSpeed' },
            avgCompletionRate: { $avg: '$completionRate' },
            totalReadingTime: { $sum: '$totalReadingTime' },
            totalSessions: { $sum: '$sessionsCount' }
          }
        }
      ]);

      res.json({
        success: true,
        data: summary[0] || {
          totalBooks: 0,
          avgReadingSpeed: 0,
          avgCompletionRate: 0,
          totalReadingTime: 0,
          totalSessions: 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
