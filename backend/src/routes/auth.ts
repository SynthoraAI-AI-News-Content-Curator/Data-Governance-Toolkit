import express from 'express';
import { register, login, logout, getMe, updatePassword } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, updatePasswordSchema } from '../validators/authSchemas';
import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/password', protect, validate(updatePasswordSchema), updatePassword);

export default router;
