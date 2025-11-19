import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from './logger.js';

export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message || 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      
      res.status(429).json({
        success: false,
        error: message || 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests, please try again later.'
);

export const scanRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  5, // 5 scans per minute
  'Too many scan requests, please wait before scanning again.'
);

export const seedRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  3, // 3 seed requests per 5 minutes
  'Too many seed requests, please wait before seeding again.'
);