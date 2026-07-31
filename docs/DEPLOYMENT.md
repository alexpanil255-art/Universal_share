# Deployment guide

Everything Share is two independent services: a static **Expo web bundle** and a **FastAPI relay backend** with a **MongoDB** database. They can be deployed together or apart.

## 1. Backend — Docker

Create a `Dockerfile` in `backend/`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV UPLOAD_DIR=/data/uploads
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

And a `docker-compose.yml` at the repo root:

```yaml
services:
  mongo:
    image: mongo:7
    volumes: [mongo:/data/db]

  backend:
    build: ./backend
    environment:
      MONGO_URL: mongodb://mongo:27017
      DB_NAME: everything_share
    ports: ["8001:8001"]
    volumes: [uploads:/data/uploads]
    depends_on: [mongo]

volumes:
  mongo:
  uploads:
```

Then:

```bash
docker compose up -d --build
```

Put nginx / Caddy / Traefik in front to terminate TLS.

## 2. Frontend — Static hosting

```bash
cd frontend
EXPO_PUBLIC_BACKEND_URL=https://api.example.com yarn expo export --platform web
```

The compiled bundle lands in `frontend/dist/` — deploy it to any static host:

- **Vercel** — `vercel --prod dist`
- **Netlify** — drag & drop `dist/` into the dashboard
- **Cloudflare Pages** — connect the repo, build command `yarn expo export --platform web`, publish dir `dist/`
- **GitHub Pages** — push `dist/` to a `gh-pages` branch

## 3. PWA install

The bundle already ships with a manifest via Expo. On desktop Chrome / Edge you'll see "Install app" in the URL bar; on iOS Safari use "Add to Home Screen".

## 4. Mobile builds

Use `eas build --platform ios` or `--platform android` after configuring `eas.json`. On the Emergent platform, click **Publish** at the top-right and enter the credentials the wizard asks for.

## 5. Environment variables

Frontend (`frontend/.env`):
- `EXPO_PUBLIC_BACKEND_URL` — public URL of the FastAPI service.

Backend (`backend/.env`):
- `MONGO_URL` — MongoDB connection string.
- `DB_NAME` — database name (default: `everything_share`).

## 6. Reverse proxy hint

Any path prefixed with `/api` (including WebSockets under `/api/ws/`) must be routed to port `8001`. Example nginx snippet:

```nginx
location /api {
  proxy_pass http://backend:8001;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
}
```
