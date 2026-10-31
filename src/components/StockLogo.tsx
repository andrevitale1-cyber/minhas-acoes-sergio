import { useState } from "react";

export function StockLogo({ symbol, small = false }: { symbol: string; small?: boolean }) {
  const [failedSymbol, setFailedSymbol] = useState<string | null>(null);
  const src = /^[A-Z]{4}\d{1,2}$/.test(symbol)
    ? `https://icons.brapi.dev/icons/${encodeURIComponent(symbol)}.svg`
    : `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol)}.png`;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white ${small ? "h-9 w-9 text-xs" : "h-14 w-14 text-lg"}`}
    >
      {failedSymbol === symbol ? (
        <span
          aria-label={`Logo de ${symbol} indisponível`}
          className="font-semibold text-slate-700"
        >
          {symbol.slice(0, 2)}
        </span>
      ) : (
        <img
          src={src}
          alt={`Logo de ${symbol}`}
          width={small ? 36 : 56}
          height={small ? 36 : 56}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSymbol(symbol)}
          className="h-full w-full object-contain p-1.5"
        />
      )}
    </span>
  );
}
