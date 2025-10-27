import express, { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate';
import { BookRecommendation } from '../models/BookRecommendation.model';

const router = express.Router();

router.get(
  '/:userId',
  [
    param('userId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      const recommendations = await BookRecommendation.find({ userId })
        .sort({ score: -1 })
        .limit(limit);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
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
    body('bookId').isString().notEmpty(),
    body('title').isString().notEmpty(),
    body('author').isString().notEmpty(),
    body('genre').isString().notEmpty(),
    body('score').isNumeric().custom((value) => value >= 0 && value <= 100),
    body('reason').isString().notEmpty(),
    body('basedOn').optional().isArray(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recommendationData = req.body;

      const recommendation = await BookRecommendation.findOneAndUpdate(
        { userId: recommendationData.userId, bookId: recommendationData.bookId },
        recommendationData,
        { new: true, upsert: true }
      );

      res.status(201).json({
        success: true,
        data: recommendation,
        message: 'Recommendation created successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:userId/by-genre',
  [
    param('userId').isString().notEmpty(),
    query('genre').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { genre } = req.query;
      const limit = parseInt(req.query.limit as string) || 10;

      const recommendations = await BookRecommendation.find({
        userId,
        genre: genre as string
      })
        .sort({ score: -1 })
        .limit(limit);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:userId/:bookId',
  [
    param('userId').isString().notEmpty(),
    param('bookId').isString().notEmpty(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, bookId } = req.params;

      const result = await BookRecommendation.findOneAndDelete({ userId, bookId });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
      }

      res.json({
        success: true,
        message: 'Recommendation deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
