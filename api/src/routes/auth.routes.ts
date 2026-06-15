import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { authLimiter } from '../middlewares/rateLimit';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validations/auth.validation';
import {
  loginController,
  registerController,
  refreshController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  meController,
} from '../controllers/auth.controller';

const router = Router();

router.post('/login', authLimiter, validate({ body: loginSchema }), loginController);
router.post('/register', authLimiter, validate({ body: registerSchema }), registerController);
router.post('/refresh-token', validate({ body: refreshSchema }), refreshController);
router.post('/logout', logoutController);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), forgotPasswordController);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), resetPasswordController);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), changePasswordController);
router.get('/me', authenticate, meController);

export default router;
