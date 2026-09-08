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

- **Site:** https://jdpinto-948.netlify.app  
- **Dashboard:** https://app.netlify.com/projects/jdpinto-948  
- **Repo:** https://github.com/carl2303-ship-it/jdpinto  

Push para `main` dispara build (`npm run build`) e publica `dist/`.

Deploy manual:

```bash
npx netlify deploy --prod
```
