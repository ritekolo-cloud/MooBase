import { Router } from 'express';
import { CattleController } from '../controllers/cattle.controller';
import { authenticateJWT, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', CattleController.getAll);
router.get('/:id', CattleController.getById);
router.post('/', CattleController.create);
router.put('/:id', CattleController.update);
router.delete('/:id', requireRole(['manager']), CattleController.delete);

export default router;
