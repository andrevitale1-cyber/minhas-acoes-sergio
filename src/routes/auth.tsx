import { createFileRoute, Link } from "@tanstack/react-router";
import { SignIn, SignUp } from "@clerk/tanstack-react-start";
import { z } from "zod";
import { communityAvailable } from "@/lib/backend-config";
export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional(), mode: z.enum(["in", "up"]).optional() }),
  head: () => ({ meta: [{ title: "Entrar — Minhas Ações" }] }),
  component: AuthPage,
});
function AuthPage() {
  const { next, mode } = Route.useSearch();
  const safeNext = next && /^\/(?![\\/])/.test(next) ? next : "/";
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <Link to="/" className="font-display text-2xl font-semibold">
        Minhas Ações
      </Link>
      {communityAvailable ? (
        mode === "up" ? (
          <SignUp
            routing="hash"
            signInUrl={`/auth?next=${encodeURIComponent(safeNext)}`}
            forceRedirectUrl={safeNext}
          />
        ) : (
          <SignIn
            routing="hash"
            signUpUrl={`/auth?mode=up&next=${encodeURIComponent(safeNext)}`}
            forceRedirectUrl={safeNext}
          />
        )
      ) : (
        <p>O cadastro está em preparação.</p>
      )}
      <Link to="/" className="text-sm font-semibold text-primary">
        Voltar à busca
      </Link>
    </main>
  );
}
