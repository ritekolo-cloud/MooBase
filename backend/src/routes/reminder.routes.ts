import { Router } from 'express';
import { ReminderController } from '../controllers/reminder.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);
router.get('/', ReminderController.getReminders);

export default router;
