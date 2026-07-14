import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';
import { syncLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.use(authenticateJWT);

router.post('/push', syncLimiter, SyncController.push);
router.get('/pending', requireRole(['manager']), SyncController.getPending);
router.post('/resolve', requireRole(['manager']), SyncController.resolve);

export default router;
