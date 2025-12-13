/**
 * Development Configuration
 * 
 * Set IS_DEV to true during development to allow gmail.com emails.
 * Set to false in production to only allow @std.iyte.edu.tr emails.
 */

export const IS_DEV = false;

// Valid email domains
export const STUDENT_EMAIL_DOMAIN = '@std.iyte.edu.tr';
export const DEV_EMAIL_DOMAINS = ['@gmail.com', '@std.iyte.edu.tr'];

/**
 * Check if an email is valid for the app
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }
  
  const emailLower = email.toLowerCase().trim();
  
  if (IS_DEV) {
    // In dev mode, allow gmail and student emails
    return DEV_EMAIL_DOMAINS.some(domain => emailLower.endsWith(domain));
  } else {
    // In production, only allow student emails
    return emailLower.endsWith(STUDENT_EMAIL_DOMAIN);
  }
}

/**
 * Get the expected email domain for display
 */
export function getExpectedDomain(): string {
  if (IS_DEV) {
    return '@std.iyte.edu.tr veya @gmail.com (dev)';
  }
  return STUDENT_EMAIL_DOMAIN;
}

