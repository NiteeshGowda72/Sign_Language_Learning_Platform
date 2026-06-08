import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Google OAuth Client ID
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase configuration. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY in your .env file.'
  );
}

if (!GOOGLE_CLIENT_ID) {
  console.error(
    'Missing Google OAuth configuration. Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file.'
  );
}

// Initialize Supabase client (only if URL is provided)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Debug log
console.log("Supabase URL:", supabaseUrl ? "✓ Set" : "✗ Missing");
console.log("Supabase Key:", supabaseAnonKey ? "✓ Set" : "✗ Missing");
console.log("Google Client ID:", GOOGLE_CLIENT_ID ? "✓ Set" : "✗ Missing");
console.log("Supabase client:", supabase ? "✓ Initialized" : "✗ Not initialized");
