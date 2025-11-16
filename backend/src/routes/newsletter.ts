import express from 'express';
import { subscribe, unsubscribe } from '../controllers/newsletterController';
import { validate } from '../middleware/validate';
import { subscribeSchema } from '../validators/newsletterSchemas';

const router = express.Router();

router.post('/subscribe', validate(subscribeSchema), subscribe);
router.post('/unsubscribe', validate(subscribeSchema), unsubscribe);

export default router;
