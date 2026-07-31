# Security Policy

## Supported versions

The `main` branch always receives security fixes. Tagged releases from the last 90 days also receive patches.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems. Instead:

1. Email the maintainers at `security@everythingshare.dev` **or**
2. Open a private GitHub Security Advisory ("Security" tab → "Report a vulnerability").

Include:

- A description of the issue and its potential impact.
- Steps to reproduce.
- Your suggested fix (optional but appreciated).

We aim to acknowledge within **48 hours** and ship a patch (or a mitigation) within **7 days** for high-severity issues.

## Hardening notes

- The relay backend never persists user credentials — there are none.
- File uploads are stored under `backend/uploads/` with random UUID prefixes; do not expose that directory directly to the internet.
- For production, terminate TLS at your reverse proxy (nginx, Caddy, Traefik).
- If you enable public sharing codes, rotate them periodically; the code is only 6 digits (~1M combinations).
