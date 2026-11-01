import { createContext, useContext, type ReactNode } from "react";
import { ClerkProvider, useClerk, useUser as useClerkUser } from "@clerk/tanstack-react-start";
import { ptBR } from "@clerk/localizations";
import { communityAvailable } from "@/lib/backend-config";

type AppUser = { id: string; name: string };
const SessionContext = createContext<{ user: AppUser | null; signOut: () => Promise<void> }>({
  user: null,
  signOut: async () => {},
});
function SessionBridge({ children }: { children: ReactNode }) {
  const { user } = useClerkUser();
  const { signOut } = useClerk();
  const value = user
    ? {
        id: user.id,
        name:
          user.fullName ||
          user.username ||
          user.primaryEmailAddress?.emailAddress.split("@")[0] ||
          "Investidor",
      }
    : null;
  return (
    <SessionContext.Provider value={{ user: value, signOut: () => signOut() }}>
      {children}
    </SessionContext.Provider>
  );
}
export function SessionProvider({ children }: { children: ReactNode }) {
  if (!communityAvailable) return children;
  return (
    <ClerkProvider localization={ptBR} signInUrl="/auth" signUpUrl="/auth?mode=up">
      <SessionBridge>{children}</SessionBridge>
    </ClerkProvider>
  );
}
export const useUser = () => useContext(SessionContext).user;
export const useSignOut = () => useContext(SessionContext).signOut;
export const displayName = (user: AppUser) => user.name;
