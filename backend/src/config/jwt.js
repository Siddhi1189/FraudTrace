// Central JWT configuration and validation (BE-AUTH-2, BE-AUTH-3)

let devWarningLogged = false;

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production environment');
    }
    if (!devWarningLogged) {
      console.warn('[SECURITY WARNING] JWT_SECRET is missing. Using development fallback secret.');
      devWarningLogged = true;
    }
    return 'dev_secret_change_in_production';
  }
  return secret;
}

export const JWT_ALGORITHM = 'HS256';
