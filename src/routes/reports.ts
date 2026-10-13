import { Router } from 'express';
import {
  listReports,
  createReport,
  updateReport,
  updateReportStatus
} from '../controllers/reports.js';
import { authenticateToken, authorize } from '../middlewares/auth.js';

const router = Router();

router.use(authenticateToken);

router.get('/', listReports);
router.post('/', authorize('pelapor', 'admin'), createReport);
router.put('/:id', authorize('pelapor', 'admin'), updateReport);
router.patch('/:id/status', authorize('approver', 'admin'), updateReportStatus);

export default router;
