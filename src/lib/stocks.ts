export type Stock = { symbol: string; name: string; market: "BR" | "US"; base: number };

export const STOCKS: Stock[] = [
  { symbol: "PETR4", name: "Petrobras", market: "BR", base: 38.2 },
  { symbol: "VALE3", name: "Vale", market: "BR", base: 61.5 },
  { symbol: "ITUB4", name: "Itaú Unibanco", market: "BR", base: 34.9 },
  { symbol: "BBDC4", name: "Bradesco", market: "BR", base: 13.4 },
  { symbol: "BBAS3", name: "Banco do Brasil", market: "BR", base: 27.8 },
  { symbol: "WEGE3", name: "WEG", market: "BR", base: 52.1 },
  { symbol: "ABEV3", name: "Ambev", market: "BR", base: 12.9 },
  { symbol: "MGLU3", name: "Magazine Luiza", market: "BR", base: 9.7 },
  { symbol: "B3SA3", name: "B3", market: "BR", base: 12.3 },
  { symbol: "RENT3", name: "Localiza", market: "BR", base: 44.6 },
  { symbol: "TAEE11", name: "Taesa", market: "BR", base: 35.2 },
  { symbol: "BBSE3", name: "BB Seguridade", market: "BR", base: 33.4 },
  { symbol: "AAPL", name: "Apple", market: "US", base: 228.5 },
  { symbol: "MSFT", name: "Microsoft", market: "US", base: 431.2 },
  { symbol: "NVDA", name: "NVIDIA", market: "US", base: 138.7 },
  { symbol: "AMZN", name: "Amazon", market: "US", base: 196.3 },
  { symbol: "GOOGL", name: "Alphabet", market: "US", base: 172.9 },
  { symbol: "META", name: "Meta Platforms", market: "US", base: 571.4 },
  { symbol: "TSLA", name: "Tesla", market: "US", base: 251.8 },
  { symbol: "KO", name: "Coca-Cola", market: "US", base: 63.1 },
  { symbol: "JPM", name: "JPMorgan Chase", market: "US", base: 221.6 },
  { symbol: "NFLX", name: "Netflix", market: "US", base: 754.2 },
];

export function findStock(symbol: string) {
  return STOCKS.find((s) => s.symbol === symbol.toUpperCase());
}

export function searchStocks(q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return STOCKS.filter(
    (s) => s.symbol.toLowerCase().includes(t) || s.name.toLowerCase().includes(t),
  ).slice(0, 6);
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
}

/** Simulated quote: stable within a day per symbol. */
export function getQuote(stock: Stock, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  const changePct = (hash(stock.symbol + day) - 0.5) * 7;
  const price = stock.base * (1 + changePct / 100);
  return { price, changePct, currency: stock.market === "BR" ? "BRL" : "USD" };
}

export function formatPrice(v: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}
