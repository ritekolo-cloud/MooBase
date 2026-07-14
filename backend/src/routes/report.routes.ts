import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT, requireRole(['manager']));

router.get('/summary', ReportController.getSummary);
router.get('/milk-production', ReportController.getMilkProduction);
router.get('/health-status', ReportController.getHealthStatus);
router.get('/vaccination-status', ReportController.getVaccinationStatus);

export default router;
