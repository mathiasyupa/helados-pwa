export const BUSINESS_NAME  = process.env.BUSINESS_NAME  ?? 'Heladería El Paraíso';
export const STAMPS_REQUIRED = parseInt(process.env.STAMPS_REQUIRED ?? '10', 10);
export const REWARD_TEXT     = process.env.REWARD_TEXT     ?? '1 helado doble gratis 🍦';
// In production ADMIN_PASSWORD must be set explicitly — no default.
export const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD
  ?? (process.env.NODE_ENV === 'production' ? '' : 'admin123');
export const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
// Max stamps the cashier can grant in a single QR
export const MAX_GRANT_STAMPS = parseInt(process.env.MAX_GRANT_STAMPS ?? '5', 10);
