# Deployment guide

Everything Share is two independent services:

- **Frontend** — a static Expo web bundle, deployed to **Vercel**.
- **Backend** — a FastAPI + Motor + WebSocket API, deployed to **Render**.
- **Database** — a **MongoDB Atlas** free-tier cluster (or any Mongo URL you own).

The two are decoupled by a single env var: the frontend calls `${EXPO_PUBLIC_BACKEND_URL}/api/…`.

---

## 1. MongoDB Atlas (free tier)

1. Sign up at <https://cloud.mongodb.com>.
2. Create a **shared M0 cluster** in a region close to your Render service (e.g. AWS `us-east-1`).
3. Under **Database Access**, create a user with read/write on `everything_share`.
4. Under **Network Access**, add `0.0.0.0/0` (or Render's egress IPs) to the IP allow-list.
5. Grab the SRV connection string — it looks like:
   ```
   mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

Save it — you'll paste this into Render as the `MONGO_URL` env var.

---

## 2. Backend on Render

### Option A — one-click blueprint

The repo ships with a [`render.yaml`](../render.yaml) blueprint at the root.

1. Push the repo to GitHub.
2. In Render dashboard → **New → Blueprint**, pick your repo.
3. Render reads `render.yaml` and creates the `everything-share-backend` web service and a 1 GB persistent disk mounted at `/var/data` for uploaded files.
4. When prompted, paste your Atlas connection string into **`MONGO_URL`** (marked `sync: false` so it never lands in git).
5. Deploy.

Your API will be live at:
```
https://everything-share-backend.onrender.com/api/
```

WebSockets automatically work on the same URL under `wss://…/api/ws/{device_id}`.

### Option B — manual

1. In Render dashboard → **New → Web Service**.
2. Connect the GitHub repo, set **Root Directory** to `backend`.
3. **Runtime:** Python 3 · **Build:** `pip install -r requirements.txt` · **Start:** `uvicorn server:app --host 0.0.0.0 --port $PORT`.
4. Environment variables:
   - `MONGO_URL` = your Atlas URL (marked "secret")
   - `DB_NAME` = `everything_share`
   - `UPLOAD_DIR` = `/var/data/uploads`
   - `PYTHON_VERSION` = `3.11.9`
5. (Recommended) Add a **1 GB persistent disk** mounted at `/var/data`. Without a disk, uploads sit on the ephemeral instance filesystem and are lost on each deploy.
6. Deploy.

### Option C — Docker

The repo ships a [`backend/Dockerfile`](../backend/Dockerfile). Pick the "Docker" runtime in Render and the `Dockerfile` will be used automatically — no other configuration needed.

### Health check

Render pings `/api/` — the service returns `{"app": "Everything Share", "status": "ok"}`.

---

## 3. Frontend on Vercel

The repo ships a [`frontend/vercel.json`](../frontend/vercel.json).

1. In Vercel dashboard → **Add New… → Project**, pick your repo.
2. **Root Directory:** `frontend`.
3. Framework preset: **Other** (Vercel will read `vercel.json`).
4. Build settings (Vercel picks these up from `vercel.json`, but you can override):
   - Install command: `yarn install --frozen-lockfile`
   - Build command: `yarn expo export --platform web`
   - Output directory: `dist`
5. **Environment variables**:
   - `EXPO_PUBLIC_BACKEND_URL` = `https://everything-share-backend.onrender.com`
     (or whatever Render assigned in step 2)
6. Click **Deploy**.

Vercel will serve the compiled Expo web bundle as a fully static PWA. The included SPA rewrite (`/((?!api/).*)` → `/index.html`) means deep-linking to `/preview/…` or `/smartboard/…` works on hard-refresh.

### PWA install

The Expo web bundle already ships a manifest and service-worker meta. On desktop Chrome / Edge you'll see "Install app" in the URL bar; on iOS Safari use "Add to Home Screen".

---

## 4. Local development

```bash
# Terminal 1 — MongoDB (Docker or brew or Atlas)
docker run -d --name mongo -p 27017:27017 mongo:7

# Terminal 2 — backend
cd backend
cp .env.example .env         # or export MONGO_URL, DB_NAME
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Terminal 3 — frontend
cd frontend
cp .env.example .env         # points at http://localhost:8001
yarn install
yarn web                     # http://localhost:3000
```

---

## 5. Environment variables summary

| Where     | Variable                    | Example                                                  |
|-----------|-----------------------------|----------------------------------------------------------|
| Render    | `MONGO_URL`                 | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?…`  |
| Render    | `DB_NAME`                   | `everything_share`                                       |
| Render    | `UPLOAD_DIR`                | `/var/data/uploads`                                      |
| Render    | `PYTHON_VERSION`            | `3.11.9`                                                 |
| Vercel    | `EXPO_PUBLIC_BACKEND_URL`   | `https://everything-share-backend.onrender.com`          |

---

## 6. Custom domains (optional)

- **Vercel** — Project → Settings → Domains → add `share.yourdomain.com`.
- **Render** — Service → Settings → Custom Domains → add `api.yourdomain.com`.
- Once both point to their respective platforms, update `EXPO_PUBLIC_BACKEND_URL` on Vercel and redeploy.

---

## 7. Nothing on this stack is Emergent-specific

Both `render.yaml` and `vercel.json` are standard files — you can fork, self-host, or move to Fly.io, Railway, Cloudflare Pages, or a plain nginx VM without any code changes. That's the whole point of Everything Share being open source.
