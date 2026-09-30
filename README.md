# StudyMart

StudyMart is a single-owner digital product store built with React, TanStack Start, TanStack Router, Vite, Tailwind CSS, Supabase, and Cloudflare-compatible server configuration.

The application manages published digital products and bundles, customer accounts, carts, checkout, purchases, downloads or streaming access, wishlists, ratings, comments, price alerts, notifications, and a protected admin panel.

## Features

### Customer storefront

- Home page with hero banners, featured products, trending products, categories, recommendations, bundle deals, and recently viewed items.
- Product catalogue with category filtering, text search, and sorting by newest, price, rating, or sales.
- Product pages with previews, pricing, specifications, ratings, comments, wishlist support, price alerts, and cart or buy-now actions.
- Digital product bundles with calculated item totals and savings.
- Guest cart persistence through `localStorage` and authenticated cart persistence through Supabase.
- Email/password sign up, sign in, session persistence, and sign out through Supabase Auth.
- Checkout with coupon validation and stored payment-method selection.
- Order confirmation and purchased-product library.
- Download access for purchased files and signed streaming access for video products.
- In-app notifications and price-drop alerts for signed-in users.

### Admin panel

The `/admin` area is restricted to users with the `admin` role.

- Dashboard and recent order activity.
- Product management, including product images, sellable files, and previews.
- Bundle management.
- Hero banner management.
- Promotion management.
- Coupon management.
- Customer and order management.
- Order delivery status updates.
- Activity logs.
- Notification and Telegram configuration with message templates and test sending.

## How It Works

1. The React/TanStack Start application renders the storefront and admin interface.
2. Supabase provides authentication, PostgreSQL data, row-level security, and object storage.
3. Published products, bundles, banners, promotions, ratings, comments, carts, wishlists, alerts, notifications, and orders are stored in Supabase.
4. Server routes validate authenticated requests and create orders from server-side product prices rather than trusting client-side prices.
5. Product files are stored in the private `product-files` bucket. Purchased files are delivered with short-lived signed URLs. Product images use the public `product-images` bucket.
6. After an order is created, the server can send a Telegram notification. Notification failures are recorded without preventing the order response.
7. Supabase migrations in `supabase/migrations/` define the database schema, RLS policies, triggers, storage policies, and supporting functions.

## Project Structure

```text
.
├── public/                 # Static assets, fonts, favicon
├── src/
│   ├── components/        # Storefront, admin, and reusable UI components
│   ├── hooks/             # React hooks
│   ├── integrations/
│   │   └── supabase/      # Supabase clients, auth middleware, generated types
│   ├── lib/               # Auth, products, bundles, cart, storage, Telegram, etc.
│   ├── routes/            # TanStack Router pages and server API routes
│   ├── assets/            # Bundled product and hero images
│   ├── router.tsx         # Router creation and global error handling
│   ├── routeTree.gen.ts   # Generated TanStack route tree
│   └── styles.css         # Application styles
├── supabase/
│   ├── migrations/        # Database and storage migrations
│   └── config.toml        # Supabase project configuration
├── package.json           # Scripts and dependencies
├── package-lock.json      # npm dependency lockfile
├── bun.lockb              # Bun lockfile
├── vite.config.ts         # Vite/TanStack Start configuration
├── wrangler.jsonc         # Cloudflare deployment configuration
├── tsconfig.json          # TypeScript configuration
├── components.json        # shadcn/ui configuration
├── eslint.config.js       # ESLint configuration
├── .prettierrc            # Prettier configuration
└── .env                   # Local/runtime environment values
```

## Requirements

- Node.js with npm for the commands defined in `package.json`.
- A Supabase project with the repository migrations applied.
- Supabase credentials for both browser and server-side access.
- A Cloudflare environment is only needed when using the Cloudflare deployment configuration.

The repository also includes a Bun lockfile, so Bun is represented as an alternative package manager.

## Installation and Setup

From the project root:

```bash
npm install
```

Create or update the root `.env` file with the variables below. Do not expose server-only credentials in client-side code.

Apply the SQL files in `supabase/migrations/` to the configured Supabase project in filename order. The migrations create the required tables, roles, RLS policies, storage buckets, triggers, and database functions.

Start the development server:

```bash
npm run dev
```

Other available commands:

```bash
npm run build
npm run build:dev
npm run preview
npm run lint
npm run format
```

## Environment Variables and Secrets

The application reads these variables from the environment:

| Variable | Used for |
|---|---|
| `VITE_SUPABASE_URL` | Browser-side Supabase client URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser-side Supabase publishable key |
| `SUPABASE_URL` | Server-side Supabase access and auth validation |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Supabase auth validation |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase admin client used by protected server operations |

`VITE_SUPABASE_*` values are exposed to the browser by the Vite build. `SUPABASE_SERVICE_ROLE_KEY` must remain server-side.

The current source also contains a `VITE_SUPABASE_PROJECT_ID` value in `.env`, but it is not referenced by the application code and is not required by the current implementation.

## Database and Storage

The Supabase schema includes, among other objects:

- Users and profiles
- User roles and admin authorization
- Products and bundles
- Coupons and promotions
- Orders and order items
- Cart items and wishlists
- Product ratings and comments
- Price alerts and notification queue
- Activity logs and application settings

Two storage buckets are defined by the migrations:

| Bucket | Access model |
|---|---|
| `product-images` | Public product images, admin-managed |
| `product-files` | Private sellable files, admin-managed, buyer access through signed URLs |

Preview files are stored under `previews/` inside `product-files` and can be read through signed URLs according to the storage policies.

## Usage and Execution

### Customer flow

```text
Browse products
      ↓
Product / bundle details
      ↓
Cart or Buy now
      ↓
Sign in when checkout requires an account
      ↓
Coupon validation
      ↓
Order creation
      ↓
Order confirmation
      ↓
Library → Download or Watch
```

### Admin flow

```text
Sign in
  ↓
/admin
  ↓
Admin role check
  ↓
Manage products, bundles, banners, promotions, coupons, orders, customers, notifications, and logs
```

The checkout currently records the selected payment method (`card`, `apple`, or `wallet`) and creates the order as `completed`. The repository does not contain an external payment gateway integration.

## Server API Routes

The implemented server routes include:

| Route | Purpose |
|---|---|
| `POST /api/orders/create` | Authenticated order creation, server-side price calculation, coupon handling, order item creation, cart clearing, and order notification |
| `POST /api/coupons/validate` | Validate coupon status, expiry, usage limits, minimum amount, and discount |
| `POST /api/admin/test-telegram` | Send a configured Telegram test message from the admin area |

## Configuration

Important configuration files:

- `vite.config.ts`: project Vite/TanStack Start configuration.
- `wrangler.jsonc`: Cloudflare Worker configuration, including the compatibility date and Node.js compatibility flag.
- `supabase/config.toml`: Supabase project configuration.
- `components.json`: shadcn/ui configuration and source aliases.
- `tsconfig.json`: TypeScript compiler configuration with the `@/*` path alias.
- `.prettierrc`: formatting rules.
- `eslint.config.js`: linting rules.

`src/routeTree.gen.ts` is generated by TanStack Router and should not be edited manually unless the project generation workflow requires it.

## GitHub Actions and Deployment

No `.github/workflows/` directory is included in the repository, so there is no GitHub Actions deployment workflow to configure or maintain.

Cloudflare deployment configuration is present in `wrangler.jsonc`, and the project includes the Cloudflare Vite integration. The repository does not define a dedicated deployment script in `package.json`, so deployment is not automated by the current source tree.

## Troubleshooting

### Missing Supabase environment variables

The client and server Supabase clients throw explicit errors when required variables are missing. Check the `.env` values and the variables supplied by the deployment environment.

### Products do not appear

The storefront queries products with `status = 'published'`. Confirm that the product exists in Supabase and has the published status.

### Admin pages show "Not authorized"

The signed-in user must have an `admin` entry in `public.user_roles`. The admin route also checks the current Supabase session.

### Downloads fail

Check that:

- The purchased product has a valid `file_url`.
- The file exists in the `product-files` bucket.
- The buyer owns an order item for the product.
- The Supabase storage policies from the migrations are applied.

### Telegram notifications do not send

Telegram notifications are configured from the admin notifications page. Confirm that notifications are enabled, the bot token and chat ID are valid, and the configured event includes `order_created`. Failures are recorded in `activity_logs`.

### Checkout does not complete

The order route requires a valid Supabase access token, at least one cart item, and products that are still published. Coupon validation is performed again on the server during order creation.

## Testing

There is no automated test script or test suite defined in `package.json`.

Available repository checks are:

```bash
npm run lint
npm run build
```

Use the development server for manual verification of storefront, authentication, cart, checkout, library, and admin flows.

## Maintenance

- Apply Supabase migrations in order when provisioning or updating the database.
- Keep browser and server Supabase credentials separated.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Update generated Supabase types when the database schema changes.
- Keep `src/routeTree.gen.ts` synchronized with route changes.
- Test both guest and authenticated cart behavior after cart or authentication changes.
- Recheck storage policies whenever download or preview behavior changes.
- Verify order creation and Telegram notification handling after changes to checkout or server routes.
- Run `npm run lint` and `npm run build` before release.

## Notes

The repository contains both `package-lock.json` and `bun.lockb`. Use one package manager consistently for a given environment.

The existing `public/favicon.ico` is the StudyMart favicon and is retained as part of the application assets.
## Deployment

This bundle is configured for Vercel with Nitro for TanStack Start. See `README-DEPLOYMENT.md` for deployment steps.
