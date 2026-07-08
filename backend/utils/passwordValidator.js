/**
 * Shared password strength validator.
 * Used by the Forgot/Reset Password flow (and reusable elsewhere).
 *
 * Rules enforced:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one number
 *  - At least one special character
 */

const MIN_LENGTH = 8;

/**
 * Validate password strength.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }

  if (password.length < MIN_LENGTH) {
    return { valid: false, message: `Password must be at least ${MIN_LENGTH} characters long.` };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one uppercase letter.' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must include at least one lowercase letter.' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must include at least one number.' };
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return { valid: false, message: 'Password must include at least one special character.' };
  }

  return { valid: true, message: 'Password meets strength requirements.' };
}

module.exports = { validatePasswordStrength, MIN_LENGTH };
