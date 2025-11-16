import express from 'express';
import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleFavorite,
  rateArticle,
  addComment,
  upvoteComment,
  getRelatedArticles,
  getBiasAnalysis,
  askQuestion,
} from '../controllers/articleController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createArticleSchema,
  updateArticleSchema,
  rateArticleSchema,
  addCommentSchema,
  askQuestionSchema,
} from '../validators/articleSchemas';

const router = express.Router();

// Public routes
router.get('/', getArticles);
router.get('/:id', getArticle);
router.get('/:id/related', getRelatedArticles);
router.get('/:id/bias', getBiasAnalysis);

// Protected routes (require authentication)
router.post('/:id/favorite', protect, toggleFavorite);
router.post('/:id/rate', protect, validate(rateArticleSchema), rateArticle);
router.post('/:id/comment', protect, validate(addCommentSchema), addComment);
router.post('/:id/comment/:commentId/upvote', protect, upvoteComment);
router.post('/:id/qa', protect, validate(askQuestionSchema), askQuestion);

// Admin routes
router.post('/', protect, authorize('admin'), validate(createArticleSchema), createArticle);
router.put('/:id', protect, authorize('admin'), validate(updateArticleSchema), updateArticle);
router.delete('/:id', protect, authorize('admin'), deleteArticle);

export default router;
