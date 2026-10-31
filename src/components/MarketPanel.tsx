import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { periods, periodReturn, type MarketQuote, type Period } from "@/lib/market";
import { formatPrice } from "@/lib/stocks";
import { marketDataPaused } from "@/lib/market-status";

const StockChart = lazy(() => import("./StockChart"));

export function MarketPanel({ symbol }: { symbol: string }) {
  const [period, setPeriod] = useState<Period>(/^[A-Z]{4}\d{1,2}$/.test(symbol) ? "1mo" : "1d");
  const {
    data: quote,
    error,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["market", symbol, period],
    queryFn: async ({ signal }): Promise<MarketQuote> => {
      const response = await fetch(
        `/api/market?symbol=${encodeURIComponent(symbol)}&period=${period}`,
        { signal },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar a cotação.");
      return body;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
    enabled: !marketDataPaused,
  });
  const performance = quote ? periodReturn(quote) : null;
  if (marketDataPaused)
    return (
      <section className="py-6 text-sm text-muted-foreground" aria-label="Cotações pausadas">
        As consultas de cotações e gráficos estão temporariamente pausadas.
      </section>
    );
  return (
    <section className="mt-5" aria-label="Cotação e histórico" aria-busy={isFetching}>
      <div role="group" aria-label="Período do gráfico" className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(periods) as Period[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={period === key}
            onClick={() => setPeriod(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${period === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {periods[key].label}
          </button>
        ))}
      </div>
      {isPending && (
        <p role="status" className="py-12 text-muted-foreground">
          Carregando cotação e gráfico…
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-border p-4">
          <p>{error.message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 font-semibold text-primary"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {quote && (
        <>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">
              {formatPrice(quote.price, quote.currency)}
            </span>
            {performance && (
              <span
                className={`font-semibold tabular-nums ${performance.change >= 0 ? "text-success" : "text-destructive"}`}
              >
                {performance.change >= 0 ? "+" : ""}
                {formatPrice(performance.change, quote.currency)} (
                {performance.changePct >= 0 ? "+" : ""}
                {performance.changePct.toLocaleString("pt-BR", {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                })}
                %)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {period === "1d"
              ? "Variação em relação ao fechamento anterior."
              : performance
                ? `Variação desde ${new Date(quote.history[0]!.time).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}, primeiro preço disponível ${period === "max" ? "em todo o histórico liberado pela API" : "no período selecionado"}.`
                : "Variação do período indisponível sem histórico suficiente."}
            {period === "max" && " Variação de preço, sem reinvestimento de dividendos."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {quote.quotedAt
              ? `Cotação em ${new Date(quote.quotedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília)`
              : "Horário da cotação não informado"}
          </p>
          {quote.marketOpen !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground">
              {quote.marketOpen ? "Mercado aberto" : "Mercado fechado — última cotação disponível"}
            </p>
          )}
          {quote.history.length > 1 ? (
            <Suspense
              fallback={
                <p className="h-72 py-12" role="status">
                  Preparando gráfico…
                </p>
              }
            >
              <StockChart quote={quote} />
            </Suspense>
          ) : (
            <p className="py-12 text-muted-foreground">
              {quote.historyNotice ||
                "O fornecedor não retornou histórico suficiente para este período."}
            </p>
          )}
          {quote.history.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Histórico de{" "}
              {new Date(quote.history[0]!.time).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              a{" "}
              {new Date(quote.history.at(-1)!.time).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}{" "}
              · intervalo {quote.interval}.{" "}
              {period === "1d" &&
                "Linha pontilhada: fechamento anterior. Fora do pregão, exibimos os últimos dados disponíveis."}
            </p>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 text-sm font-semibold text-primary disabled:opacity-50"
          >
            {isFetching ? "Atualizando…" : "Atualizar cotação"}
          </button>
        </>
      )}
    </section>
  );
}
