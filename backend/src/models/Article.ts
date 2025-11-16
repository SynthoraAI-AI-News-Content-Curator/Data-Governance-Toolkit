import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISentiment {
  tone: 'positive' | 'negative' | 'neutral';
  objectivity: number;
  urgency: number;
  controversy: number;
}

export interface IBiasAnalysis {
  score: number;
  indicators: string[];
  overallAssessment: string;
  recommendations?: string[];
}

export interface IRating {
  userId: mongoose.Types.ObjectId;
  rating: number;
  createdAt: Date;
}

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName?: string;
  content: string;
  upvotes: mongoose.Types.ObjectId[];
  downvotes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

export interface IArticle extends Document {
  title: string;
  content: string;
  summary?: string;
  url: string;
  source: string;
  topics: string[];
  sentiment?: ISentiment;
  biasAnalysis?: IBiasAnalysis;
  qualityScore?: number;
  publishedAt?: Date;
  fetchedAt: Date;
  updatedAt: Date;
  views: number;
  favorites: mongoose.Types.ObjectId[];
  ratings: IRating[];
  comments: IComment[];
  embeddings?: number[];
}

const SentimentSchema = new Schema<ISentiment>({
  tone: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    required: true
  },
  objectivity: { type: Number, min: 0, max: 100, required: true },
  urgency: { type: Number, min: 0, max: 100, required: true },
  controversy: { type: Number, min: 0, max: 100, required: true },
}, { _id: false });

const BiasAnalysisSchema = new Schema<IBiasAnalysis>({
  score: { type: Number, min: 0, max: 100, required: true },
  indicators: [{ type: String }],
  overallAssessment: { type: String, required: true },
  recommendations: [{ type: String }],
}, { _id: false });

const RatingSchema = new Schema<IRating>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const CommentSchema = new Schema<IComment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  content: { type: String, required: true, maxlength: 2000 },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  downvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const ArticleSchema = new Schema<IArticle>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
    index: 'text'
  },
  content: {
    type: String,
    required: true,
    index: 'text'
  },
  summary: {
    type: String,
    index: 'text'
  },
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    index: true
  },
  topics: [{
    type: String,
    index: true
  }],
  sentiment: SentimentSchema,
  biasAnalysis: BiasAnalysisSchema,
  qualityScore: {
    type: Number,
    min: 0,
    max: 100,
    index: true
  },
  publishedAt: {
    type: Date,
    index: true
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  views: {
    type: Number,
    default: 0,
    index: true
  },
  favorites: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  ratings: [RatingSchema],
  comments: [CommentSchema],
  embeddings: [{ type: Number }],
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
ArticleSchema.index({ source: 1, fetchedAt: -1 });
ArticleSchema.index({ topics: 1, publishedAt: -1 });
ArticleSchema.index({ qualityScore: -1 });
ArticleSchema.index({ 'sentiment.objectivity': 1 });
ArticleSchema.index({ title: 'text', content: 'text', summary: 'text' }, {
  weights: { title: 3, summary: 2, content: 1 }
});

// Virtual for rating average
ArticleSchema.virtual('ratingAverage').get(function() {
  if (this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
  return sum / this.ratings.length;
});

// Virtual for favorites count
ArticleSchema.virtual('favoritesCount').get(function() {
  return this.favorites.length;
});

// Pre-save hook
ArticleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods
ArticleSchema.methods.incrementViews = async function() {
  this.views += 1;
  return this.save();
};

ArticleSchema.methods.addRating = async function(userId: mongoose.Types.ObjectId, rating: number) {
  const existingRatingIndex = this.ratings.findIndex(
    r => r.userId.toString() === userId.toString()
  );

  if (existingRatingIndex !== -1) {
    this.ratings[existingRatingIndex].rating = rating;
  } else {
    this.ratings.push({ userId, rating, createdAt: new Date() });
  }

  return this.save();
};

ArticleSchema.methods.addComment = async function(
  userId: mongoose.Types.ObjectId,
  userName: string,
  content: string
) {
  this.comments.push({
    userId,
    userName,
    content,
    upvotes: [],
    downvotes: [],
    createdAt: new Date(),
  });

  return this.save();
};

const Article: Model<IArticle> = mongoose.model<IArticle>('Article', ArticleSchema);

export default Article;
