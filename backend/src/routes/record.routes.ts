import { Router } from 'express';
import { RecordController } from '../controllers/record.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJWT);

// Health records
router.post('/health', RecordController.createHealth);
router.get('/health/:cattleId', RecordController.getHealthByCattle);
router.put('/health/:id', RecordController.updateHealth);
router.delete('/health/:id', RecordController.deleteHealth);

// Vaccination records
router.post('/vaccination', RecordController.createVaccination);
router.get('/vaccination/:cattleId', RecordController.getVaccinationByCattle);
router.put('/vaccination/:id', RecordController.updateVaccination);
router.delete('/vaccination/:id', RecordController.deleteVaccination);

// Milk Production records
router.post('/milk', RecordController.createMilk);
router.get('/milk/:cattleId', RecordController.getMilkByCattle);
router.put('/milk/:id', RecordController.updateMilk);
router.delete('/milk/:id', RecordController.deleteMilk);

// Breeding records
router.post('/breeding', RecordController.createBreeding);
router.get('/breeding/:cattleId', RecordController.getBreedingByCattle);
router.put('/breeding/:id', RecordController.updateBreeding);
router.delete('/breeding/:id', RecordController.deleteBreeding);

// Feeding records
router.post('/feeding', RecordController.createFeeding);
router.get('/feeding/:cattleId', RecordController.getFeedingByCattle);
router.put('/feeding/:id', RecordController.updateFeeding);
router.delete('/feeding/:id', RecordController.deleteFeeding);

// Generic record delete endpoint for clients that store record type separately
router.delete('/records/:type/:id', RecordController.deleteByType);

export default router;
