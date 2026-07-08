export interface PasswordRuleResult {
  label: string;
  passed: boolean;
}

export interface PasswordStrengthResult {
  valid: boolean;
  rules: PasswordRuleResult[];
  score: number; // 0-5
}

/**
 * Validate password strength on the client for immediate feedback.
 * Mirrors the rules enforced server-side in utils/passwordValidator.js:
 *  - Minimum 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one number
 *  - At least one special character
 */
export function checkPasswordStrength(password: string): PasswordStrengthResult {
  const rules: PasswordRuleResult[] = [
    { label: "At least 8 characters", passed: password.length >= 8 },
    { label: "One uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter", passed: /[a-z]/.test(password) },
    { label: "One number", passed: /[0-9]/.test(password) },
    { label: "One special character", passed: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password) },
  ];

  const score = rules.filter((r) => r.passed).length;

  return {
    valid: score === rules.length,
    rules,
    score,
  };
}
