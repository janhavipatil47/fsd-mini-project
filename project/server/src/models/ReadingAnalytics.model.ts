import mongoose, { Schema, Document } from 'mongoose';

export interface IReadingAnalytics extends Document {
  userId: string;
  clubId: string;
  bookId: string;
  readingSpeed: number; // pages per day
  avgSessionDuration: number; // minutes
  totalReadingTime: number; // minutes
  completionRate: number; // percentage
  sessionsCount: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingAnalyticsSchema = new Schema<IReadingAnalytics>(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    clubId: {
      type: String,
      required: true,
      index: true
    },
    bookId: {
      type: String,
      required: true,
      index: true
    },
    readingSpeed: {
      type: Number,
      default: 0,
      min: 0
    },
    avgSessionDuration: {
      type: Number,
      default: 0,
      min: 0
    },
    totalReadingTime: {
      type: Number,
      default: 0,
      min: 0
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    sessionsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
ReadingAnalyticsSchema.index({ userId: 1, clubId: 1 });
ReadingAnalyticsSchema.index({ userId: 1, bookId: 1 });
ReadingAnalyticsSchema.index({ createdAt: -1 });

export const ReadingAnalytics = mongoose.model<IReadingAnalytics>('ReadingAnalytics', ReadingAnalyticsSchema);
