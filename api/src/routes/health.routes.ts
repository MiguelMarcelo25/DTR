import { Router } from 'express';
import prisma from '../config/prisma';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, message: 'HRMS API is running', data: { status: 'ok' } });
});

/** Deep health check — verifies DB connectivity (used by Render health checks). */
router.get(
  '/db',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: 'Database reachable', data: { db: 'up' } });
  }),
);

export default router;
