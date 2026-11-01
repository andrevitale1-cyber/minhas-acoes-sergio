import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchBox } from "@/components/SearchBox";
import { displayName, useUser, useSignOut } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minhas Ações — O que está acontecendo com as minhas ações?" },
      {
        name: "description",
        content:
          "Busque ações brasileiras e internacionais e veja o que a comunidade de investidores está falando.",
      },
      { property: "og:title", content: "Minhas Ações" },
      {
        property: "og:description",
        content: "A comunidade de investidores conversando sobre cada ação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const POPULAR = ["PETR4", "VALE3", "ITUB4", "AAPL", "NVDA", "TSLA"];

function Index() {
  const user = useUser();
  const signOut = useSignOut();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-card px-6 text-foreground">
      <div className="absolute right-6 top-5 flex items-center gap-4 text-sm">
        {user ? (
          <>
            <span className="text-muted-foreground">
              Olá, <span className="font-semibold text-foreground">{displayName(user)}</span>
            </span>
            <button
              onClick={() => signOut()}
              className="font-semibold text-primary hover:opacity-80"
            >
              Sair
            </button>
          </>
        ) : (
          <Link
            to="/auth"
            search={{}}
            className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Entrar
          </Link>
        )}
      </div>
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-6xl font-semibold tracking-tight md:text-7xl">
          Minhas <span className="italic text-accent">Ações</span>
        </h1>
        <p className="mt-5 text-lg text-muted-foreground md:text-xl">
          O que está acontecendo com as minhas ações?
        </p>
        <div className="mt-10 text-left text-foreground">
          <SearchBox />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {POPULAR.map((s) => (
            <Link
              key={s}
              to="/acao/$symbol"
              params={{ symbol: s }}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {s}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
