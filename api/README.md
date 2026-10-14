# Siperp Laravel API foundation

Laravel 13 lives beside the existing Next.js frontend. This is a strangler foundation only: no business module has been migrated, and Next.js still uses its current backend.

## Versions and requirements

Verified locally: Laravel framework 13.36.0 (skeleton 13.0.0), PHP CLI 8.5.8, Composer 2.9.5, Sanctum 4.3.3, Pest 4.7.8, Larastan 3.13.0, Pint 1.32.1. Laravel 13 requires PHP ^8.3. The current lockfile selects Symfony 8.1 packages requiring PHP >=8.4.1 (while Laravel itself requires ^8.3); run `composer check-platform-reqs` on another machine. MySQL access requires PDO MySQL. Install root Node dependencies for the Next auth interoperability tests.

## Isolated development database (Windows cmd)

Never point this application at `sipmodular_db`. Only `sipmodular_laravel_dev` is allowed by the application provider; DB_URL overrides are rejected before application commands can access the database. Do not run migrate:fresh, migrate:refresh or db:wipe on a clone containing Prisma tables. Existing Prisma migrations remain owned by Next.js.

Run these commands in Windows **cmd**, with the MySQL bin directory on PATH. Replace host/user/port as appropriate; `-p` prompts for the password. The source is read only. Create a new target; if it already exists, stop and inspect it rather than replacing it.

```bat
mysql --host=127.0.0.1 --port=3306 --user=root -p --execute="SHOW DATABASES LIKE 'sipmodular_laravel_dev';"
mysqldump --host=127.0.0.1 --port=3306 --user=root -p --single-transaction --no-tablespaces --set-gtid-purged=OFF --result-file="%TEMP%\sipmodular-laravel-dev.sql" sipmodular_db
mysql --host=127.0.0.1 --port=3306 --user=root -p --execute="CREATE DATABASE sipmodular_laravel_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql --host=127.0.0.1 --port=3306 --user=root -p sipmodular_laravel_dev < "%TEMP%\sipmodular-laravel-dev.sql"
del "%TEMP%\sipmodular-laravel-dev.sql"
```

Check each command's exit code before continuing. `--single-transaction` assumes transactional tables; avoid schema changes while dumping. Do not use `--databases`, which would embed the source database name in the dump. For a MariaDB dump client, omit MySQL-specific `--set-gtid-purged=OFF` if unsupported. The local helper `node api/tools/clone-local.mjs` automates the same process using the installed Laragon MySQL client; it refuses an existing target and removes its temporary credential/dump files.

From the repo root, then inside api:

```bat
npm ci
cd api
copy .env.example .env
rem Edit .env: isolated target only, local MySQL credentials, no DB_URL.
composer install
php artisan key:generate
php artisan migrate --pretend
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

The only application migration is `personal_access_tokens`. Laravel's users, password-reset, cache and jobs migrations were removed. A Laravel `migrations` bookkeeping table is created in the clone. Session driver is file, cache store is file, queue connection is sync. APP_TIMEZONE=UTC and DB_TIMEZONE=+00:00 keep application timestamps and the MySQL session in UTC, matching Prisma DateTime storage. Business tables are not recreated or renamed.

`.env`, credentials, storage data, test caches and vendor are ignored. `.env.example` is explicitly unignored even though the root ignores `.env*`. Never commit a populated .env.

## REST contract

All modules must follow [docs/CONVENTIONS.md](docs/CONVENTIONS.md). The active integration contract is [docs/openapi.json](docs/openapi.json); [docs/openapi.example.json](docs/openapi.example.json) is test only. Run `composer docs` to export and `composer docs:check` to detect drift. The REST example never registers production routes. Error bodies now use ErrorResource and all 5xx details are hidden.

## Module conventions

`config/modules.php` explicitly lists Core, Payment, Lazsip, Sip, Academy, Sarsip, Tanwir, Ojol and Teknisi providers. `ModuleServiceProvider` registers them via `bootstrap/providers.php`. Each module provider loads its routes with API middleware and `/api/v1/<module>` prefix. Empty route files reserve future migrations; no module business logic is present.

Each module has Models, Http/Controllers, Http/Requests, Http/Resources, Policies, Events, Listeners, Providers and routes. Use provider register() for bindings, boot() for routes/policies/listeners. Cross-module work should use explicit services/events rather than depending on another module's HTTP controller. All routes use `/api/v1`; shared foundation routes are registered in `routes/api.php`.

Use Form Requests for validation and API Resources for responses. Successful resource responses are wrapped in `data`. Errors use the same envelope for validation, authentication, rate limiting, not found, and unexpected exceptions:

```json
{"error":{"code":"validation_failed","message":"...","details":{"email":["..."]}}}
```

Empty details are an object. HTTP status is preserved, as are exception headers such as Retry-After. Unexpected exception details are logged locally and hidden from clients. Health returns a HealthResource with `status` and `database.status`: HTTP 200 when SELECT 1 succeeds, HTTP 503 with degraded/unavailable when it fails.

`POST /api/v1/auth/login` is a validated placeholder returning 501, not a working login. It demonstrates `throttle:login`: five attempts per minute per normalized email (lowercase/trim) and IP, including failed attempts. The file cache backs the limiter in development. Configure trusted proxies deliberately before production; otherwise IPs behind a proxy may share a limit.

## Bearer authentication boundary

This application uses Sanctum personal access tokens only. There is no statefulApi middleware, no web-session fallback in Sanctum, no stateful domains and no csrf-cookie route. CORS lists http://localhost:3000 for development without credentials; the intended flow has no browser-to-Laravel requests.

On the later Core migration, Next.js will store the raw token in its own HttpOnly cookie. Server Components/Actions read that cookie on the server and attach `Authorization: Bearer <token>` plus `Accept: application/json`. Never expose the token to browser JavaScript, logs or serialized component props. Keep the existing Next action/origin protections at the browser boundary. Login/logout integration and cookie creation are deliberately deferred.

`Core/Auth/TokenIssuer` issues tokens with an explicit expires_at seven days after issuance. Sanctum's global expiration is also 10080 minutes, capping tokens even if an internal caller omits expires_at. Usage updates last_used_at but never extends expiration. Store only Sanctum's SHA-256 token hash in the database. Later logout should delete the token and clear the Next cookie. Expired tokens can be removed with `php artisan sanctum:prune-expired --hours=24`; no scheduler is added in this foundation.

Use `auth:sanctum` followed by `module.access:<slug>` on future protected module routes. The module middleware currently **fails closed with 501**. During Core migration, implement database authorization on every request: check users.is_active; read modules.is_active; apply the approved is_superadmin bypass policy; otherwise query module_access for user/module and role. Do not put module membership in token claims/abilities or cache it as authoritative state. The exact inactive-module/superadmin behavior must match the migrated Core policy. No protected business endpoint is exposed yet.

## Existing Core models, hashes and IDs

The User model maps to `users`, uses non-incrementing string IDs and hides password_hash. Both getAuthPasswordName() and getAuthPassword() explicitly use password_hash. Automatic timestamps are disabled because users has created_at but no updated_at; database defaults fill created_at. Do not add assumed updated_at, remember_token or password columns. Password-reset/remember-me flows are deferred.

HASH_VERIFY=false allows legacy bcryptjs `$2b$` hashes: PHP password_verify accepts them, but password_get_info reports unknown on the local PHP version. BCRYPT_ROUNDS=12 matches Next.js. hashing.rehash_on_login=false prevents Laravel from rewriting hashes during coexistence. Interoperability tests create an account with Next Core createUserWithAccess, authenticate it through Next Core authenticate, and invoke the existing Next HTTP login handler to issue/verify its JWT cookie. They verify that account's database hash in Laravel, update the same disposable account with a Laravel `$2y$` hash, then verify it through bcryptjs and the Next Core login function. No fixed synthetic hash is used for this interoperability test. The existing HTTP login route itself cannot create accounts; the helper uses Core account creation, then the actual login handler, without changing Next code.

Repository searches found no enforced CUID/UUID/ULID regex on row IDs. The Core primary and foreign keys are VARCHAR(191), and Prisma defaults to cuid(). Laravel uses calicastle/cuid's CUID v1 generator via HasPrismaCuid and checks `^c[a-z0-9]{24}$`. Future models that create Prisma-owned rows must use this trait, string key type, and incrementing=false. Both User and Sanctum's custom PersonalAccessToken model use it. The token table's primary ID and tokenable_id are VARCHAR(191); Sanctum's Bearer guard supports string primary keys through the configured model. CUIDs identify rows; they are not secrets or authorization credentials.

## Prisma scanner isolation

The installed Prisma 7.10 loader traverses directories recursively and **does not honor .gitignore** for schema loading. Both nested api/.gitignore and a root vendor ignore were tested with an invalid vendor .prisma probe and did not exclude it.

The one required root configuration exception is `prisma.config.ts`: schema now points to a generated scope from `api/tools/prisma-schema-scope.mjs`. It creates ignored directory junctions under api/storage/app/prisma-scan: core -> original prisma/schema; modules -> original modules. On Unix it uses directory symlinks. The loader resolves these links to original paths, preserving generator output and existing migrations/seed paths. No Prisma schema or Prisma migration is copied, edited or moved. api/vendor and node_modules are outside the scope. This helper uses Node built-ins and does not need Composer installed.

The invalid vendor probe passed validation after scoping. It was removed after verification. Adding a new module schema under modules is discovered automatically; a new schema root requires updating the explicit scope. Do not place a symlink to external schema trees inside modules.

## Verification

Run tests sequentially against the prepared clone. Do not use RefreshDatabase or migrate:fresh: the test suite uses existing Prisma tables. Fixture helper launches the root Node runtime with tsx and react-server conditions; it overrides DATABASE_URL from api/.env and refuses another target. Accounts and their token/log fixtures are removed in finally; the CUID write test rolls back a transaction. npm dependencies and the root generated Prisma client must already exist.

```bat
cd api
php artisan test
composer test
composer analyse
composer lint
rem Format changes if needed:
php vendor/bin/pint
cd ..
npx prisma validate
npm run build
```

Tests cover real Bearer recognition and absolute expiry, token hash storage, both directions of password compatibility through the Next account/login flow, CUID generation, UTC/MySQL health, database failure redaction, login validation/limiting, disabled SPA routes and fail-closed module authorization. See VERIFICATION.md for the completed local run and DESCRIBE comparison.
