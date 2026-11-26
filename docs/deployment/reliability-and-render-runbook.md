# FreeLLMAPI reliability and upgrade runbook

This runbook documents the safe deployment path for the Android/Termux-compatible FreeLLMAPI server. It deliberately does not enable OIDC or social login.

## Important availability limitation

A Render free web service sleeps after 15 minutes without inbound traffic. The first request after sleep starts the instance and can be slow. Application changes, health checks, and scheduled jobs inside the process do not prevent this platform-level sleep. Do not add a self-ping/keep-alive loop to evade the free-tier policy: it is unreliable and can violate provider terms.

For genuinely always-on service, use a paid always-on instance or a hosting provider whose free tier explicitly guarantees continuously running containers. Keep the Android app as a client; it does not need to be moved to the cloud.

## Render service settings

For the existing Docker-based service:

- Runtime: Docker, using the repository Dockerfile.
- Health check path: `/api/ping` (the Dockerfile already probes this route).
- Bind address: `0.0.0.0`; listen on the platform-provided `PORT`.
- Keep exactly one active production service pointed at this repository/branch. Do not accidentally deploy the upstream project's separate service as production.
- On a paid Render instance, attach a persistent disk mounted at `/app/server/data`. The SQLite database is stored under this directory by default.
- Do not attach a disk to a free Render web service; persistent disks require an eligible paid service.

## Required secrets and persistence

Never commit secrets to Git. Set them in the hosting provider's environment-variable panel:

- `ENCRYPTION_KEY`: stable 64-character hexadecimal key. Back it up securely. Changing it can make encrypted provider keys already stored in SQLite unreadable.
- `FREEAPI_DB_PATH`: optional; leave unset to use the application's default database path under `server/data`.
- `FREEAPI_DB_BACKUP_TARGET`: optional encrypted backup destination. The server also recognizes the legacy `FREEAPI_DB_BACKUP_URL` and `FREEAPI_DB_BACKUP_PATH` names.
- `FREEAPI_DB_BACKUP_KEY`: optional 64-character hexadecimal backup encryption key; if omitted, the backup implementation can use `ENCRYPTION_KEY`.

The backup target must be a destination supported by the current implementation. For Hugging Face, configure a private repository/file resolve URL and a token in the matching backup-token environment setting documented by the implementation; do not assume a public URL is writable. Verify an actual backup and restore before relying on it.

The application already includes a periodic encrypted database backup pump and restore-on-start logic. Confirm its logs report successful uploads/restores after configuring a destination. A backup is not a substitute for testing restore.

## Android / Termux

For a server running locally on Android rather than Render:

- Run the supported Node.js version (see root `package.json` engines).
- Use the documented Termux startup command and grant Android battery/background exemptions as needed.
- A Termux wake lock can reduce Android suspension but cannot guarantee uptime if Android kills the process, the device loses power, or connectivity is lost.
- Keep the remote Render URL and the local Termux URL distinct in client settings.

## Operational checks

1. Request `GET /api/ping`; expect a successful response.
2. Request `GET /api/health` using the configured admin session; this is provider/key health, not the platform liveness probe.
3. Confirm the startup log reports the expected database path and that the setup/admin state is intact.
4. Confirm backup upload success, then perform a controlled restore test in a non-production environment.
5. Check Render Events and Logs for deploys, SIGTERM, health-check failures, and cold starts.
6. Test OpenAI-compatible chat completions, embeddings, image/vision routes where configured, and provider fallback with known-good test keys.

## Upstream feature integration policy

The upstream repository is an active, independently evolving project. Do not blindly merge its main branch into this customized fork. Review each commit/PR and preserve local changes. Explicitly exclude OIDC/social-login work until separately approved. For each selected upstream change:

- inspect changed files and migration requirements;
- check for authentication, setup-code, encryption, and environment-variable changes;
- run `npm ci`, `npm test`, `npm run lint`, and `npm run build`;
- test database migrations against a disposable copy;
- deploy to a staging service before production.

## Scope of this runbook

This document changes no runtime behavior and does not claim that a deployment, migration, provider integration, or uptime guarantee has been completed. It is the operational checklist for the next verified release.
