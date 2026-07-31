# API reference

Base URL: `${EXPO_PUBLIC_BACKEND_URL}/api`

All endpoints return JSON except `GET /files/{id}/download`, which streams the raw file. There is **no authentication** — devices identify themselves via their UUID.

---

## Devices

### `POST /devices/register`

Body:
```json
{ "name": "Alex's iPhone", "device_type": "phone" }
```
Response `200`:
```json
{
  "id": "uuid",
  "code": "123456",
  "name": "Alex's iPhone",
  "device_type": "phone",
  "created_at": "2026-02-01T12:00:00+00:00",
  "last_seen": "2026-02-01T12:00:00+00:00"
}
```

### `GET /devices/{id}`
Returns the device or `404`.

### `PATCH /devices/{id}`
Body may contain `name` and/or `device_type`. Returns the updated device.

### `GET /devices/code/{code}`
Resolves a 6-digit code → device metadata. Returns `404` if unknown.

### `GET /devices/{id}/peers?limit=10`
Returns up to `limit` devices this device has exchanged files with, most recent first.

---

## Files

### `POST /files/upload` (multipart)
Fields:
- `from_device_id` — sender's UUID
- `to_code` — recipient's 6-digit code
- `file` — the binary payload

Response `200` — a `FileMeta` document:
```json
{
  "id": "uuid",
  "filename": "photo.jpg",
  "size": 342117,
  "mime": "image/jpeg",
  "from_device_id": "…",
  "from_device_name": "Alex's iPhone",
  "to_device_id": "…",
  "to_device_name": "Family Board",
  "created_at": "2026-02-01T12:04:11+00:00",
  "favorite": false,
  "tags": []
}
```

Errors:
- `404` — unknown `from_device_id` or `to_code`.

### `GET /files/received/{device_id}`
List files this device received (most recent first, limit 200).

### `GET /files/sent/{device_id}`
List files this device sent.

### `GET /files/all/{device_id}`
All files touching this device (sent + received).

### `GET /files/search/{device_id}?q=…&kind=image|video|audio|pdf|doc|all`
Full-text search on filename, optional MIME-kind filter.

### `GET /files/{file_id}`
Metadata for a single file.

### `GET /files/{file_id}/download`
Streams the file with the original filename and MIME. Returns `410` if the file was deleted on disk.

### `PATCH /files/{file_id}/favorite`
Body: `{ "favorite": true }`. Returns the updated `FileMeta`.

### `DELETE /files/{file_id}`
Removes the file from disk and the metadata doc. Returns `{ "ok": true, "id": "…" }`.

---

## WebSocket

### `WS /api/ws/{device_id}`

On connect the server sends:
```json
{ "type": "connected", "device_id": "…" }
```

Server → client events:
- `{ "type": "file.received", "file": FileMeta }` — a new file has arrived for this device.
- `{ "type": "file.sent",     "file": FileMeta }` — one of this device's uploads finished (useful for multi-tab sync).
- `{ "type": "pong", "t": "…" }` — response to a `{ "type": "ping" }` heartbeat.

Client → server events (optional):
- `{ "type": "ping" }` — keepalive.
