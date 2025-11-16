import express, { Request, Response } from 'express';
import { register } from '../middleware/metrics';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

export default router;
