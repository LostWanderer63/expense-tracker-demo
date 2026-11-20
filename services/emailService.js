const env = require("../config/env");

const TIMEOUT_MS = 10000;

function isConfigured() {
  return Boolean(env.brevo.apiKey && env.brevo.senderEmail);
}

/**
 * Send a transactional email through Brevo (formerly Sendinblue).
 * Throws if Brevo rejects the request.
 */
async function sendEmail({ to, subject, html, text }) {
  const res = await fetch(env.brevo.apiUrl, {
    method: "POST",
    headers: {
      "api-key": env.brevo.apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: env.brevo.senderEmail,
        name: env.brevo.senderName,
      },
      to: [{ email: to.email, name: to.name }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Brevo ${res.status}: ${body.message || "request failed"}`);
  }
  return body.messageId;
}

module.exports = { sendEmail, isConfigured };
