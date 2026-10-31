import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { communityAvailable } from "@/lib/backend-config";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!communityAvailable) return;
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  return user;
}

export function displayName(user: User) {
  return (user.user_metadata?.['full_name'] as string) || user.email?.split("@")[0] || "Investidor";
}
