// Supabase Configuration
// Supports Vercel Environment Variables or fallback constants
const SUPABASE_URL = (typeof window !== 'undefined' && window.env && window.env.SUPABASE_URL) 
  ? window.env.SUPABASE_URL 
  : "https://vhzygggxylsljersydvw.supabase.co";

const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.env && window.env.SUPABASE_ANON_KEY) 
  ? window.env.SUPABASE_ANON_KEY 
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoenlnZ2d4eWxzbGplcnN5ZHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTE2NDEsImV4cCI6MjEwNDc4NzY0MX0.-ODoeUX0qUeUyeIKtGCDCKvZs-JBKzZr1jYiATelOio";

// Moderator PIN SHA-256 hash for reset leaderboard verification
// Password: "IMF2026game" (stored hashed so it cannot be read from sources/console)
const ADMIN_PIN_HASH = "8e950cdeddfef3ebedb8c4c79ea01db6ae1bd89e248b940428d0113f898317d7";

