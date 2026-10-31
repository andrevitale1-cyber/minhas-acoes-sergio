# Dados de mercado

A página consulta `/api/market?symbol=PETR4&period=1mo`. Períodos: 1d, 5d, 1mo, 6mo, 1y e max.

A variação usa a cotação atual contra o primeiro fechamento disponível no histórico selecionado. Em 1D, usa o fechamento anterior. Máx. representa a variação de preço desde o primeiro ponto que o fornecedor disponibiliza, sem reinvestir dividendos. Quando não há histórico suficiente, a variação do período fica indisponível; nunca é substituída pela diária.

O Fundamentei usa Aeonik. A tipografia está preparada para Aeonik quando instalada/disponível com licença; por enquanto carrega Inter como alternativa, sem copiar arquivos de terceiros. Logos usam endpoints públicos de imagens, com fallback para as iniciais do ticker.

- B3: brapi. Configure `BRAPI_TOKEN` no servidor.
- Ações dos EUA: Twelve Data. Configure `TWELVE_DATA_API_KEY` no servidor.
- Em desenvolvimento, coloque as chaves em `.env.local` (ignorado pelo Git).
- Na Vercel, configure as variáveis nos ambientes Preview e Production e faça uma nova implantação.
- Nunca prefixe chaves privadas com `VITE_`.

As respostas válidas têm cache compartilhado de 5 minutos. A interface atualiza a cada 5 minutos enquanto está aberta. O horário mostrado é o da cotação, não o horário da consulta. Atraso, bolsas, direito de exibição pública e limites dependem dos planos contratados.

Na conta brapi testada, o histórico permite somente intervalo diário. Por isso o gráfico brasileiro abre em 1 mês. Solicitações intradiárias bloqueadas preservam a cotação e mostram o limite do histórico; não geram preços fictícios. O intradiário brasileiro depende de um plano que o inclua.

A busca tem sugestões locais e aceita digitar outros tickers diretamente. A integração atual reconhece tickers no formato B3 e consulta os demais no mercado americano. Não cobre todas as bolsas mundiais nem oferece ainda um catálogo global por nome.

Validação: `npm test`, `npx tsc --noEmit` e `npm run build`.
