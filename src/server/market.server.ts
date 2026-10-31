import { z } from "zod";
import { periods, type MarketQuote, type Period } from "@/lib/market";

const nullableNumber = z.number().finite().nullish();
const quoteSchema = z.object({
  symbol: z.string(),
  longName: z.string().nullish(),
  shortName: z.string().nullish(),
  currency: z.string().length(3),
  regularMarketPrice: z.number().finite().positive(),
  regularMarketChange: nullableNumber,
  regularMarketChangePercent: nullableNumber,
  regularMarketPreviousClose: nullableNumber,
  regularMarketTime: z.string().datetime({ offset: true }).nullish(),
  usedInterval: z.string().optional(),
  historicalDataPrice: z
    .array(z.object({ date: z.number().int().positive(), close: nullableNumber }))
    .nullish(),
});

export function normalizeQuote(value: unknown, symbol: string, period: Period): MarketQuote {
  const quote = quoteSchema.parse(value);
  if (quote.symbol !== symbol) throw new Error("Unexpected symbol");
  const previousClose =
    quote.regularMarketPreviousClose && quote.regularMarketPreviousClose > 0
      ? quote.regularMarketPreviousClose
      : null;
  const change =
    previousClose === null
      ? (quote.regularMarketChange ?? null)
      : quote.regularMarketPrice - previousClose;
  const points = new Map<number, number>();
  for (const point of quote.historicalDataPrice ?? []) {
    if (point.close != null && point.close > 0) points.set(point.date * 1000, point.close);
  }
  return {
    symbol,
    name: quote.longName || quote.shortName || symbol,
    currency: quote.currency,
    price: quote.regularMarketPrice,
    previousClose,
    change,
    changePct:
      previousClose === null
        ? (quote.regularMarketChangePercent ?? null)
        : (change! / previousClose) * 100,
    quotedAt: quote.regularMarketTime ?? null,
    fetchedAt: new Date().toISOString(),
    source: "brapi.dev",
    period,
    interval: quote.usedInterval ?? periods[period].interval,
    history: [...points].sort(([a], [b]) => a - b).map(([time, price]) => ({ time, price })),
  };
}

function failure(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleMarketRequest(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const symbol = (params.get("symbol") ?? "").toUpperCase().trim();
  const period = params.get("period") ?? "1d";
  if (!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)) {
    return failure("Ticker inválido. Use, por exemplo, PETR4 ou AAPL.", 400);
  }
  if (!Object.hasOwn(periods, period)) return failure("Período inválido.", 400);
  if (!/^[A-Z]{4}\d{1,2}$/.test(symbol)) return handleTwelveData(symbol, period as Period);
  const token = process.env["BRAPI_TOKEN"];
  if (!token && !["PETR4", "VALE3", "ITUB4", "MGLU3"].includes(symbol)) {
    return failure(
      "A cobertura deste ativo depende da configuração da API. Por enquanto, consulte PETR4, VALE3, ITUB4 ou MGLU3.",
      503,
    );
  }
  const url = new URL(`https://brapi.dev/api/quote/${symbol}`);
  url.searchParams.set("range", period);
  url.searchParams.set("interval", periods[period as Period].interval);
  try {
    const options = {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(10000),
    };
    let response = await fetch(url, options);
    let historyNotice: string | undefined;
    if (response.status === 400 || response.status === 403) {
      const problem = await response
        .clone()
        .json()
        .catch(() => ({}));
      if (["INVALID_INTERVAL", "INVALID_RANGE"].includes(problem.code)) {
        url.search = "";
        historyNotice =
          "O plano atual não permite o histórico deste período. A cotação mais recente continua disponível.";
        response = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
      }
    }
    if (!response.ok) {
      if (response.status === 429)
        return failure(
          "O fornecedor atingiu o limite de consultas. Tente novamente mais tarde.",
          429,
        );
      if ([401, 403].includes(response.status))
        return failure(
          "Este ativo ou período não está disponível no plano da API configurado.",
          503,
        );
      if (response.status === 404)
        return failure("Ativo não encontrado no fornecedor de dados.", 404);
      return failure(
        "O fornecedor não disponibilizou os dados agora. Tente novamente em alguns minutos.",
        502,
      );
    }
    const body = await response.json();
    const quote = normalizeQuote(body?.results?.[0], symbol, period as Period);
    if (historyNotice) quote.historyNotice = historyNotice;
    // Shared CDN cache limits upstream calls; every price retains its original timestamp.
    return Response.json(quote, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch {
    return failure(
      "Não foi possível obter uma cotação válida. Tente novamente em alguns minutos.",
      502,
    );
  }
}

const numericText = z
  .union([z.number(), z.string().min(1)])
  .transform(Number)
  .pipe(z.number().finite());
const twelveQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  currency: z.string().length(3),
  close: numericText.pipe(z.number().positive()),
  previous_close: numericText.pipe(z.number().positive()),
  last_quote_at: z.number().int().positive().optional(),
  timestamp: z.number().int().positive(),
  is_market_open: z.boolean().optional(),
});
const twelveHistorySchema = z.object({
  values: z.array(
    z.object({ datetime: z.string(), close: numericText.pipe(z.number().positive()) }),
  ),
});

export function normalizeTwelve(
  quoteValue: unknown,
  historyValue: unknown,
  symbol: string,
  period: Period,
): MarketQuote {
  const quote = twelveQuoteSchema.parse(quoteValue);
  if (quote.symbol !== symbol) throw new Error("Unexpected symbol");
  const history = twelveHistorySchema.parse(historyValue);
  const intraday = period === "1d" || period === "5d";
  let points = history.values
    .map((point) => ({
      time: Date.parse(`${point.datetime.replace(" ", "T")}${intraday ? "Z" : "T12:00:00Z"}`),
      price: point.close,
    }))
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
  if (period === "1d" && points.length) {
    const latestDay = new Date(points.at(-1)!.time).toISOString().slice(0, 10);
    points = points.filter((point) => new Date(point.time).toISOString().startsWith(latestDay));
  }
  const change = quote.close - quote.previous_close;
  return {
    symbol,
    name: quote.name,
    currency: quote.currency,
    price: quote.close,
    previousClose: quote.previous_close,
    change,
    changePct: (change / quote.previous_close) * 100,
    quotedAt: new Date((quote.last_quote_at ?? quote.timestamp) * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    source: "Twelve Data",
    period,
    interval: period === "1d" ? "5m" : period === "5d" ? "30m" : "1d",
    history: points,
    ...(quote.is_market_open === undefined ? {} : { marketOpen: quote.is_market_open }),
  };
}

async function handleTwelveData(symbol: string, period: Period): Promise<Response> {
  const key = process.env["TWELVE_DATA_API_KEY"];
  if (!key)
    return failure("A cobertura internacional depende da configuração da API Twelve Data.", 503);
  const config = {
    "1d": ["5min", 100],
    "5d": ["30min", 65],
    "1mo": ["1day", 23],
    "6mo": ["1day", 130],
    "1y": ["1day", 260],
  } as const;
  const [interval, count] = config[period];
  const quoteUrl = new URL("https://api.twelvedata.com/quote");
  quoteUrl.searchParams.set("symbol", symbol);
  quoteUrl.searchParams.set("country", "United States");
  const historyUrl = new URL("https://api.twelvedata.com/time_series");
  historyUrl.search = new URLSearchParams({
    symbol,
    country: "United States",
    interval,
    outputsize: String(count),
    timezone: "UTC",
  }).toString();
  try {
    const options = () => ({
      headers: { Authorization: `apikey ${key}` },
      signal: AbortSignal.timeout(10000),
    });
    const responses = await Promise.all([fetch(quoteUrl, options()), fetch(historyUrl, options())]);
    const [quoteBody, historyBody] = await Promise.all(
      responses.map((response) => response.json()),
    );
    if (
      responses.some((response) => response.status === 429) ||
      [quoteBody, historyBody].some((body) => body?.code === 429)
    ) {
      return failure(
        "O fornecedor atingiu o limite de consultas. Aguarde um minuto e tente novamente.",
        429,
      );
    }
    if (!responses[0]!.ok || quoteBody?.status === "error")
      return failure(
        "Cotação não disponível para este ativo no plano Twelve Data configurado.",
        502,
      );
    const historyUnavailable = !responses[1]!.ok || historyBody?.status === "error";
    const quote = normalizeTwelve(
      quoteBody,
      historyUnavailable ? { values: [] } : historyBody,
      symbol,
      period,
    );
    if (historyUnavailable)
      quote.historyNotice =
        "O fornecedor não disponibilizou o histórico deste período no plano atual.";
    return Response.json(quote, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch {
    return failure(
      "Não foi possível obter uma cotação válida da Twelve Data. Tente novamente em alguns minutos.",
      502,
    );
  }
}
