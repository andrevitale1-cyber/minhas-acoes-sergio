import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Star, MessageCircle, LogOut, ArrowLeft } from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import { findStock } from "@/lib/stocks";
import { MarketPanel } from "@/components/MarketPanel";
import { StockLogo } from "@/components/StockLogo";
import { useUser, useSignOut } from "@/hooks/use-session";
import { communityRequest, type CommunityData, type CommunityPost as Post } from "@/lib/community";
import { communityAvailable } from "@/lib/backend-config";

export const Route = createFileRoute("/acao/$symbol")({
  loader: ({ params }) => {
    const symbol = params.symbol.toUpperCase().trim();
    const stock =
      findStock(symbol) ??
      (/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)
        ? {
            symbol,
            name: symbol,
            market: /^[A-Z]{4}\d{1,2}$/.test(symbol) ? ("BR" as const) : ("US" as const),
          }
        : null);
    if (!stock) throw notFound();
    return { stock };
  },
  head: ({ loaderData }) => {
    const t = loaderData ? `${loaderData.stock.symbol} — ${loaderData.stock.name}` : "Ação";
    return {
      meta: [
        { title: `${t} | Minhas Ações` },
        { name: "description", content: `O que os investidores estão falando sobre ${t}.` },
        { property: "og:title", content: `${t} | Minhas Ações` },
        { property: "og:description", content: `Publicações da comunidade sobre ${t}.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl">Ação não encontrada</h1>
      <Link to="/" className="font-semibold text-primary">
        Voltar à busca
      </Link>
    </div>
  ),
  component: StockRoute,
});

function StockRoute() {
  const { stock } = Route.useLoaderData();
  return <StockPage key={stock.symbol} />;
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Stars({
  value,
  onPick,
  size = 20,
}: {
  value: number;
  onPick?: (n: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onMouseEnter={() => onPick && setHover(n)}
          onClick={() => onPick?.(n)}
          aria-label={`${n} estrelas`}
          className={onPick ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= Math.round(shown) ? "fill-accent text-accent" : "text-border"}
          />
        </button>
      ))}
    </div>
  );
}

function StockPage() {
  const { stock } = Route.useLoaderData();
  const user = useUser();
  const signOut = useSignOut();

  const [community, setCommunity] = useState<CommunityData>({
    posts: [],
    average: 0,
    count: 0,
    mine: null,
    hasMore: false,
  });
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!communityAvailable) return;
    const version = ++requestVersion.current;
    communityRequest(stock.symbol, "GET", undefined, page).then(
      (data) => {
        if (version === requestVersion.current) {
          setCommunity(data);
          setError(null);
        }
      },
      (err) => {
        if (version === requestVersion.current)
          setError(err instanceof Error ? err.message : "Não foi possível carregar a comunidade.");
      },
    );
    return () => {
      requestVersion.current++;
    };
  }, [stock.symbol, user?.id, page]);

  const avg = community.average;
  const mine = community.mine;
  const posts = community.posts;

  const mutate = async (data: unknown) => {
    if (!user || busy) return false;
    const version = ++requestVersion.current;
    setBusy(true);
    setError(null);
    try {
      const updated = await communityRequest(stock.symbol, "POST", data, page);
      if (version === requestVersion.current) setCommunity(updated);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  const rate = async (n: number) => {
    await mutate({ action: "rate", stars: n });
  };

  const publish = async (content: string, parent_id: string | null) => {
    if (!content.trim()) return false;
    return mutate({ action: "post", content: content.trim(), parent_id });
  };

  const roots = posts.filter((p) => !p.parent_id);
  const replies = (id: string) => posts.filter((p) => p.parent_id === id).reverse();
  const authLink = { to: "/auth" as const, search: { next: `/acao/${stock.symbol}` } };

  return (
    <div className="min-h-screen">
      <div className="contents">
        <header className="sticky top-0 z-30 bg-navy text-navy-foreground">
          <div className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
            <Link to="/" className="shrink-0 font-display text-xl font-semibold">
              Minhas <span className="italic text-accent">Ações</span>
            </Link>
            <div className="flex-1 text-foreground">
              <SearchBox compact />
            </div>
            {user ? (
              <button
                onClick={() => signOut()}
                aria-label="Sair"
                className="text-slate hover:text-accent"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <Link {...authLink} className="shrink-0 text-sm font-semibold text-accent">
                Entrar
              </Link>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-6 pb-4 pt-6">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-primary hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar à busca
          </Link>
          <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StockLogo symbol={stock.symbol} />
                <h1 className="text-4xl font-semibold">{stock.symbol}</h1>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {stock.name} ·{" "}
                {stock.market === "BR" ? "B3 · Brasil · BRL" : "Estados Unidos · USD"}
              </p>
            </div>
            <div className="md:border-l md:border-border md:pl-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Comunidade
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
                <Stars value={avg} />
              </div>
              <p className="text-xs text-muted-foreground">
                {communityAvailable
                  ? `${community.count} ${community.count === 1 ? "avaliação" : "avaliações"}`
                  : "Avaliações em preparação"}
              </p>
              <div className="mt-4 text-sm">
                {!communityAvailable ? (
                  <p className="text-muted-foreground">
                    Em breve você poderá avaliar esta empresa.
                  </p>
                ) : !user ? (
                  <Link {...authLink} className="font-semibold text-primary">
                    Entre para avaliar
                  </Link>
                ) : (
                  <div>
                    <p className="mb-1 text-muted-foreground">
                      {mine ? "Sua nota" : "Dê sua nota"}
                    </p>
                    <Stars value={mine ?? 0} onPick={rate} size={22} />
                  </div>
                )}
              </div>
            </div>
          </section>
          <div className="mt-4 rounded-3xl border border-border bg-card p-4 sm:p-6">
            <MarketPanel key={stock.symbol} symbol={stock.symbol} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 pb-10">
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <section className="mt-6">
          <h2 className="text-2xl font-semibold">O que estão dizendo sobre {stock.symbol}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opiniões, notícias e conversas da comunidade.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            {user ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await publish(text, null)) setText("");
                }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={`O que está acontecendo com ${stock.symbol}?`}
                  className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <div className="flex justify-end">
                  <button
                    disabled={busy || !text.trim()}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    Publicar
                  </button>
                </div>
              </form>
            ) : communityAvailable ? (
              <p className="text-sm text-muted-foreground">
                <Link {...authLink} className="font-semibold text-primary">
                  Entre
                </Link>{" "}
                para publicar e responder.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Comentários e avaliações estarão disponíveis após a configuração da comunidade.
              </p>
            )}
          </div>

          <ul className="mt-6 divide-y divide-border">
            {communityAvailable && !error && roots.length === 0 && (
              <li className="py-10 text-center text-muted-foreground">
                Ainda não há publicações. Seja o primeiro!
              </li>
            )}
            {roots.map((p) => (
              <li
                key={p.id}
                className={`py-5 ${p.is_sergio ? "rounded-2xl bg-accent/10 px-4" : ""}`}
              >
                <PostItem post={p} onDelete={() => mutate({ action: "delete", id: p.id })} />
                <div className="ml-11 mt-2">
                  {replies(p.id).map((r) => (
                    <div key={r.id} className="mt-3 border-l-2 border-border pl-4">
                      <PostItem
                        post={r}
                        small
                        onDelete={() => mutate({ action: "delete", id: r.id })}
                      />
                    </div>
                  ))}
                  {!user ? (
                    <Link
                      {...authLink}
                      className="mt-2 flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Responder
                    </Link>
                  ) : replyTo === p.id ? (
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await publish(replyText, p.id)) {
                          setReplyText("");
                          setReplyTo(null);
                        }
                      }}
                    >
                      <input
                        autoFocus
                        value={replyText}
                        maxLength={2000}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Responder a ${p.author_name}…`}
                        className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none"
                      />
                      <button
                        disabled={busy || !replyText.trim()}
                        className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                      >
                        Responder
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => {
                        setReplyTo(p.id);
                        setReplyText("");
                      }}
                      className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Responder
                      {replies(p.id).length > 0 ? ` · ${replies(p.id).length}` : ""}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-4 text-sm font-semibold text-primary">
            {page > 0 && <button onClick={() => setPage(page - 1)}>Publicações anteriores</button>}
            {community.hasMore && (
              <button onClick={() => setPage(page + 1)}>Mais publicações</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function PostItem({
  post,
  small,
  onDelete,
}: {
  post: Post;
  small?: boolean;
  onDelete: () => Promise<boolean>;
}) {
  return (
    <div className="flex gap-3">
      <div
        className={`flex shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground ${small ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"}`}
      >
        {post.author_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-bold">{post.author_name}</span>{" "}
          {post.is_sergio && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              Sérgio · Autor
            </span>
          )}{" "}
          <span className="text-muted-foreground">· {timeAgo(post.created_at)}</span>
        </p>
        <p className={`mt-1 whitespace-pre-wrap break-words ${small ? "text-sm" : ""}`}>
          {post.content}
        </p>
        {post.can_delete && (
          <button
            type="button"
            onClick={() => onDelete()}
            className="mt-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Excluir publicação
          </button>
        )}
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            width={1200}
            height={688}
            className="mt-3 aspect-video w-full rounded-2xl border border-border object-cover"
          />
        )}
      </div>
    </div>
  );
}
