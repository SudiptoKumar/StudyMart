# StudyMart deployment: vercel

This package uses the official TanStack Start Vite deployment integration for this platform.

## Required environment variables

The package includes \.env.production with the public Supabase URL/publishable key so the browser client can boot immediately.

Set these server-side values in the vercel dashboard before using server APIs:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY

Never put SUPABASE_SERVICE_ROLE_KEY in a VITE_ variable or in client code.

## Build

npm install
npm run build
