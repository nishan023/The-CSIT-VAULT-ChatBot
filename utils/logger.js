const winston = require("winston");
const path = require("path");

// Custom colors for terminal output
const customColors = {
  error: "red bold",
  warn: "yellow bold",
  info: "cyan",
  http: "magenta",
  debug: "blue",
};

winston.addColors(customColors);

// Colorized terminal formatting
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] [${level}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// File formatting (without terminal ANSI color escape codes)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

const logger = winston.createLogger({
  // Default to 'http' so HTTP requests, info, warn, and error all show in console
  level: process.env.LOG_LEVEL || "http",
  transports: [
    // Terminal console logger
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Error file log
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
      format: fileFormat,
    }),
    // Combined file log
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
      format: fileFormat,
    }),
  ],
});

/**
 * Express middleware to log incoming HTTP requests and response times
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const statusText =
      statusCode >= 500
        ? "SERVER ERROR"
        : statusCode >= 400
        ? "CLIENT ERROR"
        : statusCode >= 300
        ? "REDIRECT"
        : "OK";

    const msg = `${method} ${originalUrl} ${statusCode} ${statusText} - ${duration}ms`;

    if (statusCode >= 500) {
      logger.error(msg);
    } else if (statusCode >= 400) {
      logger.warn(msg);
    } else {
      logger.http(msg);
    }
  });

  next();
};

module.exports = {
  logger,
  requestLogger,
};
