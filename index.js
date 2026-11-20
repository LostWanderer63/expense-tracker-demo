let env;
try {
  env = require("./config/env");
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const logger = require("./utils/logger");
const { initDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const premiumRoutes = require("./routes/premiumRoutes");
const passwordRoutes = require("./routes/passwordRoutes");
const noteRoutes = require("./routes/noteRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

if (env.nodeEnv === "production") app.set("trust proxy", 1);

app.use(cors(env.corsOrigin ? { origin: env.corsOrigin.split(",").map((o) => o.trim()) } : {}));
// HTTP access log -> logs/combined.log (static files skipped). Registered first so
// requests that fail early (bad JSON) are logged too.
app.use(
  morgan(":remote-addr :method :url :status :res[content-length] - :response-time ms", {
    stream: logger.httpStream,
    skip: (req) => /\.(css|js|map|png|jpe?g|svg|ico|woff2?)$/.test(req.path),
  })
);
app.use(express.json());

app.get("/", (req, res) => res.redirect("/login/login.html"));
app.use(express.static(path.join(__dirname, "frontend")));

app.use("/user", userRoutes);
app.use("/expense", expenseRoutes);
app.use("/purchase", purchaseRoutes);
app.use("/premium", premiumRoutes);
app.use("/password", passwordRoutes);
app.use("/notes", noteRoutes);

app.use(notFound);
app.use(errorHandler);

// Flush log files before the process exits (hosts send SIGTERM on redeploy).
function shutdown(server, signal) {
  logger.info(`${signal} received, shutting down`);
  const exit = () => {
    logger.on("finish", () => process.exit(0));
    logger.end();
  };
  if (server) server.close(exit);
  else exit();
  setTimeout(() => process.exit(0), 5000).unref();
}

initDB()
  .then(() => {
    const server = app.listen(env.port, () =>
      logger.info(`Server running on port ${env.port} (${env.nodeEnv})`)
    );
    for (const signal of ["SIGTERM", "SIGINT"]) process.once(signal, () => shutdown(server, signal));
  })
  .catch((err) => {
    logger.error("Failed to connect to MySQL", { error: err.message });
    // Let the file transport flush before exiting.
    logger.on("finish", () => process.exit(1));
    logger.end();
  });
