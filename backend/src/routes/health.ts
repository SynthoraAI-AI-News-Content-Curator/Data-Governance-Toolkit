import express, { Request, Response } from 'express';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: await checkDatabase(),
      memory: checkMemory(),
    },
  };

  const allHealthy = Object.values(health.checks).every((c: any) => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json(health);
});

async function checkDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      return { status: 'ok', message: 'Database connected' };
    }
    return { status: 'error', message: 'Database not connected' };
  } catch (error: any) {
    return { status: 'error', message: error.message };
  }
}

function checkMemory() {
  const { heapUsed, heapTotal, external, rss } = process.memoryUsage();
  const usage = {
    heapUsed: `${Math.round(heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(external / 1024 / 1024)}MB`,
    rss: `${Math.round(rss / 1024 / 1024)}MB`,
  };

  return {
    status: heapUsed / heapTotal < 0.9 ? 'ok' : 'warning',
    usage,
  };
}

export default router;
