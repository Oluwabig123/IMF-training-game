// Supabase Configuration
// Supports Vercel Environment Variables or fallback constants
const SUPABASE_URL = (typeof window !== 'undefined' && window.env && window.env.SUPABASE_URL) 
  ? window.env.SUPABASE_URL 
  : "https://vhzygggxylsljersydvw.supabase.co";

const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.env && window.env.SUPABASE_ANON_KEY) 
  ? window.env.SUPABASE_ANON_KEY 
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoenlnZ2d4eWxzbGplcnN5ZHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTE2NDEsImV4cCI6MjEwNDc4NzY0MX0.-ODoeUX0qUeUyeIKtGCDCKvZs-JBKzZr1jYiATelOio";

// Moderator PIN code to clear/reset leaderboard
const ADMIN_PIN = "IMF2026game";

