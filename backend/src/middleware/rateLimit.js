import { Request, Response, NextFunction } from "express";

const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: { windowMs: number; max: number; message?: string } = { windowMs: 60000, max: 100 }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || "unknown";
    const now = Date.now();
    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      return res.status(429).json({
        error: options.message || "Too many requests, please try again later",
        code: "RATE_LIMITED",
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }

    record.count++;
    next();
  };
}

export function authRateLimit() {
  return rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many authentication attempts" });
}

export function apiRateLimit() {
  return rateLimit({ windowMs: 60 * 1000, max: 60 });
}