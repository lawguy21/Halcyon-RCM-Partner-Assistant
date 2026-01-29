/**
 * Authentication Middleware
 * JWT-based authentication and authorization for API routes
 */

import { Request, Response, NextFunction } from 'express';
import pkg from 'jsonwebtoken';
const { sign, verify, TokenExpiredError } = pkg;

// JWT secret - MUST be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is not set. ' +
    'This is required for secure authentication. ' +
    'Set JWT_SECRET to a strong, random secret (min 32 characters).'
  );
}

/**
 * Extended Request interface that includes authenticated user information
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    organizationId?: string;
  };
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware that requires valid JWT authentication
 * Extracts token from Authorization header (Bearer scheme)
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
    });
  }

  try {
    const decoded = verify(token, JWT_SECRET) as JWTPayload;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId,
    };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED',
        },
      });
    }
    return res.status(403).json({
      success: false,
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      },
    });
  }
}

/**
 * Middleware factory that requires specific role(s)
 * Must be used after authenticateToken middleware
 * @param roles - Array of allowed roles
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  };
}

/**
 * Middleware that optionally authenticates if a token is present
 * Allows requests without token but attaches user if token is valid
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = verify(token, JWT_SECRET) as JWTPayload;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        organizationId: decoded.organizationId,
      };
    } catch {
      // Token invalid, but continue without user
      // This is intentional for optional auth
    }
  }

  next();
}

/**
 * Middleware that requires user to belong to a specific organization
 * Must be used after authenticateToken middleware
 * @param orgIdParam - Request parameter name containing organization ID (default: 'organizationId')
 */
export function requireOrganization(orgIdParam: string = 'organizationId') {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
      });
    }

    const requestedOrgId = req.params[orgIdParam] || req.body[orgIdParam];

    // Admin users can access any organization
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // Regular users can only access their own organization
    if (req.user.organizationId !== requestedOrgId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have access to this organization',
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  };
}

/**
 * Generate a JWT token for a user
 * @param payload - User data to include in token
 * @param expiresIn - Token expiration time (default: '7d')
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '7d'): string {
  return sign(payload, JWT_SECRET, { expiresIn: expiresIn as pkg.SignOptions['expiresIn'] });
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Generate a refresh token with longer expiration
 * @param payload - User data to include in token
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return sign(payload, JWT_SECRET, { expiresIn: '30d' as pkg.SignOptions['expiresIn'] });
}
