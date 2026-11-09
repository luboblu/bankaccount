# BankHub delivery operations

## Current delivery status

This repository is **not deployable**. QA passed the mock adapter regression suite, but it also recorded missing production prerequisites: real provider/OAuth callback handling, token encryption and rotation implementation, a migration runner, application API/UI features, and performance/availability/security validation. The Docker image is deliberately a verification image, not a runtime service image.

No production deployment, provider registration, or external infrastructure change is authorized by this delivery.

## Local verification

Prerequisites: Node 22 or 24, npm, and Docker Desktop (only for the container/database checks).

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run verify
docker build --target verify .
```

To inspect the schema against a disposable local PostgreSQL instance, copy `.env.example` to `.env`, replace `POSTGRES_PASSWORD`, then run:

```sh
docker compose up -d postgres
docker compose ps
docker compose logs --tail=100 postgres
```

The service is ready only when `docker compose ps` reports `healthy`. Schema initialization occurs only on a new named volume. Do not use this compose file with production credentials or a remotely exposed database port.

Dependency note: `package-lock.json` pins the dependency tree, and this document, the Dockerfile, and CI all install with `npm ci`. TypeScript is pinned exactly in `package.json`.

## Secrets and logs

Keep `.env` out of version control. Store `ENCRYPTION_KEY`, `CRON_SECRET`, database credentials, and provider credentials in the deployment platform's secret manager with separate values per environment. Do not log OAuth codes, access/refresh tokens, encrypted tokens, authorization headers, database URLs, or secret values. Production structured logs should carry a request/correlation ID, route, provider identifier, outcome, latency, and sanitized error code only.

## Deployment gates

Before a runtime deployment is created, all of the following must be evidenced:

1. QA signs off the complete F1–F7 scope and automated tests are green.
2. A real application server has `/health/live` and `/health/ready`; readiness must check required database/cache connectivity without exposing secrets.
3. Versioned, idempotent migrations replace direct `schema.sql` initialization and are tested on a backup copy.
4. AES-256-GCM token encryption, key versioning/rotation, redacted logging, OAuth state/PKCE, redirect allow-listing, and secret scanning are implemented and reviewed.
5. Staging proves backup restore, rollback, TLS, RLS/authorization, rate limits, sync failure alerts, and the stated performance/availability targets.

## Recovery and rollback

For a future release, retain the prior immutable application image and take a verified database backup before migrations. If health checks or error-rate alerts fail, stop traffic to the new release, route back to the prior image, and do not run destructive down-migrations. Restore data only through the approved backup procedure after confirming the restore target and scope. Rotate any secret that may have appeared in logs or diagnostics, revoke affected bank authorizations, and preserve sanitized incident evidence for review.
