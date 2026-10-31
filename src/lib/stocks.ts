export type Stock = { symbol: string; name: string; market: "BR" | "US" };

export const STOCKS: Stock[] = [
  { symbol: "PETR4", name: "Petrobras", market: "BR" },
  { symbol: "VALE3", name: "Vale", market: "BR" },
  { symbol: "ITUB4", name: "Itaú Unibanco", market: "BR" },
  { symbol: "BBDC4", name: "Bradesco", market: "BR" },
  { symbol: "BBAS3", name: "Banco do Brasil", market: "BR" },
  { symbol: "WEGE3", name: "WEG", market: "BR" },
  { symbol: "ABEV3", name: "Ambev", market: "BR" },
  { symbol: "MGLU3", name: "Magazine Luiza", market: "BR" },
  { symbol: "B3SA3", name: "B3", market: "BR" },
  { symbol: "RENT3", name: "Localiza", market: "BR" },
  { symbol: "TAEE11", name: "Taesa", market: "BR" },
  { symbol: "BBSE3", name: "BB Seguridade", market: "BR" },
  { symbol: "AAPL", name: "Apple", market: "US" },
  { symbol: "MSFT", name: "Microsoft", market: "US" },
  { symbol: "NVDA", name: "NVIDIA", market: "US" },
  { symbol: "AMZN", name: "Amazon", market: "US" },
  { symbol: "GOOGL", name: "Alphabet", market: "US" },
  { symbol: "META", name: "Meta Platforms", market: "US" },
  { symbol: "TSLA", name: "Tesla", market: "US" },
  { symbol: "KO", name: "Coca-Cola", market: "US" },
  { symbol: "JPM", name: "JPMorgan Chase", market: "US" },
  { symbol: "NFLX", name: "Netflix", market: "US" },
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

export function formatPrice(v: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
}
