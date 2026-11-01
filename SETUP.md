# Clerk e Render

Recursos pertencem à conta do cliente. O site continua na Vercel.

- Render PostgreSQL: `minhas-acoes-sergio-db`, Virginia, PostgreSQL 18, plano gratuito. [Dashboard](https://dashboard.render.com/d/dpg-dbjr4l7f3r2c73ctiuig-a).
- **Banco gratuito expira em 01/12/2026.** Antes disso, migrar os dados ou atualizar o plano com autorização do cliente. Não há contratação paga neste setup.
- Clerk: `Minhas Ações`, instância de desenvolvimento, login por e-mail ou Google. [Dashboard](https://dashboard.clerk.com/apps/app_3LWUenD3iSo6sI1sAk19OM2mTsn/instances/ins_3LWUekAr2OJGJeyuFmYYH1f0PwK).
- O endereço `minhas-acoes-sergio.vercel.app` usa as chaves de desenvolvimento do Clerk. Para lançar a autenticação de produção, criar a instância de produção com domínio próprio e substituir as chaves na Vercel.

## Variáveis

Definir na Vercel em Preview e Production e, localmente, em `.env.local` (ignorado pelo Git):

- `DATABASE_URL`: URL **externa** do Render. A conexão exige TLS; o servidor usa no máximo duas conexões por instância.
- `VITE_CLERK_PUBLISHABLE_KEY`: chave pública do Clerk, exposta ao navegador por definição.
- `CLERK_SECRET_KEY`: chave privada, somente no servidor.
- `SERGIO_CLERK_USER_ID`: ID do usuário do Sérgio nesta instância do Clerk. Identifica publicações destacadas e permite moderar comentários. Nunca aceitar esse papel enviado pelo navegador.

Nunca versionar credenciais. Não colocar `DATABASE_URL` ou a chave secreta em variáveis com prefixo `VITE_`.

## Banco e comunidade

Aplicar migrações com `node --env-file=.env.local scripts/migrate-db.mjs`. O registro `app_migrations` impede reaplicação. Tabelas: `posts`, `ratings`, `community_rate_limits`.

A leitura é pública; escrever exige sessão Clerk válida. Uma nota de 1 a 5 por usuário e empresa, atualizada ao votar novamente. Comentários aceitam até 2.000 caracteres e respostas de um nível. Autores podem excluir suas publicações; Sérgio pode moderar. Exclusão é lógica. Publicações do Sérgio aparecem primeiro e recebem identificação. Limite de 60 ações por usuário por hora.

As APIs de cotações continuam pausadas em `src/lib/market-status.ts`, conforme solicitado. A comunidade funciona independentemente delas.
