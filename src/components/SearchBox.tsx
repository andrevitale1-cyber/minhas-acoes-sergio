import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { searchStocks } from "@/lib/stocks";

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const results = searchStocks(q);
  const typedSymbol = q.trim().toUpperCase();
  const directTicker = /^[A-Z][A-Z0-9.-]{0,14}$/.test(typedSymbol) ? typedSymbol : null;

  const go = (symbol: string) => {
    setQ("");
    navigate({ to: "/acao/$symbol", params: { symbol } });
  };

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const pick = results[active] ?? results[0];
          if (pick) go(pick.symbol);
          else if (directTicker) go(directTicker);
        }}
        className={`flex items-center gap-3 rounded-full border border-border bg-card text-card-foreground ${compact ? "px-4 py-2" : "px-6 py-4 shadow-search"}`}
      >
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, results.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          }}
          placeholder="Busque uma ação: PETR4, Apple, VALE3…"
          aria-label="Buscar ação"
          className={`w-full bg-transparent outline-none placeholder:text-muted-foreground ${compact ? "text-sm" : "text-lg"}`}
        />
      </form>
      {results.length > 0 && (
        <ul className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-search">
          {results.map((s, i) => (
            <li key={s.symbol}>
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s.symbol)}
                className={`flex w-full items-center justify-between px-5 py-3 text-left ${i === active ? "bg-muted" : ""}`}
              >
                <span>
                  <span className="font-bold">{s.symbol}</span>
                  <span className="ml-3 text-muted-foreground">{s.name}</span>
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {s.market === "BR" ? "🇧🇷 B3" : "🇺🇸 EUA"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {results.length === 0 && directTicker && (
        <button
          type="button"
          onClick={() => go(directTicker)}
          className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-border bg-popover px-5 py-3 text-left shadow-search"
        >
          Consultar {directTicker}
        </button>
      )}
    </div>
  );
}
