# JDPINTO — Gestão de Intervenções

PWA / Web-App (Next.js App Router + Tailwind + Supabase) para gestão de intervenções, clientes e equipas.

## Stack

- **Next.js 16** (App Router)
- **Tailwind CSS 4** + componentes estilo Shadcn
- **Lucide Icons**
- **Supabase** (Auth, Postgres + RLS, Storage)

## Arranque local

```bash
cp .env.example .env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Abrir http://localhost:3000 (redireciona para `/calendar`).

## Rotas

| Rota | Módulo |
|------|--------|
| `/calendar` | Calendário de ocupação |
| `/tasks` | Intervenções |
| `/clients` | Clientes |
| `/team` | Colaboradores & Equipas |
| `/mobile` | Portal do técnico (PWA) |
| `/login` | Autenticação |

## Base de dados

Schema SQL em:

`supabase/migrations/20260908100000_initial_schema.sql`

Inclui tabelas `clients`, `collaborators`, `teams`, `team_members`, `tasks`, `task_photos`, enums, triggers, RLS e bucket Storage `task-photos`.

Aplicar no projeto Supabase (SQL Editor ou CLI `supabase db push` / migration).

## Netlify

Site: https://jdpinto-948.netlify.app  
Build: `npm run build` · publish `.next` (runtime Next.js da Netlify).

## Design system

- Primária: `#0f172a`
- Accent: `#0ea5e9` / `#0284c7`
- Estados: pendente `#f59e0b`, em curso `#0284c7`, concluída `#16a34a`, cancelada `#ef4444`
- Fundo: `#f8fafc` · tipografia Inter
