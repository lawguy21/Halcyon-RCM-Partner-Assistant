/**
 * Authentication Routes
 * Routes for user authentication and profile management
 */

import { Router } from 'express';
import { z } from 'zod';
import * as authController from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  organizationId: z.string().uuid().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// Public Routes (No Authentication Required)
// ============================================================================

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validateRequest(loginSchema), authController.login);

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/register', validateRequest(registerSchema), authController.register);

/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refreshToken);

// ============================================================================
// Protected Routes (Authentication Required)
// ============================================================================

/**
 * GET /api/auth/me
 * Get current authenticated user's profile
 */
router.get('/me', authenticateToken, authController.getCurrentUser);

/**
 * PUT /api/auth/profile
 * Update current user's profile
 */
router.put('/profile', authenticateToken, validateRequest(updateProfileSchema), authController.updateProfile);

/**
 * PUT /api/auth/change-password
 * Change current user's password
 */
router.put('/change-password', authenticateToken, validateRequest(changePasswordSchema), authController.changePassword);

/**
 * POST /api/auth/logout
 * Logout current user (invalidate token if using blacklist)
 */
router.post('/logout', optionalAuth, authController.logout);

export { router as authRouter };
