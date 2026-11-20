// All settings come from environment variables (.env in development,
// the host's environment in production). Nothing secret is hardcoded here.
require("dotenv").config({ quiet: true });

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is missing. Add it to .env (see .env.example).`);
  }
  return value;
}

function optional(name, fallback = "") {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

function number(name, fallback) {
  const raw = optional(name, "");
  if (raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number, got "${raw}"`);
  return value;
}

const port = number("PORT", 3000);

const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  port,
  appUrl: optional("APP_URL", `http://localhost:${port}`).replace(/\/+$/, ""),
  corsOrigin: optional("CORS_ORIGIN", ""),

  db: {
    host: optional("DB_HOST", "localhost"),
    port: number("DB_PORT", 3306),
    user: required("DB_USER"),
    // May legitimately be empty for a local MySQL with no password.
    password: process.env.DB_PASSWORD ?? "",
    name: required("DB_NAME"),
    timezone: optional("DB_TIMEZONE", ""),
  },

  jwt: {
    secret: required("JWT_SECRET"),
    expiresIn: optional("JWT_EXPIRES_IN", "1d"),
  },

  bcryptSaltRounds: number("BCRYPT_SALT_ROUNDS", 10),
  resetLinkTtlMinutes: number("RESET_LINK_TTL_MINUTES", 60),
  premiumPrice: number("PREMIUM_PRICE", 499),

  cashfree: {
    appId: optional("CASHFREE_APP_ID"),
    secretKey: optional("CASHFREE_SECRET_KEY"),
    env: optional("CASHFREE_ENV", "SANDBOX").toUpperCase(),
  },

  gemini: {
    apiKey: optional("GEMINI_API_KEY"),
    model: optional("GEMINI_MODEL", "gemini-2.5-flash"),
  },

  brevo: {
    apiKey: optional("BREVO_API_KEY"),
    apiUrl: optional("BREVO_API_URL", "https://api.brevo.com/v3/smtp/email"),
    senderEmail: optional("BREVO_SENDER_EMAIL"),
    senderName: optional("BREVO_SENDER_NAME", "Expense Tracker"),
  },

  log: {
    level: optional("LOG_LEVEL", "http"),
    dir: optional("LOG_DIR", "logs"),
  },
};

module.exports = env;
