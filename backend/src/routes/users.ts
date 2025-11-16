import express from 'express';
import { getUser, updateUser, deleteUser, getFavorites } from '../controllers/userController';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../validators/userSchemas';

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/favorites', getFavorites);
router.get('/:id', getUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
