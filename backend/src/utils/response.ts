import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../middleware/logger.js';

export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }
      
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Request validation failed', {
          url: req.url,
          method: req.method,
          errors: validationErrors,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }
      
      next(error);
    }
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message
  };
}

export function createErrorResponse(error: string, details?: any) {
  return {
    success: false,
    error,
    details
  };
}

export function getStatusIndicator(
  status: string,
  spread?: number,
  expiresAt?: Date
): { status: 'green' | 'purple' | 'yellow' | 'red'; label: string; description: string } {
  const now = new Date();
  
  switch (status) {
    case 'ACTIVE':
      if (spread && spread > 5) {
        return {
          status: 'green' as const,
          label: 'High Profit',
          description: 'Excellent arbitrage opportunity'
        };
      } else if (spread && spread > 2) {
        return {
          status: 'purple' as const,
          label: 'Good Profit',
          description: 'Good arbitrage opportunity'
        };
      } else {
        return {
          status: 'yellow' as const,
          label: 'Low Profit',
          description: 'Low margin opportunity'
        };
      }
      
    case 'PENDING':
      return {
        status: 'yellow' as const,
        label: 'Pending',
        description: 'Waiting for execution'
      };
      
    case 'EXECUTED':
      return {
        status: 'green' as const,
        label: 'Executed',
        description: 'Successfully executed'
      };
      
    case 'EXPIRED':
      return {
        status: 'red' as const,
        label: 'Expired',
        description: 'Opportunity expired'
      };
      
    case 'FAILED':
      return {
        status: 'red' as const,
        label: 'Failed',
        description: 'Execution failed'
      };
      
    default:
      return {
        status: 'yellow' as const,
        label: 'Unknown',
        description: 'Unknown status'
      };
  }
}