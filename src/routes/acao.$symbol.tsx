import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Star,
  MessageCircle,
  LogOut,
  ArrowLeft,
  Pin,
  PinOff,
  Trash2,
  PenLine,
  X,
} from "lucide-react";
import { SearchBox } from "@/components/SearchBox";
import { findStock } from "@/lib/stocks";
import { MarketPanel } from "@/components/MarketPanel";
import { CommentEditor } from "@/components/CommentEditor";
import { CommentText } from "@/components/CommentText";
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
  const [composerOpen, setComposerOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const prompts = [
    `Deixe sua opinião sobre ${stock.name}`,
    "O que você acha dessa empresa?",
    "O que achou do último resultado?",
  ];
  useEffect(() => {
    if (composerOpen) return;
    const timer = window.setInterval(() => setPromptIndex((index) => (index + 1) % 3), 6000);
    return () => window.clearInterval(timer);
  }, [composerOpen]);
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
  const replies = (id: string) =>
    posts
      .filter((p) => p.parent_id === id)
      .sort(
        (a, b) =>
          Number(b.is_pinned) - Number(a.is_pinned) || a.created_at.localeCompare(b.created_at),
      );
  const authLink = { to: "/auth" as const, search: { next: `/acao/${stock.symbol}` } };

  return (
    <div className="min-h-screen">
      <div className="contents">
        <header className="sticky top-0 z-30 bg-navy text-navy-foreground">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-6 sm:px-6 sm:py-4">
            <Link to="/" className="shrink-0 font-display text-xl font-semibold">
              Minhas <span className="italic text-accent">Ações</span>
            </Link>
            <div className="order-3 w-full min-w-0 text-foreground sm:order-none sm:w-auto sm:flex-1">
              <SearchBox compact />
            </div>
            {user ? (
              <button
                onClick={() => signOut()}
                aria-label="Sair"
                className="ml-auto p-2 text-slate hover:text-accent sm:ml-0"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : (
              <Link
                {...authLink}
                className="ml-auto shrink-0 text-sm font-semibold text-accent sm:ml-0"
              >
                Entrar
              </Link>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
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

      <main className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-destructive/40 p-4 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <section className="mt-6">
          <h2 className="text-xl font-semibold sm:text-2xl">
            O que estão dizendo sobre {stock.symbol}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opiniões, notícias e conversas da comunidade.
          </p>

          <div className="mt-5 rounded-2xl border border-border bg-card p-3 sm:p-4">
            {!composerOpen ? (
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                aria-expanded={false}
                aria-controls="comment-composer"
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-1 text-left text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-base"
              >
                <PenLine className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words">
                  {text ? "Continuar meu comentário" : prompts[promptIndex]}
                </span>
                <span className="hidden shrink-0 text-xs font-semibold text-primary sm:block">
                  Comentar
                </span>
              </button>
            ) : (
              <div id="comment-composer">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Seu comentário</p>
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    aria-label="Recolher editor"
                    title="Recolher editor"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {user ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await publish(text, null)) {
                        setText("");
                        setComposerOpen(false);
                      }
                    }}
                  >
                    <CommentEditor
                      autoFocus
                      value={text}
                      onChange={setText}
                      placeholder={`O que está acontecendo com ${stock.symbol}?`}
                    />
                    <div className="mt-3 flex justify-end">
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
            )}
          </div>

          <ul className="mt-5 space-y-3 sm:space-y-4">
            {communityAvailable && !error && roots.length === 0 && (
              <li className="py-10 text-center text-muted-foreground">
                Ainda não há publicações. Seja o primeiro!
              </li>
            )}
            {roots.map((p) => (
              <li
                key={p.id}
                className={`min-w-0 rounded-2xl border p-3.5 sm:p-5 ${p.is_sergio || p.is_pinned ? "border-accent/20 bg-accent/10" : "border-border bg-card"}`}
              >
                <PostItem
                  post={p}
                  busy={busy}
                  onPin={() => mutate({ action: "pin", id: p.id, pinned: !p.is_pinned })}
                  onDelete={() => mutate({ action: "delete", id: p.id })}
                />
                <div className="mt-2 sm:ml-11">
                  {replies(p.id).map((r) => (
                    <div key={r.id} className="mt-3 min-w-0 border-l-2 border-border pl-3 sm:pl-4">
                      <PostItem
                        post={r}
                        small
                        busy={busy}
                        onPin={() => mutate({ action: "pin", id: r.id, pinned: !r.is_pinned })}
                        onDelete={() => mutate({ action: "delete", id: r.id })}
                      />
                    </div>
                  ))}
                  {!user ? (
                    <Link
                      {...authLink}
                      className="mt-2 inline-flex min-h-10 w-fit items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Responder
                    </Link>
                  ) : replyTo === p.id ? (
                    <form
                      className="mt-3 flex flex-col items-start gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (await publish(replyText, p.id)) {
                          setReplyText("");
                          setReplyTo(null);
                        }
                      }}
                    >
                      <div className="w-full">
                        <CommentEditor
                          autoFocus
                          value={replyText}
                          onChange={setReplyText}
                          placeholder={`Responder a ${p.author_name}…`}
                        />
                      </div>
                      <button
                        disabled={busy || !replyText.trim()}
                        className="min-h-10 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40"
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
                      className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary"
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
  onPin,
  busy,
}: {
  post: Post;
  small?: boolean;
  onDelete: () => Promise<boolean>;
  onPin: () => Promise<boolean>;
  busy: boolean;
}) {
  const actionClass =
    "flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40";
  return (
    <article className="relative min-w-0">
      <div
        className={`flex items-start gap-2.5 ${post.can_pin && post.can_delete ? "pr-20" : post.can_pin || post.can_delete ? "pr-10" : ""}`}
      >
        <div
          aria-hidden="true"
          className={`flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground ${small ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"}`}
        >
          {post.author_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="break-words text-sm font-semibold leading-snug [overflow-wrap:anywhere]">
            {post.author_name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {post.is_sergio && (
              <span className="rounded-full bg-accent/70 px-2 py-0.5 font-medium text-accent-foreground">
                Sérgio · Autor
              </span>
            )}
            <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
          </div>
        </div>
      </div>
      <div className="absolute right-0 top-0 flex items-center">
        {post.can_pin && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPin()}
            aria-label={post.is_pinned ? "Desafixar comentário" : "Fixar comentário"}
            title={post.is_pinned ? "Desafixar comentário" : "Fixar comentário"}
            aria-pressed={post.is_pinned}
            className={`${actionClass} ${post.is_pinned ? "bg-primary/10 text-primary" : ""}`}
          >
            {post.is_pinned ? (
              <PinOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Pin className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
        {post.can_delete && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete()}
            aria-label="Excluir comentário"
            title="Excluir comentário"
            className={`${actionClass} hover:text-destructive`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="mt-3 min-w-0 sm:ml-11">
        {post.is_pinned && (
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
            <Pin className="h-3 w-3" aria-hidden="true" /> Fixado pelo Sérgio
          </p>
        )}
        <div className={`leading-relaxed ${small ? "text-sm" : "text-[15px] sm:text-base"}`}>
          <CommentText text={post.content} />
        </div>
      </div>
    </article>
  );
}
