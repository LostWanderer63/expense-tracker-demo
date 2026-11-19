const { User } = require("../models");
const emailService = require("../services/emailService");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same reply whether or not the email is registered, so this route
// can't be used to find out which emails have accounts.
const GENERIC_REPLY = "If an account exists for that email, a reset link has been sent.";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
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
    console.error("Forgot password: BREVO_API_KEY or BREVO_SENDER_EMAIL is missing in .env");
    return res.status(503).json({ message: "Password reset is not available right now" });
  }

  try {
    const user = await User.findOne({ where: { email }, attributes: ["id", "name", "email"] });

    // Only email registered users; unknown emails get the same reply.
    if (user) {
      const name = escapeHtml(user.name);
      // Dummy email for now; the real reset link comes in the next step.
      await emailService.sendEmail({
        to: { email: user.email, name: user.name },
        subject: "Reset your Expense Tracker password",
        html: `<p>Hi ${name},</p>
<p>We received a request to reset your Expense Tracker password.</p>
<p>This is a test email. Password reset links are coming soon.</p>
<p>If you didn't ask for this, you can ignore this email.</p>`,
        text:
          `Hi ${user.name},\n\nWe received a request to reset your Expense Tracker password.\n` +
          "This is a test email. Password reset links are coming soon.\n\n" +
          "If you didn't ask for this, you can ignore this email.",
      });
    }

    return res.status(200).json({ message: GENERIC_REPLY });
  } catch (err) {
    console.error("Forgot password error:", err.message || err);
    return res.status(500).json({ message: "Could not send reset email. Please try again." });
  }
}

module.exports = { forgotPassword };
