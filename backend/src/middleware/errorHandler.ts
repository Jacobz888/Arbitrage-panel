import { Request, Response, NextFunction } from 'express';
import { logger } from './logger.js';
import * as Sentry from '@sentry/node';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error details
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    statusCode: error.statusCode,
    code: error.code,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Send error to Sentry if configured
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: {
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params
      }
    });
  }

  // Determine status code
  const statusCode = error.statusCode || 500;
  
  // Prepare error response
  const errorResponse: any = {
    success: false,
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.url
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      stack: error.stack,
      code: error.code,
      isOperational: error.isOperational
    };
  }

  // Include specific error codes for client-side handling
  if (error.code) {
    errorResponse.code = error.code;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new CustomError(`Route ${req.originalUrl} not found`, 404);
  next(error);
}

export function asyncErrorHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}