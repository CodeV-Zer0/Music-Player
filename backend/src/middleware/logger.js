import { Request, Response, NextFunction } from "express";

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.INFO;

function formatMessage(level: string, message: string, meta?: any) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level}: ${message}${metaStr}`;
}

export const logger = {
  debug: (message: string, meta?: any) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) console.log(formatMessage("DEBUG", message, meta));
  },
  info: (message: string, meta?: any) => {
    if (currentLevel <= LOG_LEVELS.INFO) console.log(formatMessage("INFO", message, meta));
  },
  warn: (message: string, meta?: any) => {
    if (currentLevel <= LOG_LEVELS.WARN) console.warn(formatMessage("WARN", message, meta));
  },
  error: (message: string, meta?: any) => {
    if (currentLevel <= LOG_LEVELS.ERROR) console.error(formatMessage("ERROR", message, meta));
  },
};

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, path, ip } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "warn" : "info";
    logger[level](`${method} ${path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
}