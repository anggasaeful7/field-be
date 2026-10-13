import { Router } from 'express';
import { listUsers, createUser } from '../controllers/users.js';
import { authenticateToken, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(authorize('admin'));

router.get('/', listUsers);
router.post('/', createUser);

export default router;
