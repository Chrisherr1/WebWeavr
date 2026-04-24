import { Router } from 'express';
import { scan } from '../controllers/reconController.js';

const router = Router();

router.get('/', scan);

export default router;
