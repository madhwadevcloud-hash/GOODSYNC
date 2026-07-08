const nodemailer = require('nodemailer');

/**
 * Email service for transactional emails (currently: teacher password reset).
 *
 * Configuration is read from environment variables - no secrets are hardcoded:
 *   SMTP_HOST
 *   SMTP_PORT
 *   SMTP_SECURE   ("true" for port 465, otherwise leave unset/false)
 *   SMTP_USER
 *   SMTP_PASS
 *   EMAIL_FROM    (optional, defaults to SMTP_USER)
 *   FRONTEND_URL  (used to build the reset link, e.g. https://erp.goodsynk.com)
 *
 * If SMTP credentials are not configured (e.g. local development), the
 * service falls back to logging the email content to the console instead of
 * throwing, so the rest of the flow can still be exercised without a real
 * mailbox. This mirrors how other optional integrations (Cloudinary, etc.)
 * degrade gracefully in this project when env vars are absent.
 */

let cachedTransporter = null;

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return cachedTransporter;
}

/**
 * Send a teacher password reset email containing a secure reset link.
 * @param {Object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.teacherName - Display name for greeting
 * @param {string} params.resetUrl - Fully-formed reset link (token + schoolCode)
 * @param {number} params.expiresInMinutes - Link validity window
 */
async function sendTeacherPasswordResetEmail({ to, teacherName, resetUrl, expiresInMinutes = 20 }) {
  const subject = 'Reset your Teacher Portal password';
  const greetingName = teacherName || 'there';

  const text = `Hi ${greetingName},

We received a request to reset the password for your Teacher Portal account.

Reset your password using the link below (valid for ${expiresInMinutes} minutes):
${resetUrl}

If you did not request this, you can safely ignore this email - your password will remain unchanged.

- GOODSYNK ERP`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
      <h2 style="color: #7c3aed;">Reset your password</h2>
      <p>Hi ${greetingName},</p>
      <p>We received a request to reset the password for your <strong>Teacher Portal</strong> account.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background: linear-gradient(90deg,#7c3aed,#d946ef,#3b82f6); color:#fff; padding:12px 24px;
                  border-radius: 10px; text-decoration:none; font-weight:600; display:inline-block;">
          Reset Password
        </a>
      </p>
      <p>This link is valid for <strong>${expiresInMinutes} minutes</strong>. If it expires, you can request a new one from the login page.</p>
      <p style="color:#64748b; font-size: 13px;">If you did not request this, you can safely ignore this email — your password will remain unchanged.</p>
      <p style="color:#94a3b8; font-size: 12px; margin-top: 32px;">GOODSYNK ERP</p>
    </div>
  `;

  if (!isEmailConfigured()) {
    console.warn('⚠️ [EMAIL] SMTP is not configured. Logging password reset link instead of sending an email.');
    console.warn(`⚠️ [EMAIL] To: ${to}`);
    console.warn(`⚠️ [EMAIL] Reset URL: ${resetUrl}`);
    return { success: true, simulated: true };
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html
  });

  return { success: true, simulated: false };
}

module.exports = {
  sendTeacherPasswordResetEmail,
  isEmailConfigured
};
