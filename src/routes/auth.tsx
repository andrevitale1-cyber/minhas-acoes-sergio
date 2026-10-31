import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — Minhas Ações" },
      { name: "description", content: "Entre com seu e-mail para avaliar e publicar sobre ações." },
      { property: "og:title", content: "Entrar — Minhas Ações" },
      { property: "og:description", content: "Entre para participar da comunidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha inválidos.");
      else navigate({ to: safeNext });
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + safeNext },
      });
      setMsg(error ? error.message : "Conta criada! Confirme pelo link enviado ao seu e-mail.");
    }
    setLoading(false);
  };

  return (
    <main className="bg-hero flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 text-card-foreground shadow-search">
        <Link to="/" className="font-display text-2xl font-semibold">
          Minhas <span className="italic text-primary">Ações</span>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "in" ? "Entre para avaliar e publicar." : "Crie sua conta com e-mail."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha"
            className="w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:border-ring" />
          <button disabled={loading} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
            {mode === "in" ? "Entrar" : "Criar conta"}
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-sm font-semibold text-primary">
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
