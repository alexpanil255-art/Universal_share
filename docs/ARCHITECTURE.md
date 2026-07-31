# Architecture

Everything Share is designed as a **thin cloud relay** between devices, with a **single-codebase UI** that runs everywhere.

```
┌──────────────────┐         WSS (notifications)         ┌──────────────────┐
│  Sender device   │◀────────────────────────────────────│  Receiver device │
│  Expo web / iOS  │                                     │  Expo web / iOS  │
│  Android / SB    │                                     │  Android / SB    │
└──────────────────┘                                     └──────────────────┘
         │                                                        ▲
         │  1. POST /api/files/upload (multipart, to_code=NNNNNN) │
         ▼                                                        │
┌───────────────────────────────────────────────────────────────────────────┐
│                          FastAPI relay backend                            │
│  /api/devices/*   /api/files/*   /api/ws/{device_id}                      │
│                                                                           │
│  • Motor + MongoDB (device & file metadata)                               │
│  • Local disk uploads/{uuid}__{filename}                                  │
│  • In-memory WS connection map (device_id → [WebSocket])                  │
└───────────────────────────────────────────────────────────────────────────┘
```

## Frontend

- **Expo Router 6** for file-based routes: `app/(tabs)/`, `app/preview/[id].tsx`, `app/smartboard/[id].tsx`.
- **State** — two React Contexts:
  - `AppContext` — device identity, theme, colors, backend URL.
  - `TransferContext` — received/sent lists, upload queue, WebSocket lifecycle, and CRUD helpers.
- **Storage** — `@react-native-async-storage/async-storage` wrapped by the shared `@/src/utils/storage` helper.
- **Styling** — `StyleSheet.create` + design tokens from `src/theme/theme.ts` (spacing, radius, typography, light & dark color scales).
- **Glass** — `expo-blur` on native + `backdrop-filter` on web.
- **QR** — `react-native-qrcode-svg` (SVG-based, cross-platform).
- **Previews** — native `<Image>`, `<video>`, `<audio>`, `<iframe>` on web; `react-native-webview` on native.

## Backend

- **FastAPI** with a single `/api` router.
- **MongoDB collections**
  - `devices` — `{ id, code, name, device_type, created_at, last_seen }`
  - `files` — `{ id, filename, size, mime, from_device_id, from_device_name, to_device_id, to_device_name, created_at, favorite, tags, path }`
- **File storage** — files on local disk with a UUID prefix. Never returned in JSON.
- **WebSocket** — `/api/ws/{device_id}` receives `file.received` / `file.sent` events when uploads finish.
- **Streaming** — uploads are streamed to disk 1 MiB at a time, so 10 GB+ transfers do not blow the process memory.

## Extensibility

- **WebRTC LAN P2P** — the WebSocket route can be reused for SDP/ICE signaling; drop-in support for `simple-peer` on the frontend keeps files off the relay entirely.
- **mDNS / Bonjour** — enable in a native (non-Expo Go) build via `react-native-zeroconf`.
- **AES-256 encryption** — encrypt the blob in-browser before upload, decrypt after download; the relay never sees plaintext.
