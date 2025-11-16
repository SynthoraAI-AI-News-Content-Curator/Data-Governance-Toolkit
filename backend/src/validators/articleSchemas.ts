import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(10).max(50000),
  url: z.string().url(),
  source: z.string().min(1).max(200),
  topics: z.array(z.string()).min(1).max(5),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(10).max(50000).optional(),
  topics: z.array(z.string()).min(1).max(5).optional(),
  summary: z.string().max(1000).optional(),
});

export const rateArticleSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

export const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const askQuestionSchema = z.object({
  question: z.string().min(1).max(500),
});
