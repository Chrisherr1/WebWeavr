import { Router } from 'express';
import { getScans } from '../controllers/scansController.js';

const router = Router();

router.get('/', getScans);

export default router;
