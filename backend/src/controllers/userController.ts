import { Response, NextFunction } from 'express';
import User from '../models/User';
import Article from '../models/Article';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../utils/AppError';

export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Users can only view their own profile
    if (req.user!._id.toString() !== user._id.toString() && req.user!.role !== 'admin') {
      throw new AppError('Not authorized to view this profile', 403);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Users can only update their own profile
    if (req.user!._id.toString() !== user._id.toString()) {
      throw new AppError('Not authorized to update this profile', 403);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Users can only delete their own account
    if (req.user!._id.toString() !== user._id.toString() && req.user!.role !== 'admin') {
      throw new AppError('Not authorized to delete this account', 403);
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!._id).populate('favorites');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const favorites = await Article.find({
      _id: { $in: user.favorites },
    })
      .select('title summary source topics publishedAt')
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    next(error);
  }
};
