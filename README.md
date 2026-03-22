## HackDuke 2026

Next.js 16 App Router application deployed with OpenNext to Cloudflare Workers.

## Local Development

1. Copy `.env.example` to `.env.local`.
2. Set Auth0, MongoDB, Gemini, and ElevenLabs credentials.
3. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Auth0 Configuration

This app uses `@auth0/nextjs-auth0` v4.

- Use `APP_BASE_URL`, not `AUTH0_BASE_URL`.
- For local development, set `APP_BASE_URL=http://localhost:3000`.
- For production, set `APP_BASE_URL` to the exact deployed origin, for example `https://your-app.example.com`.
- Add `/auth/callback` for that origin to Auth0 Allowed Callback URLs.
- Add the origin itself to Auth0 Allowed Logout URLs.

Although Next.js 16 introduces `proxy.ts`, this project stays on `src/middleware.ts` because the current OpenNext Cloudflare adapter does not support Node middleware/proxy yet.

## Deploy

```bash
npm run deploy
```

Before deploying, make sure the production environment provides the correct Auth0 variables, especially `APP_BASE_URL`.
