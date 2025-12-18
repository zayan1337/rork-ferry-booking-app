import Constants from 'expo-constants';

// Get config from app.json extra (fallback for when Expo servers are down)
const extra = Constants.expoConfig?.extra || {};

/**
 * Centralized configuration that reads from process.env first,
 * then falls back to app.json extra config.
 * This ensures the app works even when Expo update servers are unavailable.
 */
export const config = {
  // Supabase
  SUPABASE_URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    extra.EXPO_PUBLIC_SUPABASE_URL ||
    '',
  SUPABASE_ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    extra.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    '',
  SUPABASE_SERVICE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ||
    extra.EXPO_PUBLIC_SUPABASE_SERVICE_KEY ||
    '',

  // Company
  COMPANY_NAME:
    process.env.EXPO_PUBLIC_COMPANY_NAME ||
    extra.EXPO_PUBLIC_COMPANY_NAME ||
    'Crystal Transfer Vaavu',

  // Email
  GMAIL_USER:
    process.env.EXPO_PUBLIC_GMAIL_USER || extra.EXPO_PUBLIC_GMAIL_USER || '',
  GMAIL_APP_PASSWORD:
    process.env.EXPO_PUBLIC_GMAIL_APP_PASSWORD ||
    extra.EXPO_PUBLIC_GMAIL_APP_PASSWORD ||
    '',

  // Payment URLs
  MIB_RETURN_URL:
    process.env.EXPO_PUBLIC_MIB_RETURN_URL ||
    extra.EXPO_PUBLIC_MIB_RETURN_URL ||
    'crystaltransfervaavu://payment-success',
  MIB_CANCEL_URL:
    process.env.EXPO_PUBLIC_MIB_CANCEL_URL ||
    extra.EXPO_PUBLIC_MIB_CANCEL_URL ||
    'crystaltransfervaavu://payment-cancel',
};

export default config;
