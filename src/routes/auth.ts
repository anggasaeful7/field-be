import { Router } from 'express';
import { login, me } from '../controllers/auth.js';
import { authenticateToken } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, me);

export default router;
