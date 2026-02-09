// @ts-nocheck
/**
 * Authentication Controller
 * Handles user authentication, registration, and profile management
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { generateToken, generateRefreshToken, AuthRequest } from '../middleware/auth.js';

/**
 * User login
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    console.log(`[Auth] Login attempt for: ${email}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) {
      console.log(`[Auth] User not found: ${email}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    if (!user.passwordHash) {
      console.log(`[Auth] User has no password hash: ${email}`);
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Verify password
    console.log(`[Auth] Verifying password for: ${email}, hash exists: ${!!user.passwordHash}, hash length: ${user.passwordHash.length}`);
    const isValid = await bcrypt.compare(password, user.passwordHash);
    console.log(`[Auth] Password valid: ${isValid} for: ${email}`);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || undefined,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Log the login
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { ip: req.ip, userAgent: req.headers['user-agent'] },
      },
    });

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Login failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * User registration
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name, organizationId } = req.body;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Email already registered',
          code: 'EMAIL_EXISTS',
        },
      });
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        organizationId: organizationId || null,
        role: 'USER',
      },
      include: { organization: true },
    });

    // Generate tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || undefined,
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Log the registration
    await prisma.auditLog.create({
      data: {
        action: 'REGISTER',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { ip: req.ip },
      },
    });

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Registration failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    // Find user (don't reveal if email exists)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: resetTokenHash,
          resetTokenExpires: resetExpires,
        },
      });

      // Log the password reset request
      await prisma.auditLog.create({
        data: {
          action: 'PASSWORD_RESET_REQUEST',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          details: { ip: req.ip },
        },
      });

      // In a real application, send email with reset link containing resetToken
      // For development, log the token
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Auth] Password reset token for ${email}: ${resetToken}`);
      }
    }

    // Always return success to prevent email enumeration
    return res.json({
      success: true,
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Password reset request failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Token and password are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: resetTokenHash,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid or expired reset token',
          code: 'INVALID_TOKEN',
        },
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    // Log the password reset
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { ip: req.ip },
      },
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Password reset failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'NOT_FOUND',
        },
      });
    }

    const { passwordHash, resetToken, resetTokenExpires, ...userWithoutSensitive } = user;

    return res.json({
      success: true,
      data: userWithoutSensitive,
    });
  } catch (error) {
    console.error('[Auth] Get current user error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get user',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const { name, email } = req.body;

    // If email is being changed, check it's not taken
    if (email && email !== req.user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Email already in use',
            code: 'EMAIL_EXISTS',
          },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        updatedAt: new Date(),
      },
      include: { organization: true },
    });

    // Log the profile update
    await prisma.auditLog.create({
      data: {
        action: 'PROFILE_UPDATE',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { fields: Object.keys(req.body) },
      },
    });

    const { passwordHash, resetToken, resetTokenExpires, ...userWithoutSensitive } = user;

    return res.json({
      success: true,
      data: userWithoutSensitive,
    });
  } catch (error) {
    console.error('[Auth] Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Profile update failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Change password for authenticated user
 * PUT /api/auth/change-password
 */
export async function changePassword(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Current password and new password are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user || !user.passwordHash) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'NOT_FOUND',
        },
      });
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Current password is incorrect',
          code: 'INVALID_PASSWORD',
        },
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      },
    });

    // Log the password change
    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_CHANGE',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        details: { ip: req.ip },
      },
    });

    return res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('[Auth] Change password error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Password change failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Refresh token is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Import verifyToken from auth middleware
    const { verifyToken } = await import('../middleware/auth.js');
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired refresh token',
          code: 'INVALID_TOKEN',
        },
      });
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    // Generate new tokens
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId || undefined,
    };

    const accessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('[Auth] Refresh token error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Token refresh failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}

/**
 * Logout - invalidate tokens (optional - for token blacklisting)
 * POST /api/auth/logout
 */
export async function logout(req: AuthRequest, res: Response) {
  try {
    if (req.user) {
      // Log the logout
      await prisma.auditLog.create({
        data: {
          action: 'LOGOUT',
          entityType: 'User',
          entityId: req.user.id,
          userId: req.user.id,
          details: { ip: req.ip },
        },
      });
    }

    // In a more complete implementation, you would blacklist the token here
    // For now, just return success and let the client remove the token

    return res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('[Auth] Logout error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Logout failed',
        code: 'INTERNAL_ERROR',
      },
    });
  }
}
