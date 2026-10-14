# Verification — 2026-10-14 (Asia/Jakarta)

Branch: feature/laravel-api, created from latest main at 306a8c8. No worktree was created and no commit was made.

## Completed checks

| Command | Result |
| --- | --- |
| php artisan test | PASS: 12 tests, 181 assertions |
| composer analyse | PASS: Larastan level 5, 45 application/route/bootstrap/example files, no errors |
| composer lint | PASS: Pint --test |
| npx prisma validate (root) | PASS: scoped schema roots |
| npm run build (root) | PASS: Next.js 16.3.5, compilation, TypeScript and 197 generated pages |
| npx prisma generate (root) | PASS: client still generated to generated/prisma |
| composer validate --strict | PASS |
| composer check-platform-reqs | PASS on PHP 8.5.8 |
| git diff --check | PASS |

Laravel framework 13.36.0, PHP 8.5.8, Composer 2.9.5. Laravel requires PHP ^8.3; current locked Symfony dependencies require >=8.4.1. No dependency versions in the Next root package manifest or lockfile were changed.

Tests create a disposable account through Next Core createUserWithAccess on the clone and invoke the existing HTTP login handler. Its bcryptjs $2b$12$ hash is verified by Laravel. Laravel creates a $2y$12$ hash for that same account and bcryptjs plus the Next HTTP login handler accept it. No persisted fixture credentials are committed. The bearer test issues a real database-backed token, sends it through auth:sanctum, uses it one second before expiration and confirms rejection exactly seven days after issuance. Both user and token IDs match CUID v1.

## DESCRIBE comparison

Re-read after the token migration and tests with `php tools/inspect-local.php`. Target reported sipmodular_laravel_dev, MySQL session timezone +00:00. These match the earlier repo schema/migration inventory; **no missing, extra or changed columns were found**.

| Table | Field | Actual type | Nullable | Default | DESCRIBE key |
| --- | --- | --- | --- | --- | --- |
| users | id | varchar(191) | No | none | PRI |
| users | name | varchar(191) | No | none | — |
| users | email | varchar(191) | No | none | UNI |
| users | password_hash | varchar(191) | No | none | — |
| users | is_superadmin | tinyint(1) | No | 0 | — |
| users | created_at | datetime(3) | No | current_timestamp(3) | — |
| users | is_active | tinyint(1) | No | 1 | — |
| modules | id | varchar(191) | No | none | PRI |
| modules | slug | varchar(191) | No | none | UNI |
| modules | name | varchar(191) | No | none | — |
| modules | description | text | Yes | NULL | — |
| modules | is_active | tinyint(1) | No | 1 | — |
| module_access | id | varchar(191) | No | none | PRI |
| module_access | user_id | varchar(191) | No | none | MUL |
| module_access | module_id | varchar(191) | No | none | MUL |
| module_access | role | varchar(191) | No | admin | — |
| module_access | created_at | datetime(3) | No | current_timestamp(3) | — |
| access_logs | id | varchar(191) | No | none | PRI |
| access_logs | message | text | No | none | — |
| access_logs | created_at | datetime(3) | No | current_timestamp(3) | — |

All Extra values were empty. MySQL represents the schema's Boolean columns as tinyint(1); that is not a structural difference. DESCRIBE's MUL marker is not a full composite-index/foreign-key description. None of the four tables has updated_at; modules has no created_at either. Existing created_at defaults remain unchanged.

Only the personal_access_tokens migration is recorded in Laravel's migration table. Laravel's users/cache/jobs/reset-token migrations are absent. The final inspection found 0 test users, 0 test activity logs, and 0 personal access tokens remaining. Migrations, fixture writes and cleanup ran only against the clone. The original database was read for the dump and by the unchanged Next build; no Laravel migration was run against it.

## Prisma vendor exclusion proof and scope exception

1. With schema='.', place deliberately invalid Prisma text in api/vendor/prisma-ignore-probe.prisma.
2. Prisma validate fails P1012 at that vendor file, despite api/.gitignore's /vendor/ rule.
3. Adding /api/vendor/ to root .gitignore also fails to exclude the probe. That ineffective root change was removed.
4. Restrict schema scanning through the ignored junction scope in api/tools/prisma-schema-scope.mjs.
5. Prisma validate passes while the invalid vendor probe still exists.
6. Remove the temporary probe, rerun validate and generate. Both pass; output remains generated/prisma.

The sole tracked root change is prisma.config.ts, required under task rule 9 to scope Prisma scanning. All other new files are under api/, including documentation. No Next app code, Prisma schema, Prisma migration, root package manifest or root dependency lockfile was modified. api/.env, api/vendor and temporary schema junctions are ignored; api/.env.example is included.

The first build in the restricted Windows sandbox failed canonicalizing Next's baseUrl with Access denied. Running the same build with the required filesystem access passed. Some PHP tooling and junction creation also required full local filesystem access in this environment. These are sandbox restrictions, not application test failures.

## Remaining migration boundaries

Only GET /api/v1/health (also HEAD) and POST /api/v1/auth/login are registered in production. Login is still a 501 placeholder. Module authorization middleware fails closed until Core migration implements database checks. No Next token cookie/forwarding integration, module business endpoint, password reset or scheduler was migrated in this foundation.


## REST addition — completed verification

The shared REST conventions are in docs/CONVENTIONS.md, with references in every module route scaffold. Richardson Level 2 is the target. API authentication remains stateless Bearer; production middleware has no StartSession and cookies alone are rejected in the resource test. Sanctum token audit last_used_at remains an incidental authentication write on GET, as documented; GET does not mutate business resource state.

The new ErrorResource handles every JSON error, including malformed JSON 400. All 5xx, including the existing placeholder 501, now hide their original exception message. CollectionRequest bounds per_page at 100 and supports documented filter/sort/q conventions. IdempotentCreationRequest validates the header rather than trusting a body value.

Example: tests/Fixtures/Rest/PaymentAttemptController.php, registered through Route::apiResource only inside tests, uses /api/v1/examples/payment-attempts. No business module, production route or persistent database table was added.

| Operation demonstrated | Result asserted |
| --- | --- |
| GET collection with filter[status], sort=-amount, q, page/per_page | 200, data/meta/links, correct page and preserved query links |
| GET one resource | 200 with explicitly whitelisted id/name/amount/status; resource store unchanged |
| POST creation with Idempotency-Key | 201 + Location, CUID v1, replay same response with no duplicate |
| Same key with changed payload | 409 conflict; no duplicate |
| PUT full writable representation | 200; missing writable fields produce 422 |
| PATCH partial representation | 200; omitted fields preserved, empty update produces 422 |
| DELETE | 204, empty body; subsequent GET returns 404 |
| No Bearer / cookie-only / foreign owner / missing resource | 401 / 401 / 403 / 404 |
| Invalid query, missing key, malformed JSON, limiter | 422 / 422 / 400 / 429 |
| Unexpected exception / placeholder | 500 / 501, generic message without internal details |

Test-only idempotency uses in-memory resource state and proves sequential replay/conflict plus per-user scope. It does not claim durable or cross-worker payment deduplication. Persistent atomic idempotency is required by the convention for the later Payment migration.

OpenAPI 3.1.0 artifacts: docs/openapi.json for the two real routes; docs/openapi.example.json for the non-production example. `composer docs` generates them from an explicit contract definition; `composer docs:check` passed. The contract tests compare live route/method registration and validate actual JSON responses and required headers with the root locked AJV dependency. This explicit generator is used instead of Scramble/Scribe; it does not automatically infer newly added controllers. Every new route must update its contract and tests. The schema validator checks the used JSON Schema subset, not the entire OpenAPI document.

Final checks after this addition: php artisan test 12 passed / 181 assertions; composer analyse no errors; composer lint passed; composer docs:check passed; composer validate --strict passed; root npx prisma validate passed; root npm run build passed including TypeScript and 197 generated pages. DESCRIBE was re-read and remains identical to the table above; the clone still has only the token migration and 0 remaining fixture users/logs/tokens. Production route:list still contains only health and login placeholder.

Working tree remains api/ plus the previously documented prisma.config.ts scanner-isolation exception. No Next.js code, Prisma schema or Prisma migration was changed by the REST addition. No commit was made.
