const logger = require("../utils/logger");
const { logError } = logger;

function notFound(req, res) {
  logger.warn("Route not found", { method: req.method, url: req.originalUrl });
  res.status(404).json({ message: "Route not found" });
}

// Catches anything a route throws or passes to next(err), including bad JSON bodies.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  logError(err, req, status >= 500 ? "Unhandled error" : "Request error", status >= 500 ? "error" : "warn");

  if (res.headersSent) return;
  res.status(status).json({
    message: status >= 500 ? "Something went wrong. Please try again." : err.expose ? err.message : "Bad request",
  });
}

module.exports = { notFound, errorHandler };
