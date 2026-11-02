# Bantuan WhatsApp (Fonnte)

Disabled by default. No token or production environment changes are included.
The integration uses Fonnte text messages and no paid attachment features.
See the [official send API](https://docs.fonnte.com/api-send-message/).

## Activation

1. Connect the test WhatsApp device in your Fonnte account and obtain its token.
2. Run `php artisan migrate` from `api` using the deployment PHP runtime.
3. Set these values in the server environment (never commit the real token):

   ```dotenv
   BANTUAN_WHATSAPP_ENABLED=true
   BANTUAN_FONNTE_TOKEN=
   BANTUAN_PUBLIC_URL=https://your-public-host.example
   ```

   Fill the token privately. The URL is the frontend origin, optionally with a
   deployment base path. It must be HTTPS and externally reachable from the
   recipient's phone. Localhost, private IPs, credentials, queries, and fragments
   are rejected. Public DNS/reachability is an operator check; enqueue performs
   no synchronous DNS or network calls. Keep the existing `APP_KEY` stable because
   staff phones are encrypted with it.
4. Rebuild Laravel's config cache if used: `php artisan config:cache`.
5. In **Tim & hak akses**, edit/create an operational member, enter their mobile
   number (08… or +628…), and enable WhatsApp only with their agreement. Existing
   members remain opted out. Phone numbers are returned only in the admin staff
   response, never the general staff directory or outbox status response.
6. Ensure the OS scheduler runs `php artisan schedule:run` every minute from
   `api`. On Windows use Task Scheduler with PHP 8.4 and the correct `PHPRC`.
   The provider schedules `bantuan:whatsapp` every minute and `bantuan:remind`
   daily at 08:00 Asia/Jakarta. No queue worker is required; `QUEUE_CONNECTION=sync`
   does not cause network access during a workflow request.
7. Inspect configuration without sending: `php artisan bantuan:whatsapp --status`.
   Admins can also GET `/api/v1/bantuan/whatsapp/status` for aggregate counts and
   recent sanitized results. New actionable workflow notifications and daily
   reminders enqueue delivery. Running `php artisan bantuan:whatsapp` manually
   WILL send pending messages when enabled/configured; it is not a dry run.

## Delivery behavior

`Journal::notify` inserts the notification and calls
`Whatsapp::enqueue($notificationId, $userId, $applicationId, $message)` in the
same database transaction, only after a successful insert. The outbox uniquely
indexes the notification ID. Journal's existing recipient/day deduplication also
applies to daily reminders, now covering all supported pending stages.
The original action code is checked before label translation: only task transition,
assignment/return events and reminders enqueue WhatsApp. Comments, location edits,
draft saves, final outcomes and other FYI messages retain their internal notification
without creating WhatsApp tasks. Internal reason text is never sent to Fonnte.

The worker rechecks active user, active module membership, current roles,
WhatsApp opt-in, decryptable phone, application stage, notification existence,
and verifier/distributor ownership immediately before sending. Admin visibility
alone does not create an operational WhatsApp task. Messages contain only the
application number, a fixed task label, and the authenticated application link;
the arbitrary Journal message is not stored or sent.

The API receives a raw Authorization token, normalized Indonesian target,
`countryCode=0`, and message. A boolean `status: true` means Fonnte accepted the
request, not proof of delivery/read receipt. Connect/request timeouts are 3/10
seconds. Each run processes at most 20 rows by default (`--limit=1..100`). Explicit
refusals and HTTP 429 retry after 5 and 10 minutes, with three attempts maximum.
Provider bodies, targets, and tokens are not logged or stored in the outbox.

Fonnte's send API documents no request idempotency key. To avoid automatic
duplicates, timeouts, ambiguous responses, and abandoned processing claims become
`failed / delivery_unknown` and are not automatically retried. Check Fonnte's
delivery history before arranging any manual follow-up. Accepted sends are never
replayed by repeated worker runs. A provider refusal exhausted after three tries
is recorded as `failed / provider_rejected`.

Set `BANTUAN_WHATSAPP_ENABLED=false` and refresh the config cache to stop enqueue
and outbound processing. Pending messages remain durable; on reactivation the
worker revalidates them. Notifications created while disabled are not backfilled.

## Verification without sends

`tests/Feature/BantuanWhatsappTest.php` uses `Http::fake` and rejects stray HTTP
requests. It covers transactional enqueue/deduplication, disabled/missing config,
HTTPS validation, recipient revocation/reassignment, encrypted phone access,
retries/backoff, ambiguous failures, accepted-send idempotence, and daily reminders.
Run it with the existing workflow/finance suites serially to avoid shared test
storage cleanup collisions. No actual Fonnte account or token is needed.
