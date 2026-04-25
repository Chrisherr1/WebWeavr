import { Router } from 'express';
import reconRouter from './recon.js';

const router = Router();

router.use('/recon', reconRouter);

export default router;
