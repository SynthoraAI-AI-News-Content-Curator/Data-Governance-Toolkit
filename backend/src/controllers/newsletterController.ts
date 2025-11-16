import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Simple in-memory storage for demo - should use database in production
const subscribers = new Set<string>();

export const subscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    subscribers.add(email);

    logger.info(`New newsletter subscription: ${email}`);

    // In production, integrate with Resend API here
    // await resend.contacts.create({
    //   email,
    //   audienceId: process.env.RESEND_AUDIENCE_ID
    // });

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
    });
  } catch (error) {
    next(error);
  }
};

export const unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    subscribers.delete(email);

    logger.info(`Newsletter unsubscribe: ${email}`);

    res.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
    });
  } catch (error) {
    next(error);
  }
};
