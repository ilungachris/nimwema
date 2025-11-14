<!-- Copilot / AI agent instructions for the Nimwema codebase -->
# Nimwema — Copilot Instructions

These instructions summarize the architecture, conventions and concrete examples an AI coding agent needs to be productive in this repository.

1) Big picture
- **Server:** `server.js` is the consolidated Express application and the primary entrypoint (see `package.json` -> `main`). Many other `server-*.js` variants exist (history/experiments) but `server.js` is the canonical runtime.
- **Services:** `services/` contains domain services (e.g. `services/auth.js`, `services/sms.js`, `services/flexpay.js`). Business logic and in-memory defaults live here.
- **Middleware:** `middleware/` holds route-level helpers (`middleware/auth.js` implements `requireAuth`, `requireRole`, and `optionalAuth`). Use these for routes requiring authentication/roles.
- **Database:** `database/connection.js` is a pool wrapper around `pg`. SQL schemas/migrations live under `database/` (`schema.sql`, `auth_schema.sql`). The code supports both `DATABASE_URL` and discrete DB env vars.
- **Public UI:** `public/` contains static client pages (admin/merchant dashboards, checkout flows) served via `express.static()`.

2) Run & debug (concrete)
- Start (production-like): `npm start` (runs `node server.js`).
- Dev (auto-reload): `npm run dev` (requires `nodemon` in `devDependencies`).
- Node engine: `>=18.0.0` (see `package.json` `engines`).
- Database: the app attempts to `db.connect()` on startup. If `DATABASE_URL` is present, it uses that; otherwise it uses `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` and optional `DB_SSL=true`.

3) Important environment variables
- `SESSION_SECRET` — session cookie secret.
- `DATABASE_URL` or `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD` — Postgres connection.
- `FLEXPAY_TOKEN`, `FLEXPAY_MERCHANT`, `APP_BASE_URL` — required for FlexPay payment flows. Use `assertFlexpayEnv()`-style checks found in `server.js`.
- `VOUCHER_CODE_LENGTH` — optional, controls voucher code length.

4) Authentication & sessions (project-specific patterns)
- `services/auth.js` currently implements an in-memory auth system (maps for users, sessions, merchants, cashiers) and seeds default credentials for local/dev testing:
  - `admin@nimwema.cd` / `Admin@2024`
  - `merchant@test.cd` / `Merchant@2024`
  - `cashier@test.cd` / `Cashier@2024`
- `middleware/auth.js` expects session tokens in `req.cookies.sessionToken` or header `x-session-token` and validates via `authService.validateSession()`.
- Note: `server.js` sometimes checks `req.cookies.sessionId` in other flows — prefer the `services/auth` token patterns and `middleware/auth` for new work. Avoid assumptions: audit usages when changing auth.

5) Data storage & fallbacks
- The codebase mixes real DB usage and an in-memory fallback used for demos. See `server.js`'s `data = { ... }` object and usages of `global.orders`. When adding new persistent features, prefer `database/queries.js` + SQL migrations. When changing memory fallbacks, keep both DB and in-memory updates in sync (the code does this in several endpoints).

6) Common endpoints & examples (useful for tests/changes)
- Create order (in-memory + DB attempt): `POST /api/orders/create` — constructs `orderId` and stores in `global.orders`.
- Create vouchers (pending + DB): `POST /api/vouchers/create-pending` — calculates subtotal/fees; may create a DB user if payment method is `cash` or `bank`.
- Auth check: `GET /api/auth/me` — returns current user from session cookie/token.

7) Services & external integrations
- `services/sms.js` — wrapper for sending SMS (used by `server.js`'s `sendSMSNotification`). Tests and local runs rely on this being available (may be mocked in unit tests).
- FlexPay: `services/flexpay.js` implements FlexPay-specific flows; `server.js` builds FlexPay auth headers and references `FLEXPAY_BASE_URL`.
- Third-party libs: `pg`, `express`, `axios`, `bcrypt`, `jsonwebtoken`, `multer`, `uuid`.

8) Codebase conventions & gotchas
- Multiple `server-*.js` files exist (development history). Use `server.js` for productive changes unless the task explicitly targets another variant.
- Mixed session naming: both `sessionId` and `sessionToken` appear. `middleware/auth.js` reads `sessionToken` — prefer that. If you modify authentication, search for both names.
- In-memory defaults: `services/auth.js` seeds users on service startup — useful for local testing. Do not hard-code these credentials into production releases.
- DB queries are executed via `database/connection.js` -> `db.query(text, params)`; use `db.transaction` for multi-step commits.

9) Editing guidance for AI agents
- Scope changes narrowly and preserve existing public APIs and file layout. Example: add a new `/api/admin/...` route in `server.js` and wire `requireAdmin` from `middleware/auth.js`.
- When adding DB columns or tables, update `database/schema.sql` or `auth_schema.sql` and mirror `database/queries.js` where helper functions live.
- Prefer using `services/*` for business logic and keep `server.js` focused on routing and orchestration.

10) Testing & next steps
- There are no automated tests configured (`package.json.test` is placeholder). For iterative changes, run `npm run dev` and exercise endpoints via `public/` pages or curl/Postman.

If any section is unclear or you want more examples (e.g., sample SQL migration, auth flow call sites, or where SMS is called), tell me which area to expand and I will iterate.
