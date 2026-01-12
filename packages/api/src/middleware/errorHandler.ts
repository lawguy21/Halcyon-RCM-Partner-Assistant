/**
 * Error handling middleware
 * Includes handlers for Prisma-specific errors
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

/**
 * Main error handler middleware
 */
export function errorHandler(
  err: ApiError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('API Error:', err);

  // Handle Prisma errors
  if (isPrismaError(err)) {
    const prismaResponse = handlePrismaError(err);
    res.status(prismaResponse.statusCode).json({
      success: false,
      error: {
        message: prismaResponse.message,
        code: prismaResponse.code,
        ...(process.env.NODE_ENV === 'development' && {
          details: prismaResponse.details,
        }),
      },
    });
    return;
  }

  // Handle custom API errors
  const apiError = err as ApiError;
  const statusCode = apiError.statusCode || 500;
  const message = apiError.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: apiError.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: apiError.details,
      }),
    },
  });
}

/**
 * Check if error is a Prisma error
 */
function isPrismaError(
  err: unknown
): err is
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientValidationError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientInitializationError {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError
  );
}

/**
 * Handle Prisma-specific errors and return appropriate HTTP response
 */
function handlePrismaError(err: unknown): {
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
} {
  // PrismaClientKnownRequestError - database constraint violations, not found, etc.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      // Unique constraint violation
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') || 'field';
        return {
          statusCode: 409,
          message: `A record with this ${target} already exists`,
          code: 'DUPLICATE_ENTRY',
          details: { fields: err.meta?.target },
        };
      }

      // Record not found
      case 'P2025':
        return {
          statusCode: 404,
          message: 'Record not found',
          code: 'NOT_FOUND',
          details: err.meta,
        };

      // Foreign key constraint violation
      case 'P2003': {
        const field = err.meta?.field_name || 'reference';
        return {
          statusCode: 400,
          message: `Invalid reference: ${field} does not exist`,
          code: 'INVALID_REFERENCE',
          details: err.meta,
        };
      }

      // Required field missing
      case 'P2011': {
        const constraint = err.meta?.constraint || 'field';
        return {
          statusCode: 400,
          message: `Required field is missing: ${constraint}`,
          code: 'MISSING_REQUIRED_FIELD',
          details: err.meta,
        };
      }

      // Value too long for column
      case 'P2000':
        return {
          statusCode: 400,
          message: 'Value is too long for the database field',
          code: 'VALUE_TOO_LONG',
          details: err.meta,
        };

      // Record to update not found
      case 'P2016':
        return {
          statusCode: 404,
          message: 'Record to update not found',
          code: 'UPDATE_NOT_FOUND',
          details: err.meta,
        };

      // Record to delete not found
      case 'P2015':
        return {
          statusCode: 404,
          message: 'Record to delete not found',
          code: 'DELETE_NOT_FOUND',
          details: err.meta,
        };

      // Invalid value for type
      case 'P2006':
        return {
          statusCode: 400,
          message: 'Invalid value provided for field',
          code: 'INVALID_VALUE',
          details: err.meta,
        };

      // Transaction failed
      case 'P2034':
        return {
          statusCode: 500,
          message: 'Database transaction failed. Please retry.',
          code: 'TRANSACTION_FAILED',
          details: err.meta,
        };

      // Default for other known errors
      default:
        return {
          statusCode: 500,
          message: 'Database operation failed',
          code: `PRISMA_${err.code}`,
          details: { code: err.code, meta: err.meta },
        };
    }
  }

  // PrismaClientValidationError - invalid query construction
  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      message: 'Invalid query parameters',
      code: 'VALIDATION_ERROR',
      details: err.message,
    };
  }

  // PrismaClientUnknownRequestError - unexpected database error
  if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      statusCode: 500,
      message: 'An unexpected database error occurred',
      code: 'DATABASE_ERROR',
      details: err.message,
    };
  }

  // PrismaClientInitializationError - connection issues
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: 503,
      message: 'Database connection failed. Please try again later.',
      code: 'DATABASE_UNAVAILABLE',
      details: err.message,
    };
  }

  // Fallback for any other Prisma errors
  return {
    statusCode: 500,
    message: 'An unexpected database error occurred',
    code: 'UNKNOWN_DATABASE_ERROR',
    details: err instanceof Error ? err.message : String(err),
  };
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';

  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error implements ApiError {
  statusCode = 400;
  code = 'VALIDATION_ERROR';
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  code = 'UNAUTHORIZED';

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements ApiError {
  statusCode = 403;
  code = 'FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ConflictError';
    this.details = details;
  }
}

export class DatabaseError extends Error implements ApiError {
  statusCode = 500;
  code = 'DATABASE_ERROR';
  details: unknown;

  constructor(message = 'Database operation failed', details?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.details = details;
  }
}

export class ServiceUnavailableError extends Error implements ApiError {
  statusCode = 503;
  code = 'SERVICE_UNAVAILABLE';

  constructor(message = 'Service temporarily unavailable') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}
