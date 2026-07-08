const nodemailer = require('nodemailer');

/**
 * Lazily-created, cached nodemailer transporter.
 *
 * Configuration comes from environment variables (see backend/.env.example):
 *   EMAIL_SERVICE  - e.g. "gmail" (optional convenience shortcut used by nodemailer)
 *   EMAIL_HOST     - SMTP host (used when EMAIL_SERVICE is not set)
 *   EMAIL_PORT     - SMTP port (default 587)
 *   EMAIL_USER     - SMTP username / from address
 *   EMAIL_PASSWORD - SMTP password / app password
 *   EMAIL_FROM     - Optional friendly "from" header, defaults to EMAIL_USER
 */
let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { EMAIL_SERVICE, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;

  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    console.warn('⚠️ EMAIL_USER / EMAIL_PASSWORD are not configured. Emails will be logged to the console instead of being sent.');
    return null;
  }

  const transportConfig = EMAIL_SERVICE
    ? { service: EMAIL_SERVICE, auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD } }
    : {
        host: EMAIL_HOST || 'smtp.gmail.com',
        port: Number(EMAIL_PORT) || 587,
        secure: Number(EMAIL_PORT) === 465,
        auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD }
      };

  cachedTransporter = nodemailer.createTransport(transportConfig);
  return cachedTransporter;
}

/**
 * Send an email. Falls back to console logging if SMTP isn't configured
 * (e.g. local development) so the rest of the flow can still be exercised.
 */
async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`📧 [MAIL - NOT SENT, NO SMTP CONFIGURED] To: [EMAIL_HIDDEN] | Subject: ${subject}`);
    return { simulated: true };
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    console.log(`📧 Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
}

/**
 * Send the "your password has been reset" email used by the student
 * portal's forgot-password flow (and reusable for other roles).
 */
async function sendPasswordResetEmail({
  to,
  name,
  resetLink
}) {

  const displayName = name || "Student";

  const subject = "Reset your GOODSYNK ERP password";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">

      <h2 style="color:#4f46e5">
          GOODSYNK ERP
      </h2>

      <p>Hello <strong>${displayName}</strong>,</p>

      <p>
      We received a request to reset your password.
      </p>

      <p>
      Click the button below to create a new password.
      </p>

      <div style="margin:30px 0">

          <a
              href="${resetLink}"
              style="
                  background:#4f46e5;
                  color:white;
                  padding:14px 28px;
                  text-decoration:none;
                  border-radius:6px;
                  display:inline-block;
                  font-weight:bold;
              "
          >
              Reset Password
          </a>

      </div>

      <p>
      This link will expire in
      <strong>30 minutes</strong>.
      </p>

      <p>
      If you did not request this reset,
      simply ignore this email.
      </p>

      <hr>

      <small style="color:#888">
      GOODSYNK ERP
      </small>

  </div>
  `;

  const text = `
Hello ${displayName}

Reset your password here:

${resetLink}

This link expires in 30 minutes.
`;

  return sendMail({
      to,
      subject,
      html,
      text
  });

}

module.exports = {
  sendMail,
  sendPasswordResetEmail
};
