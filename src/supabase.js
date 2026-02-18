import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL: Supabase environment variables are missing! The app will fail to load.");
}

if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
    console.warn("Supabase Anon Key format is invalid. Please check your .env file.");
}

export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }) } }; // Dummy for safety
