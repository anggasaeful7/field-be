import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  changePassword,
  deleteUser
} from '../controllers/users.js';
import { authenticateToken, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);
router.use(authorize('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/password', changePassword);
router.delete('/:id', deleteUser);

export default router;
