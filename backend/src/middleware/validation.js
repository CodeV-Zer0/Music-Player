import { Request, Response, NextFunction } from "express";

export function validateBody(schema: Record<string, { required?: boolean; type?: string; minLength?: number; maxLength?: number }>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be a ${rules.type}`);
        }
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors, code: "VALIDATION_ERROR" });
    }

    next();
  };
}

export function validateQuery(schema: Record<string, { required?: boolean; type?: string }>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.query[field];

      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(`Query parameter ${field} is required`);
      }

      if (value !== undefined && rules.type === "number" && isNaN(Number(value))) {
        errors.push(`Query parameter ${field} must be a number`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors, code: "VALIDATION_ERROR" });
    }

    next();
  };
}