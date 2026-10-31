# Dados de mercado

A página consulta `/api/market?symbol=PETR4&period=1mo`. Períodos: 1d, 5d, 1mo, 6mo e 1y.

- B3: brapi. Configure `BRAPI_TOKEN` no servidor.
- Ações dos EUA: Twelve Data. Configure `TWELVE_DATA_API_KEY` no servidor.
- Em desenvolvimento, coloque as chaves em `.env.local` (ignorado pelo Git).
- Na Vercel, configure as variáveis nos ambientes Preview e Production e faça uma nova implantação.
- Nunca prefixe chaves privadas com `VITE_`.

As respostas válidas têm cache compartilhado de 5 minutos. A interface atualiza a cada 5 minutos enquanto está aberta. O horário mostrado é o da cotação, não o horário da consulta. Atraso, bolsas, direito de exibição pública e limites dependem dos planos contratados.

Na conta brapi testada, o histórico permite somente intervalo diário. Por isso o gráfico brasileiro abre em 1 mês. Solicitações intradiárias bloqueadas preservam a cotação e mostram o limite do histórico; não geram preços fictícios. O intradiário brasileiro depende de um plano que o inclua.

A busca tem sugestões locais e aceita digitar outros tickers diretamente. A integração atual reconhece tickers no formato B3 e consulta os demais no mercado americano. Não cobre todas as bolsas mundiais nem oferece ainda um catálogo global por nome.

Validação: `npm test`, `npx tsc --noEmit` e `npm run build`.
