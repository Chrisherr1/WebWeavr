import { Router } from 'express';
import reconRouter from './recon.js';
import scansRouter from './scans.js';

const router = Router();

router.use('/recon', reconRouter);
router.use('/scans', scansRouter);

export default router;
