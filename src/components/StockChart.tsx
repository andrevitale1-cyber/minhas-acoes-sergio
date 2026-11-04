import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { periodReturn, type MarketQuote } from "@/lib/market";
import { formatPrice } from "@/lib/stocks";

export default function StockChart({ quote }: { quote: MarketQuote }) {
  const intraday = quote.interval.endsWith("m") || quote.interval.endsWith("h");
  const dateLabel = (value: number, full = false) =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      ...(intraday ? { hour: "2-digit", minute: "2-digit" } : {}),
      ...(!intraday || full ? { day: "2-digit", month: "2-digit" } : {}),
      ...(quote.period === "max" || quote.period === "5y" ? { year: "numeric" } : {}),
    }).format(value);
  const first = quote.history[0]?.price ?? quote.price;
  const last = quote.history.at(-1)?.price ?? quote.price;
  const performance = periodReturn(quote);
  const color = (performance?.change ?? 0) >= 0 ? "#15803d" : "#dc2626";
  return (
    <div
      className="h-72 w-full"
      role="img"
      aria-label={`Histórico de ${quote.symbol}: ${quote.history.length} pontos. De ${formatPrice(first, quote.currency)} a ${formatPrice(last, quote.currency)}.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={quote.history}
          margin={{ top: 15, right: 12, bottom: 0, left: 4 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(value: number) => dateLabel(value)}
            minTickGap={40}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(value: number) =>
              value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
            }
            width={58}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(value) => dateLabel(Number(value), true)}
            formatter={(value: number) => [formatPrice(value, quote.currency), "Cotação"]}
            contentStyle={{ borderRadius: 12 }}
          />
          {quote.period === "1d" && quote.previousClose !== null && (
            <ReferenceLine
              y={quote.previousClose}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
          )}
          <Area
            dataKey="price"
            type="linear"
            stroke={color}
            strokeWidth={2}
            fill="url(#price-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
