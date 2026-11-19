const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 10000;

function isConfigured() {
  return Boolean(process.env.BREVO_API_KEY && process.env.BREVO_SENDER_EMAIL);
}

/**
 * Send a transactional email through Brevo (formerly Sendinblue).
 * Throws if Brevo rejects the request.
 */
async function sendEmail({ to, subject, html, text }) {
  const res = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME || "Expense Tracker",
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
