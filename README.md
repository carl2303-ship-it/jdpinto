# jdpinto

Site React + TypeScript (Vite), preparado para deploy contínuo na [Netlify](https://www.netlify.com/).

## Desenvolvimento local

```bash
npm install
npm run dev
```

O plugin `@netlify/vite-plugin` disponibiliza primitives da Netlify (Functions, Blobs, env) durante o `npm run dev`.

## Build

```bash
npm run build
```

Saída em `dist/` (configurada em `netlify.toml`).

## Netlify

1. Liga o site ao repositório GitHub `carl2303-ship-it/jdpinto` no [dashboard Netlify](https://app.netlify.com/) **ou** via CLI:

```bash
npx netlify login
npx netlify init
```

2. Em cada push para a branch de produção, a Netlify faz build (`npm run build`) e publica `dist/`.

3. Deploy manual (opcional):

```bash
npx netlify deploy --prod
```
