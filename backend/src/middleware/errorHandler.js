import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[ERROR] ${req.method} ${req.path}`, err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  if (err.name === "ValidationError") {
    return res.status(400).json({ error: err.message, code: "VALIDATION_ERROR" });
  }

  if (err.name === "UnauthorizedError" || err.message.includes("jwt")) {
    return res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
  }

  return res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    code: "INTERNAL_ERROR",
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, code: "NOT_FOUND" });
}