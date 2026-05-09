# ACERVA

Catálogo digital de bibliotecas públicas. SaaS multi-tenant com slug-based routing
(`acerva.app/cruz-e-sousa`, `acerva.app/outra-biblioteca`).

## Stack

- **Frontend**: Vite + React 19 + Wouter + TanStack Query + Tailwind v4 + shadcn/ui
- **Backend**: Supabase (Postgres + RLS + Auth + Storage + Edge Functions)
- **Email**: AWS SES (transacional)
- **Deploy**: Vercel (frontend) + Supabase (DB)

## Funcionalidades

- 🏛️ Multi-tenant via RLS (isolamento por `library_id`)
- 📚 Catálogo público com busca, filtros, ordenação e categorias
- 👤 Cadastro com verificação por documento (CNH/RG) + endereço + comprovante de residência
- 📅 Reservas (24h pra retirar) → empréstimos (15 dias, 1 renovação)
- 🚫 Bloqueio automático em atraso
- ⭐ Avaliações 1-5 estrelas com comentário
- 🏆 Rankings: top leitores e top livros (mês/semestre/ano)
- 💡 Sugestões da comunidade
- 🔔 Avise-me quando disponível
- 📦 Gestão de exemplares com descarte motivado e localização nas prateleiras

## Setup local

```sh
pnpm install
cp .env.example .env  # preencha SUPABASE_URL e chaves
pnpm dev
```

Migrations em `supabase/migrations/` — rodar em ordem no SQL Editor do Supabase.

Scripts úteis:

```sh
npx tsx scripts/verify-schema.ts        # confere tabelas
npx tsx scripts/seed-supabase.ts        # popula 15 livros + buckets
npx tsx scripts/promote-super-admin.ts  # promove primeiro admin
```

## Deploy

- **Vercel**: detecta `vercel.json`, builda `pnpm build`, publica `dist/`
- **Variáveis**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Origem

Implantação inicial: Biblioteca Pública Municipal Cruz e Sousa, Schroeder/SC.
