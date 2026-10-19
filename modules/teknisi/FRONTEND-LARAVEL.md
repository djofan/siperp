# Teknisi frontend — Laravel contract adaptation

This change targets the Laravel backend merged in main (`e08b6af`). Next.js remains a frontend: authenticated server actions forward FormData through `lib/api.ts`; there are no database imports, Prisma schemas/migrations, Next API handlers, or backend changes in this PR.

## Included

- Compact dark operator workspace; blue-slate central administration, green technician workspace.
- Visible account name, PTH where available, role, and outlet placement.
- Dashboard using `teknisi/monitoring`, with counts and scoped outlet/technician workload.
- Card/table service list with actual supported search, status, outlet, and pagination filters.
- Separate reception and status-update pages; native confirmation dialog before status mutation.
- Concurrency guards `expectedStatus`/`expectedVersion` forwarded to Laravel.
- Separate creation forms for outlet and PTH; existing account edit/delete APIs retained.
- Read-only detail/history, print, customer tracking link, operational summary, existing CSV export.
- Dark login presentation reuses the existing Laravel-backed login form.

## Existing backend constraints (not silently bypassed)

| Requested feature | Current API behavior |
| --- | --- |
| Start work directly from Pending | `received → diagnosis` first, then permitted transitions from `TeknisiContext` |
| Technician closes pickup | `collected` restricted to admin/manager |
| Many technicians in an outlet | Account API still rejects a second active technician |
| Payment/receipt, capital/profit | No corresponding Teknisi endpoint; no financial KPI invented |
| Photos, warranty, pause-aware timer | No persistence/endpoint contract; no fake upload or timer controls |
| Cancellation awaiting physical return | Only `cancelled` available; frontend does not fabricate a new status |
| Shared achievements / outlet transfers | No shared aggregate or placement-history API |
| Edit/deactivate outlet | Create/read only in current routes; no non-working edit button |
| Filtered export | Existing export returns scoped latest 10,000 tickets, not the UI filters |

The richer pre-migration work remains in local backup `backup/teknisi-before-laravel-20261019` and stash; it is not reintroduced as a competing backend. Backend support must land before enabling those additional features.

## Verification

Run `npm test`, `npm run typecheck`, targeted ESLint, and `npm run build`. The frontend tests compare its transition map to the checked-in PHP context. They are not substitutes for live API or browser mutation tests.

Verified on this change: 7 frontend/architecture tests, type generation + TypeScript, targeted ESLint, diff whitespace check, and production build (160 generated pages) passed. Authenticated browser CRUD and Laravel integration tests were not rerun: this checkout has no `api/vendor/autoload.php`, and only PHP 8.3 is available locally. No backend dependencies, credentials, or database configuration were changed to work around that.

No customer data was deleted or reset in this adaptation. No migration was run against Laravel by this PR. One unrelated portability fix replaces four absolute developer-machine type imports in Academy with `@/lib/domain`, necessary for project typechecking on other machines.
