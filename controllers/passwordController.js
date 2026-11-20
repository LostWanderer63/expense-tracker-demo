const bcrypt = require("bcrypt");
const { validate: isUuid } = require("uuid");
const { sequelize } = require("../config/db");
const { User, ForgotPasswordRequest } = require("../models");
const env = require("../config/env");
const emailService = require("../services/emailService");
const logger = require("../utils/logger");
const { logError } = logger;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const RESET_LINK_TTL_MS = env.resetLinkTtlMinutes * 60 * 1000;
const RESET_LINK_TTL_TEXT =
  env.resetLinkTtlMinutes % 60 === 0
    ? `${env.resetLinkTtlMinutes / 60} hour${env.resetLinkTtlMinutes === 60 ? "" : "s"}`
    : `${env.resetLinkTtlMinutes} minutes`;

// Same reply whether or not the email is registered, so this route
// can't be used to find out which emails have accounts.
const GENERIC_REPLY = "If an account exists for that email, a reset link has been sent.";

function appUrl() {
  return env.appUrl;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function isUsable(request) {
  return (
    request &&
    request.isActive &&
    Date.now() - new Date(request.createdAt).getTime() < RESET_LINK_TTL_MS
  );
}

function page(title, body, script = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | Expense Tracker</title>
  <link rel="stylesheet" href="/css/auth.css" />
</head>
<body>
  <main class="auth-card">
${body}
  </main>${script ? `\n  <script src="${script}"></script>` : ""}
</body>
</html>`;
}

function invalidLinkPage() {
  return page(
    "Link expired",
    `    <h1 class="auth-title">Link expired</h1>
    <p class="auth-subtitle">This password reset link is invalid, has already been used, or has expired. Request a new one from the login page.</p>
    <a href="/login/login.html" class="btn-secondary">Back to login</a>`
  );
}

function resetFormPage(id) {
  return page(
    "Reset password",
    `    <h1 class="auth-title">Reset password</h1>
    <p class="auth-subtitle">Choose a new password for your account.</p>

    <form id="resetForm" data-request-id="${escapeHtml(id)}" novalidate>
      <div class="field">
        <label for="password">New password</label>
        <input type="password" id="password" name="password" autocomplete="new-password" minlength="${MIN_PASSWORD_LENGTH}" placeholder="At least ${MIN_PASSWORD_LENGTH} characters" required />
        <small class="error" data-for="password"></small>
      </div>

      <div class="field">
        <label for="confirmPassword">Confirm new password</label>
        <input type="password" id="confirmPassword" name="confirmPassword" autocomplete="new-password" placeholder="Type it again" required />
        <small class="error" data-for="confirmPassword"></small>
      </div>

      <button type="submit" class="btn" id="resetBtn">Update password</button>
      <p class="form-message" id="formMessage" role="status" aria-live="polite"></p>
    </form>

    <a href="/login/login.html" class="auth-link hidden" id="loginLink">Go to login</a>`,
    "/password/reset.js"
  );
}

async function forgotPassword(req, res) {
  const email = (req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: "Invalid email" });
  }
  if (!emailService.isConfigured()) {
    logger.error("Forgot password: BREVO_API_KEY or BREVO_SENDER_EMAIL is missing in .env");
    return res.status(503).json({ message: "Password reset is not available right now" });
  }

  let transaction;
  try {
    const user = await User.findOne({ where: { email }, attributes: ["id", "name", "email"] });

    // Only email registered users; unknown emails get the same reply.
    if (user) {
      transaction = await sequelize.transaction();
      const request = await ForgotPasswordRequest.create({ userId: user.id }, { transaction });
      await transaction.commit();

      const resetUrl = `${appUrl()}/password/resetpassword/${request.id}`;
      const name = escapeHtml(user.name);

      await emailService.sendEmail({
        to: { email: user.email, name: user.name },
        subject: "Reset your Expense Tracker password",
        html: `<p>Hi ${name},</p>
<p>We received a request to reset your Expense Tracker password. Click the link below to choose a new one:</p>
<p><a href="${resetUrl}">Reset my password</a></p>
<p>Or paste this into your browser: ${resetUrl}</p>
<p>This link works once and expires in ${RESET_LINK_TTL_TEXT}. If you didn't ask for this, you can ignore this email.</p>`,
        text:
          `Hi ${user.name},\n\nWe received a request to reset your Expense Tracker password.\n` +
          `Open this link to choose a new one:\n${resetUrl}\n\n` +
          `This link works once and expires in ${RESET_LINK_TTL_TEXT}. If you didn't ask for this, you can ignore this email.`,
      });
    }

    return res.status(200).json({ message: GENERIC_REPLY });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    logError(err, req, "Forgot password error");
    return res.status(500).json({ message: "Could not send reset email. Please try again." });
  }
}

async function showResetForm(req, res) {
  const { id } = req.params;
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");

  try {
    if (!isUuid(id)) return res.status(404).send(invalidLinkPage());

    const request = await ForgotPasswordRequest.findByPk(id, {
      attributes: ["id", "isActive", "createdAt"],
    });
    if (!isUsable(request)) return res.status(404).send(invalidLinkPage());

    return res.status(200).send(resetFormPage(request.id));
  } catch (err) {
    logError(err, req, "Show reset form error");
    return res.status(500).send(invalidLinkPage());
  }
}

async function updatePassword(req, res) {
  const { id } = req.params;
  const password = req.body.password || "";

  if (!isUuid(id)) {
    return res.status(400).json({ message: "This reset link is invalid or has expired" });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
  }

  let transaction;
  try {
    const hashed = await bcrypt.hash(password, env.bcryptSaltRounds);

    transaction = await sequelize.transaction();
    const request = await ForgotPasswordRequest.findByPk(id, {
      attributes: ["id", "userId", "isActive", "createdAt"],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!isUsable(request)) {
      await transaction.rollback();
      return res.status(400).json({ message: "This reset link is invalid or has expired" });
    }

    await User.update({ password: hashed }, { where: { id: request.userId }, transaction });
    // Deactivate this link and any other open links for the same user.
    await ForgotPasswordRequest.update(
      { isActive: false },
      { where: { userId: request.userId, isActive: true }, transaction }
    );
    await transaction.commit();

    return res.status(200).json({ message: "Password updated. You can now log in." });
  } catch (err) {
    if (transaction && !transaction.finished) await transaction.rollback();
    logError(err, req, "Update password error");
    return res.status(500).json({ message: "Could not update password. Please try again." });
  }
}

module.exports = { forgotPassword, showResetForm, updatePassword };
