import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Star, TrendingDown, TrendingUp, MessageCircle, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SearchBox } from "@/components/SearchBox";
import { findStock, formatPrice, getQuote } from "@/lib/stocks";
import { displayName, useUser } from "@/hooks/use-session";
import { communityAvailable } from "@/lib/backend-config";

export const Route = createFileRoute("/acao/$symbol")({
  loader: ({ params }) => {
    const stock = findStock(params.symbol);
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
      <Link to="/" className="font-semibold text-primary">Voltar à busca</Link>
    </div>
  ),
  component: StockPage,
});

type Post = { id: string; user_id: string; author_name: string; content: string; parent_id: string | null; created_at: string; image_url: string | null };

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Stars({ value, onPick, size = 20 }: { value: number; onPick?: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onPick} onMouseEnter={() => onPick && setHover(n)} onClick={() => onPick?.(n)}
          aria-label={`${n} estrelas`} className={onPick ? "cursor-pointer" : "cursor-default"}>
          <Star style={{ width: size, height: size }}
            className={n <= Math.round(shown) ? "fill-accent text-accent" : "text-border"} />
        </button>
      ))}
    </div>
  );
}

function StockPage() {
  const { stock } = Route.useLoaderData();
  const quote = getQuote(stock);
  const user = useUser();
  const up = quote.changePct >= 0;

  const [ratings, setRatings] = useState<{ user_id: string; stars: number }[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = useCallback(async () => {
    if (!communityAvailable) return;
    const [r, p] = await Promise.all([
      supabase.from("ratings").select("user_id, stars").eq("symbol", stock.symbol),
      supabase.from("posts").select("*").eq("symbol", stock.symbol).order("created_at", { ascending: false }),
    ]);
    setRatings(r.data ?? []);
    setPosts((p.data as Post[]) ?? []);
  }, [stock.symbol]);

  useEffect(() => { load(); }, [load]);

  const avg = ratings.length ? ratings.reduce((a, r) => a + r.stars, 0) / ratings.length : 0;
  const mine = user ? ratings.find((r) => r.user_id === user.id) : undefined;

  const rate = async (n: number) => {
    if (!user) return;
    await supabase.from("ratings").upsert({ symbol: stock.symbol, user_id: user.id, stars: n }, { onConflict: "symbol,user_id" });
    load();
  };

  const publish = async (content: string, parent_id: string | null) => {
    if (!user || !content.trim()) return;
    await supabase.from("posts").insert({ symbol: stock.symbol, user_id: user.id, author_name: displayName(user), content: content.trim(), parent_id });
    load();
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
          <div className="flex-1 text-foreground"><SearchBox compact /></div>
          {user ? (
            <button onClick={() => supabase.auth.signOut()} aria-label="Sair" className="text-slate hover:text-accent"><LogOut className="h-5 w-5" /></button>
          ) : (
            <Link {...authLink} className="shrink-0 text-sm font-semibold text-accent">Entrar</Link>
          )}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-4 pt-6">
        <section className="grid gap-6 rounded-3xl border border-border bg-card p-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-4xl font-semibold">{stock.symbol}</h1>
              <span className="text-muted-foreground">{stock.name}</span>
            </div>
            <div className="mt-4 flex items-end gap-4">
              <span className="text-3xl font-bold tabular-nums">{formatPrice(quote.price, quote.currency)}</span>
              <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {up ? "+" : ""}{quote.changePct.toFixed(2)}% hoje
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Cotação demonstrativa — dados simulados. Integração de mercado em preparação.</p>
          </div>
          <div className="md:border-l md:border-border md:pl-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comunidade</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
              <Stars value={avg} />
            </div>
            <p className="text-xs text-muted-foreground">{communityAvailable ? `${ratings.length} ${ratings.length === 1 ? "avaliação" : "avaliações"}` : "Avaliações em preparação"}</p>
            <div className="mt-4 text-sm">
              {!communityAvailable ? <p className="text-muted-foreground">Em breve você poderá avaliar esta empresa.</p> : !user ? (
                <Link {...authLink} className="font-semibold text-primary">Entre para avaliar</Link>
              ) : (
                <div>
                  <p className="mb-1 text-muted-foreground">{mine ? "Sua nota" : "Dê sua nota"}</p>
                  <Stars value={mine?.stars ?? 0} onPick={rate} size={22} />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 pb-10">
        <section className="mt-6">
          <h2 className="text-2xl font-semibold">O que estão dizendo sobre {stock.symbol}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Opiniões, notícias e conversas da comunidade.</p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            {user ? (
              <form onSubmit={(e) => { e.preventDefault(); publish(text, null); setText(""); }}>
                <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3}
                  placeholder={`O que está acontecendo com ${stock.symbol}?`}
                  className="w-full resize-none bg-transparent outline-none placeholder:text-muted-foreground" />
                <div className="flex justify-end">
                  <button disabled={!text.trim()} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Publicar</button>
                </div>
              </form>
            ) : (
              communityAvailable ? <p className="text-sm text-muted-foreground"><Link {...authLink} className="font-semibold text-primary">Entre</Link> para publicar e responder.</p> : <p className="text-sm text-muted-foreground">Comentários e avaliações estarão disponíveis após a configuração da comunidade.</p>
            )}
          </div>

          <ul className="mt-6 divide-y divide-border">
            {communityAvailable && roots.length === 0 && <li className="py-10 text-center text-muted-foreground">Ainda não há publicações. Seja o primeiro!</li>}
            {roots.map((p) => (
              <li key={p.id} className="py-5">
                <PostItem post={p} />
                <div className="ml-11 mt-2">
                  {replies(p.id).map((r) => (
                    <div key={r.id} className="mt-3 border-l-2 border-border pl-4"><PostItem post={r} small /></div>
                  ))}
                  {!user ? (
                    <Link {...authLink} className="mt-2 flex w-fit items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
                      <MessageCircle className="h-3.5 w-3.5" /> Responder
                    </Link>
                  ) : replyTo === p.id ? (
                    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); publish(replyText, p.id); setReplyText(""); setReplyTo(null); }}>
                      <input autoFocus value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Responder a ${p.author_name}…`}
                        className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none" />
                      <button disabled={!replyText.trim()} className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40">Responder</button>
                    </form>
                  ) : (
                    <button onClick={() => { setReplyTo(p.id); setReplyText(""); }} className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
                      <MessageCircle className="h-3.5 w-3.5" /> Responder{replies(p.id).length > 0 ? ` · ${replies(p.id).length}` : ""}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function PostItem({ post, small }: { post: Post; small?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className={`flex shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-secondary-foreground ${small ? "h-6 w-6 text-xs" : "h-8 w-8 text-sm"}`}>
        {post.author_name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm"><span className="font-bold">{post.author_name}</span> <span className="text-muted-foreground">· {timeAgo(post.created_at)}</span></p>
        <p className={`mt-1 whitespace-pre-wrap break-words ${small ? "text-sm" : ""}`}>{post.content}</p>
        {post.image_url && (
          <img src={post.image_url} alt="" loading="lazy" width={1200} height={688}
            className="mt-3 aspect-video w-full rounded-2xl border border-border object-cover" />
        )}
      </div>
    </div>
  );
}
