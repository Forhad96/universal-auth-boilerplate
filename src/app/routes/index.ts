import { Router } from 'express';
import { AuthRoutes } from '../module/auth/auth.route.js';
import { UploadRoutes } from '../module/upload/upload.route.js';

const router = Router();

router.use('/auth', AuthRoutes);
router.use('/upload', UploadRoutes);

export const IndexRoutes = router;
