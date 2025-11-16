export interface Article {
  id: string;
  title: string;
  content: string;
  summary?: string;
  url: string;
  source: string;
  topics: string[];
  sentiment?: Sentiment;
  biasAnalysis?: BiasAnalysis;
  qualityScore?: number;
  publishedAt: string;
  fetchedAt: string;
  updatedAt: string;
  views: number;
  favorites: string[];
  favoritesCount?: number;
  ratings: Rating[];
  ratingAverage?: number;
  comments: Comment[];
}

export interface Sentiment {
  tone: 'positive' | 'negative' | 'neutral';
  objectivity: number;
  urgency: number;
  controversy: number;
}

export interface BiasAnalysis {
  score: number;
  indicators: string[];
  overallAssessment: string;
  recommendations?: string[];
}

export interface Rating {
  userId: string;
  rating: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  upvotes: string[];
  downvotes: string[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  favorites: string[];
  preferences: {
    theme: 'light' | 'dark';
    newsletter: boolean;
    notifications: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  pagination?: Pagination;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
