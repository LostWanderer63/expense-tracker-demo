// Application logger. Everything is written to files under LOG_DIR:
//   error.log    - errors only
//   combined.log - every level (info, warn, error, HTTP requests)
//   exceptions.log / rejections.log - crashes the app didn't catch
// Files rotate at 5 MB, keeping the last 5 of each.
const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");
const env = require("../config/env");

const logDir = path.resolve(__dirname, "..", env.log.dir);
fs.mkdirSync(logDir, { recursive: true });

const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json()
);

function file(name, level) {
  return new transports.File({
    filename: path.join(logDir, name),
    level,
    maxsize: 5 * 1024 * 1024,
    maxFiles: 5,
    tailable: true,
  });
}

const logger = createLogger({
  level: env.log.level,
  format: fileFormat,
  transports: [file("error.log", "error"), file("combined.log")],
  exceptionHandlers: [file("exceptions.log")],
  rejectionHandlers: [file("rejections.log")],
  exitOnError: true,
});

// Also print to the terminal outside production.
if (env.nodeEnv !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp({ format: "HH:mm:ss" }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} ${level}: ${stack || message}${extra}`;
        })
      ),
    })
  );
}

// For morgan: send each HTTP access line to the log files.
logger.httpStream = {
  write: (line) => logger.http(line.trim()),
};

/**
 * Log an error with request context (method, URL, user). Used in controller catch blocks.
 */
logger.logError = function logError(err, req, message, level = "error") {
  logger.log(level, message, {
    error: err?.message || String(err),
    stack: err?.stack,
    method: req?.method,
    url: req?.originalUrl,
    userId: req?.user?.id,
  });
};

module.exports = logger;
