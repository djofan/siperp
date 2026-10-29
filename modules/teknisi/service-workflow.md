# Service workflow

Runtime database: MySQL. Next.js forwards authenticated FormData; Laravel owns validation, transitions, uploads and transactions.

## Stages

1. Create from All or Pending. Customer, device, complaint, estimate and before photo are saved. Type: normal or warranty.
2. Pending: inspect reception data/photos, then confirm Start; no diagnosis field required. Start time is recorded.
3. Process: Complete requires diagnosis, treatment, capital, final price, after photo and warranty days (0–365).
4. Ready: Pickup requires exact final amount, cash/transfer/QRIS (or warranty without charge), receiver name/phone and handover photo. Transfer/QRIS requires payment evidence.
5. Finish: payment is counted once; history and documents remain available. Warranty starts at pickup, not Ready.
6. Active warranty creates a new linked Pending ticket. The original Finish ticket and financial entry remain unchanged. One active claim per parent; same outlet and device/customer. Warranty final price must be zero.
7. Cancel requires a reason, keeps history and moves to Cancelled. Staff must physically return the device. No implicit revenue.

## Data and privacy

- Additive migration: `2026_10_20_000000_add_teknisi_service_workflow.php`; no destructive data reset.
- Existing tickets remain. Legacy intermediate states appear under Pending. Legacy Ready tickets missing a final amount must complete the repair form before pickup.
- All mutations enforce server authorization, outlet scope, expected status/version and row locks.
- Before/after/payment/handover media is private and served only through authenticated scoped Laravel routes; never included in public tracking.
- Photos: JPG/PNG/WebP, max 4 MB each. No PDF/SVG. Max 3 files on pickup remains within the 14 MB Next Server Action limit.
- Financial figures count only recorded Finish handovers in the selected Jakarta date range; gross profit = final price minus capital, excluding operating expenses. Old records with unknown payment are not assumed paid.
- Form drafts use tab-scoped sessionStorage for 24 hours, keyed by account, ticket and stage. Text and selected files survive validation failure while mounted. Files must be reselected after a page refresh; browsers cannot persist file input permissions.
- Status/search/outlet/page are encoded in the URL; successful actions navigate to their destination stage.

## Verification

- `php vendor/pestphp/pest/bin/pest --configuration phpunit.xml`: isolated regression tests.
- `php tools/verify-teknisi-workflow.php`: real local MySQL smoke test. Only permits local `sipmodular_laravel_dev`; wraps fixtures/tokens in a transaction and rolls everything back, with uploads on a unique temporary testing disk.
- `npm test`, targeted ESLint, TypeScript and production build.

The API retains legacy endpoints for old records. Workflow-backed tickets cannot bypass required steps through the old generic update endpoint.
