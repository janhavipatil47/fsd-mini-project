import express, { Request, Response, NextFunction } from 'express';
import { param } from 'express-validator';
import { validate } from '../middleware/validate';
import { ReadingAnalytics } from '../models/ReadingAnalytics.model';
import { BookRecommendation } from '../models/BookRecommendation.model';

const router = express.Router();

router.get('/global', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [analyticsCount, recommendationsCount, topReaders] = await Promise.all([
      ReadingAnalytics.countDocuments(),
      BookRecommendation.countDocuments(),
      ReadingAnalytics.aggregate([
        {
          $group: {
            _id: '$userId',
            totalReadingTime: { $sum: '$totalReadingTime' },
            booksRead: { $sum: 1 },
            avgCompletionRate: { $avg: '$completionRate' }
          }
        },
        { $sort: { totalReadingTime: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalAnalytics: analyticsCount,
        totalRecommendations: recommendationsCount,
        topReaders: topReaders.map((reader, index) => ({
          rank: index + 1,
          userId: reader._id,
          totalReadingTime: Math.round(reader.totalReadingTime),
          booksRead: reader.booksRead,
          avgCompletionRate: Math.round(reader.avgCompletionRate * 100) / 100
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/club/:clubId',
  [
    param('clubId').isString().notEmpty(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { clubId } = req.params;

      const clubStats = await ReadingAnalytics.aggregate([
        { $match: { clubId } },
        {
          $group: {
            _id: null,
            totalMembers: { $addToSet: '$userId' },
            totalBooks: { $addToSet: '$bookId' },
            avgReadingSpeed: { $avg: '$readingSpeed' },
            avgCompletionRate: { $avg: '$completionRate' },
            totalReadingTime: { $sum: '$totalReadingTime' }
          }
        },
        {
          $project: {
            _id: 0,
            totalMembers: { $size: '$totalMembers' },
            totalBooks: { $size: '$totalBooks' },
            avgReadingSpeed: { $round: ['$avgReadingSpeed', 2] },
            avgCompletionRate: { $round: ['$avgCompletionRate', 2] },
            totalReadingTime: { $round: ['$totalReadingTime', 0] }
          }
        }
      ]);

      res.json({
        success: true,
        data: clubStats[0] || {
          totalMembers: 0,
          totalBooks: 0,
          avgReadingSpeed: 0,
          avgCompletionRate: 0,
          totalReadingTime: 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trending = await ReadingAnalytics.aggregate([
      {
        $match: {
          lastActivity: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: '$bookId',
          readers: { $addToSet: '$userId' },
          avgCompletionRate: { $avg: '$completionRate' },
          totalReadingTime: { $sum: '$totalReadingTime' }
        }
      },
      {
        $project: {
          bookId: '$_id',
          readersCount: { $size: '$readers' },
          avgCompletionRate: { $round: ['$avgCompletionRate', 2] },
          totalReadingTime: { $round: ['$totalReadingTime', 0] },
          trendingScore: {
            $multiply: [
              { $size: '$readers' },
              { $divide: ['$avgCompletionRate', 10] }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: trending
    });
  } catch (error) {
    next(error);
  }
});

export default router;
