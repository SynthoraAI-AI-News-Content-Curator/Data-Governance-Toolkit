import { Response, NextFunction } from 'express';
import Article from '../models/Article';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { AIService } from '../services/AIService';
import { PineconeService } from '../services/PineconeService';

const aiService = new AIService();
const pineconeService = new PineconeService();

export const getArticles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const source = req.query.source as string;
    const topic = req.query.topic as string;
    const sort = req.query.sort as string || 'publishedAt';
    const order = req.query.order as string === 'asc' ? 1 : -1;

    const query: any = {};
    if (source) query.source = source;
    if (topic) query.topics = topic;

    const articles = await Article.find(query)
      .select('-content -embeddings') // Exclude large fields
      .sort({ [sort]: order })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Article.countDocuments(query);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    // Increment views
    await article.incrementViews();

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const createArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, content, url, source, topics } = req.body;

    // Generate AI summary and analysis
    const summary = await aiService.summarize(content);
    const biasAnalysis = await aiService.analyzeBias(content);
    const sentiment = await aiService.analyzeSentiment(content);

    // Generate embeddings for vector search
    const embeddings = await pineconeService.generateEmbeddings(content);

    const article = await Article.create({
      title,
      content,
      summary,
      url,
      source,
      topics,
      sentiment,
      biasAnalysis,
      qualityScore: 85, // Default, would be calculated by AI pipeline
      publishedAt: new Date(),
      embeddings,
    });

    // Store in Pinecone
    await pineconeService.upsert(article._id.toString(), embeddings, {
      title,
      source,
      topics: topics.join(','),
    });

    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const updateArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    // Delete from Pinecone
    await pineconeService.delete(req.params.id);

    res.json({
      success: true,
      message: 'Article deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const userId = req.user!._id;
    const index = article.favorites.indexOf(userId);

    if (index > -1) {
      article.favorites.splice(index, 1);
    } else {
      article.favorites.push(userId);
    }

    await article.save();

    res.json({
      success: true,
      data: {
        isFavorited: index === -1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const rateArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    await article.addRating(req.user!._id, req.body.rating);

    res.json({
      success: true,
      data: {
        average: article.ratingAverage,
        count: article.ratings.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    await article.addComment(req.user!._id, req.user!.name, req.body.content);

    const newComment = article.comments[article.comments.length - 1];

    res.status(201).json({
      success: true,
      data: newComment,
    });
  } catch (error) {
    next(error);
  }
};

export const upvoteComment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const comment = article.comments.id(req.params.commentId);

    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    const userId = req.user!._id;
    const upvoteIndex = comment.upvotes.indexOf(userId);
    const downvoteIndex = comment.downvotes.indexOf(userId);

    if (upvoteIndex > -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      comment.upvotes.push(userId);
      if (downvoteIndex > -1) {
        comment.downvotes.splice(downvoteIndex, 1);
      }
    }

    await article.save();

    res.json({
      success: true,
      data: {
        upvotes: comment.upvotes.length,
        downvotes: comment.downvotes.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRelatedArticles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 6, 20);

    // Find similar articles using Pinecone vector search
    const relatedIds = await pineconeService.findSimilar(
      article.embeddings!,
      limit + 1 // +1 to exclude the current article
    );

    const related = await Article.find({
      _id: { $in: relatedIds, $ne: article._id },
    })
      .select('title summary source topics publishedAt')
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: related,
    });
  } catch (error) {
    next(error);
  }
};

export const getBiasAnalysis = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id).select('biasAnalysis content');

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    // If no bias analysis, generate it
    if (!article.biasAnalysis) {
      article.biasAnalysis = await aiService.analyzeBias(article.content);
      await article.save();
    }

    res.json({
      success: true,
      data: article.biasAnalysis,
    });
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const article = await Article.findById(req.params.id).select('content title');

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const answer = await aiService.answerQuestion(
      article.content,
      article.title,
      req.body.question
    );

    res.json({
      success: true,
      data: {
        question: req.body.question,
        answer: answer.answer,
        confidence: answer.confidence,
        sources: answer.sources,
      },
    });
  } catch (error) {
    next(error);
  }
};
