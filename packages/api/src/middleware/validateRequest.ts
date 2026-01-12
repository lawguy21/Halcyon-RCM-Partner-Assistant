/**
 * Request Validation Middleware
 * Uses Zod schemas for request body validation
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory that validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        });
      }
      // If it's not a ZodError, pass to the next error handler
      next(error);
    }
  };
}

/**
 * Middleware factory that validates request query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid query parameters',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware factory that validates request params against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid path parameters',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((err) => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
        });
      }
      next(error);
    }
  };
}
