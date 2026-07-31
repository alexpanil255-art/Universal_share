# Everything Share — Product Requirements Document (PRD)

## Product
Everything Share is an **open-source, privacy-first, no-login** cross-device file sharing app. It works on the web as a PWA and on iOS/Android via Expo, and is designed to feel like AirDrop / Nearby Share without an account or cloud lock-in.

## Users
Anyone who wants to move a file between two devices without setting up an account, dropbox, or messaging app. Prime scenarios:
- Classroom / conference: presenter shares slides with the smart board.
- Home: phone → laptop or laptop → phone quick transfers.
- Office: quick document handoff between colleagues.

## Core requirements

- No login, no email, no phone, no OAuth.
- Devices identify themselves via a persistent 6-digit code + UUID.
- Cross-device transfer of any file type over the internet (cloud relay).
- Real-time incoming notifications via WebSocket.
- Browser + PWA + iOS + Android from a single Expo codebase.
- Built-in previews for images, video, audio, PDF, text, code.
- Smart Board / Presentation mode with annotation toolset.
- Files inbox with search, kind filters, favorites, sent/received, delete.
- Light / dark / system theming.
- Fully open-source: MIT license, README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, issue templates, PR template, CI workflow.

## Non-goals (for v1)

- User accounts, teams, or permissioning.
- E2E encryption (planned for v1.2).
- True LAN P2P (signaling is wired; WebRTC transport planned).
- Folder / drag-and-drop uploads on web (planned).

## Architecture

- **Frontend**: Expo Router 6 web + native. Two Contexts (`AppContext`, `TransferContext`). QR via `react-native-qrcode-svg`. Blur via `expo-blur`. Previews via `<Image>`, `<video>`, `<audio>`, `<iframe>` on web, `react-native-webview` on native.
- **Backend**: FastAPI + Motor + MongoDB. All routes under `/api`. Files streamed to disk 1 MiB at a time. WebSocket at `/api/ws/{device_id}`.
- **Storage**: `backend/uploads/{uuid}__{filename}`. Metadata in Mongo `devices` and `files` collections.

## Key endpoints
See `docs/API.md`.

## Success metrics
- Send a 5 MB image between two browser tabs in < 3 s round-trip on a broadband connection.
- Zero personally-identifiable data collected.
- CI (`.github/workflows/ci.yml`) green on `main`.

## Open source scaffolding

- `LICENSE` (MIT)
- `README.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/ci.yml`
- `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DEPLOYMENT.md`, `docs/ROADMAP.md`
