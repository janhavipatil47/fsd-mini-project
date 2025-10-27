import mongoose, { Schema, Document } from 'mongoose';

export interface IBookRecommendation extends Document {
  userId: string;
  bookId: string;
  title: string;
  author: string;
  genre: string;
  score: number;
  reason: string;
  basedOn: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BookRecommendationSchema = new Schema<IBookRecommendation>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    bookId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    author: {
      type: String,
      required: true
    },
    genre: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    reason: {
      type: String,
      required: true
    },
    basedOn: [{
      type: String
    }]
  },
  {
    timestamps: true
  }
);

BookRecommendationSchema.index({ userId: 1, score: -1 });
BookRecommendationSchema.index({ userId: 1, bookId: 1 }, { unique: true });

export const BookRecommendation = mongoose.model<IBookRecommendation>('BookRecommendation', BookRecommendationSchema);
