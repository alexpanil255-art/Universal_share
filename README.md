# Everything Share

**No login. No account. No cloud lock-in. Just share.**

Everything Share is an open-source, privacy-first file sharing app that works on **any device with a browser** and installs as a **PWA** on phones, tablets, laptops, desktops, and smart boards. It ships as a single **Expo (React Native Web)** codebase with a lightweight **FastAPI + MongoDB** relay backend, so you can send images, videos, PDFs, documents, or _any_ file between devices with a 6-digit code — no accounts, no ads, no tracking.

<p align="center">
  <b>Web · Android · iOS · Windows · macOS · Linux · Smart Boards</b>
</p>

---

## Features

- **Zero-account onboarding** — pick a device name, get a persistent 6-digit code, done.
- **Cross-device transfers** — phone → laptop → smart board, in any direction.
- **QR + 6-digit pairing** — scan or type, no configuration.
- **Cloud-relay + WebRTC-ready** — works over the internet today; the backend exposes a signaling WS so LAN P2P can be enabled in a native build.
- **Live incoming notifications** via WebSocket.
- **In-app previews** — images, video, audio, PDFs, text, code, HTML.
- **Smart Board / Presentation mode** — fullscreen canvas with pen, highlighter, laser pointer, eraser, color palette, and presentation timer.
- **Files inbox** with search, kind filters (Images / Videos / PDFs / Docs / Audio), favorites, sent/received tabs, delete.
- **Light / Dark / System theming**, glassmorphic UI inspired by AirDrop, Google Drive, and Microsoft Whiteboard.
- **Responsive** from 320px phones up to 4K smart boards.

## Tech stack

| Layer      | Choice                                            |
|------------|---------------------------------------------------|
| UI         | Expo Router 6 + React Native + react-native-web   |
| Animation  | Reanimated 4, expo-blur                           |
| Backend    | FastAPI 0.110, Uvicorn                            |
| Realtime   | Native WebSockets (`/api/ws/{device_id}`)         |
| Database   | MongoDB (via Motor)                               |
| Storage    | Local filesystem under `backend/uploads/`         |

## Project layout

```
.
├── backend/                # FastAPI app (server.py, uploads/, requirements.txt)
├── frontend/               # Expo app (app/, src/, app.json)
│   ├── app/                # Expo Router routes: (tabs)/, preview/, smartboard/
│   └── src/                # theme, contexts, components, utils
├── docs/                   # Architecture & deployment docs
├── .github/                # Issue templates, PR template, CI workflows
├── LICENSE                 # MIT
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
└── README.md
```

## Running locally

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="everything_share"
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The API listens on `http://localhost:8001/api` and exposes a WebSocket at `ws://localhost:8001/api/ws/{device_id}`.

### 2. Frontend (Expo)

```bash
cd frontend
yarn install
echo 'EXPO_PUBLIC_BACKEND_URL=http://localhost:8001' > .env
yarn web       # for the browser / PWA
yarn ios       # for iOS simulator (requires Xcode)
yarn android   # for Android emulator (requires Android Studio)
```

Open `http://localhost:3000` on two devices (or two browser tabs) and enter one device's 6-digit code in the other to start transferring files.

## Building / deploying

Everything Share is designed to run on **Vercel (frontend) + Render (backend) + MongoDB Atlas (database)** — all three have free tiers. Full step-by-step in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

- **Frontend → Vercel** — the repo ships [`frontend/vercel.json`](frontend/vercel.json). Import the repo, set root to `frontend/`, and add `EXPO_PUBLIC_BACKEND_URL` pointing at your Render service.
- **Backend → Render** — the repo ships a Blueprint at [`render.yaml`](render.yaml) and a [`backend/Dockerfile`](backend/Dockerfile). Import the repo as a Blueprint, paste your MongoDB Atlas connection string as `MONGO_URL`, and deploy.
- **Web / PWA (self-host)** — `yarn expo export --platform web` produces a static bundle you can also host on Netlify, Cloudflare Pages, S3, or GitHub Pages.
- **iOS / Android** — use `eas build` or the Emergent one-click deploy flow.

One-click badges (add these after pushing to GitHub):

```md
[![Deploy backend on Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/<you>/everything-share)
[![Deploy frontend on Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/<you>/everything-share&root-directory=frontend&env=EXPO_PUBLIC_BACKEND_URL)
```

## API overview

| Method | Route                                     | Description                        |
|--------|-------------------------------------------|------------------------------------|
| POST   | `/api/devices/register`                   | Create a device (no auth)          |
| GET    | `/api/devices/{id}`                       | Fetch a device                     |
| PATCH  | `/api/devices/{id}`                       | Rename a device                    |
| GET    | `/api/devices/code/{code}`                | Resolve device by 6-digit code     |
| GET    | `/api/devices/{id}/peers`                 | Recent transfer peers              |
| POST   | `/api/files/upload`                       | Multipart upload with `to_code`    |
| GET    | `/api/files/received/{deviceId}`          | Files this device received         |
| GET    | `/api/files/sent/{deviceId}`              | Files this device sent             |
| GET    | `/api/files/all/{deviceId}`               | All files touching this device     |
| GET    | `/api/files/search/{deviceId}?q=&kind=`   | Search + filter                    |
| GET    | `/api/files/{fileId}`                     | File metadata                      |
| GET    | `/api/files/{fileId}/download`            | Binary download                    |
| PATCH  | `/api/files/{fileId}/favorite`            | Toggle favorite                    |
| DELETE | `/api/files/{fileId}`                     | Remove file + metadata             |
| WS     | `/api/ws/{deviceId}`                      | Real-time notifications            |

Full request/response contracts live in [`docs/API.md`](docs/API.md).

## Privacy

- No login, no email, no phone number, no third-party auth.
- No analytics, no advertising SDKs, no telemetry.
- Files are stored **only** on the relay backend you control; delete them anytime.
- The frontend stores only a device UUID + name in the browser's local storage.

## Contributing

We welcome bug reports, feature ideas, and pull requests! Read [`CONTRIBUTING.md`](CONTRIBUTING.md) to get started, follow the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md), and open an issue with one of the templates under `.github/ISSUE_TEMPLATE/`.

## Roadmap

Full roadmap in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## License

MIT © Everything Share contributors — see [`LICENSE`](LICENSE).
