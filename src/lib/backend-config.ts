// The original backend is optional while Clerk and Render are being connected.
export const communityAvailable = Boolean(
  import.meta.env["VITE_SUPABASE_URL"] && import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
);
