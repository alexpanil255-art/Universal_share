"""Everything Share — FastAPI backend.

Handles device registration (no auth), file transfer between paired devices
via a persistent 6-digit code, transfer history, and real-time incoming-file
notifications via WebSockets.
"""
from __future__ import annotations

import logging
import mimetypes
import os
import random
import string
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", ROOT_DIR / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Everything Share API", version="1.0.0")
api = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("everything-share")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DeviceRegister(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    device_type: str = Field(default="phone")  # phone, tablet, laptop, desktop, board


class Device(BaseModel):
    id: str
    code: str
    name: str
    device_type: str
    created_at: str
    last_seen: str


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None


class FileMeta(BaseModel):
    id: str
    filename: str
    size: int
    mime: str
    from_device_id: str
    from_device_name: str
    to_device_id: str
    to_device_name: str
    created_at: str
    favorite: bool = False
    tags: List[str] = []


class ToggleFavoriteBody(BaseModel):
    favorite: bool


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def gen_code() -> str:
    return "".join(random.choices(string.digits, k=6))


async def make_unique_code() -> str:
    for _ in range(20):
        code = gen_code()
        exists = await db.devices.find_one({"code": code}, {"_id": 0, "id": 1})
        if not exists:
            return code
    # extremely unlikely fallback
    return gen_code()


def clean(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ---------------------------------------------------------------------------
# WebSocket manager
# ---------------------------------------------------------------------------
class WSManager:
    def __init__(self) -> None:
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, device_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.connections.setdefault(device_id, []).append(ws)

    def disconnect(self, device_id: str, ws: WebSocket) -> None:
        conns = self.connections.get(device_id, [])
        if ws in conns:
            conns.remove(ws)
        if not conns:
            self.connections.pop(device_id, None)

    async def send(self, device_id: str, payload: dict) -> None:
        for ws in list(self.connections.get(device_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:  # noqa: BLE001
                self.disconnect(device_id, ws)


ws_manager = WSManager()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"app": "Everything Share", "version": "1.0.0", "status": "ok"}


@api.post("/devices/register", response_model=Device)
async def register_device(body: DeviceRegister):
    device_id = str(uuid.uuid4())
    code = await make_unique_code()
    now = utc_now_iso()
    doc = {
        "id": device_id,
        "code": code,
        "name": body.name.strip(),
        "device_type": body.device_type,
        "created_at": now,
        "last_seen": now,
    }
    await db.devices.insert_one(doc.copy())
    return Device(**doc)


@api.get("/devices/{device_id}", response_model=Device)
async def get_device(device_id: str):
    doc = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Device not found")
    return Device(**doc)


@api.patch("/devices/{device_id}", response_model=Device)
async def update_device(device_id: str, body: DeviceUpdate):
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(400, "Nothing to update")
    update["last_seen"] = utc_now_iso()
    doc = await db.devices.find_one_and_update(
        {"id": device_id},
        {"$set": update},
        return_document=True,
        projection={"_id": 0},
    )
    if not doc:
        raise HTTPException(404, "Device not found")
    return Device(**doc)


@api.get("/devices/code/{code}", response_model=Device)
async def get_device_by_code(code: str):
    doc = await db.devices.find_one({"code": code}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "No device with that code")
    return Device(**doc)


@api.get("/devices/{device_id}/peers", response_model=List[Device])
async def recent_peers(device_id: str, limit: int = 10):
    """Return devices this device has recently exchanged files with."""
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"from_device_id": device_id},
                    {"to_device_id": device_id},
                ]
            }
        },
        {"$sort": {"created_at": -1}},
        {
            "$project": {
                "peer_id": {
                    "$cond": [
                        {"$eq": ["$from_device_id", device_id]},
                        "$to_device_id",
                        "$from_device_id",
                    ]
                },
                "created_at": 1,
            }
        },
        {"$group": {"_id": "$peer_id", "last": {"$max": "$created_at"}}},
        {"$sort": {"last": -1}},
        {"$limit": limit},
    ]
    peer_ids = [d["_id"] async for d in db.files.aggregate(pipeline)]
    if not peer_ids:
        return []
    peers = await db.devices.find({"id": {"$in": peer_ids}}, {"_id": 0}).to_list(limit)
    # preserve order from aggregation
    by_id = {p["id"]: p for p in peers}
    return [Device(**by_id[pid]) for pid in peer_ids if pid in by_id]


@api.post("/files/upload", response_model=FileMeta)
async def upload_file(
    from_device_id: str = Form(...),
    to_code: str = Form(...),
    file: UploadFile = File(...),
):
    sender = await db.devices.find_one({"id": from_device_id}, {"_id": 0})
    if not sender:
        raise HTTPException(404, "Sender device not registered")
    receiver = await db.devices.find_one({"code": to_code}, {"_id": 0})
    if not receiver:
        raise HTTPException(404, "No device with that code")

    file_id = str(uuid.uuid4())
    safe_name = file.filename or "file.bin"
    stored_path = UPLOAD_DIR / f"{file_id}__{Path(safe_name).name}"

    size = 0
    with stored_path.open("wb") as out:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            out.write(chunk)

    mime = file.content_type or mimetypes.guess_type(safe_name)[0] or "application/octet-stream"

    meta = {
        "id": file_id,
        "filename": safe_name,
        "size": size,
        "mime": mime,
        "from_device_id": from_device_id,
        "from_device_name": sender["name"],
        "to_device_id": receiver["id"],
        "to_device_name": receiver["name"],
        "created_at": utc_now_iso(),
        "favorite": False,
        "tags": [],
        "path": str(stored_path),
    }
    await db.files.insert_one(meta.copy())

    # notify receiver over websocket
    await ws_manager.send(
        receiver["id"],
        {
            "type": "file.received",
            "file": {k: v for k, v in meta.items() if k != "path"},
        },
    )
    # notify sender for UI update
    await ws_manager.send(
        from_device_id,
        {
            "type": "file.sent",
            "file": {k: v for k, v in meta.items() if k != "path"},
        },
    )
    return FileMeta(**{k: v for k, v in meta.items() if k != "path"})


def _project_file():
    return {"_id": 0, "path": 0}


@api.get("/files/received/{device_id}", response_model=List[FileMeta])
async def list_received(device_id: str, limit: int = 200):
    cur = (
        db.files.find({"to_device_id": device_id}, _project_file())
        .sort("created_at", -1)
        .limit(limit)
    )
    return [FileMeta(**doc) async for doc in cur]


@api.get("/files/sent/{device_id}", response_model=List[FileMeta])
async def list_sent(device_id: str, limit: int = 200):
    cur = (
        db.files.find({"from_device_id": device_id}, _project_file())
        .sort("created_at", -1)
        .limit(limit)
    )
    return [FileMeta(**doc) async for doc in cur]


@api.get("/files/all/{device_id}", response_model=List[FileMeta])
async def list_all(device_id: str, limit: int = 500):
    cur = (
        db.files.find(
            {
                "$or": [
                    {"to_device_id": device_id},
                    {"from_device_id": device_id},
                ]
            },
            _project_file(),
        )
        .sort("created_at", -1)
        .limit(limit)
    )
    return [FileMeta(**doc) async for doc in cur]


@api.get("/files/search/{device_id}", response_model=List[FileMeta])
async def search_files(device_id: str, q: str = "", kind: str = "all"):
    query: dict = {
        "$or": [{"to_device_id": device_id}, {"from_device_id": device_id}],
    }
    if q:
        query["filename"] = {"$regex": q, "$options": "i"}
    if kind and kind != "all":
        mapping = {
            "image": "^image/",
            "video": "^video/",
            "audio": "^audio/",
            "pdf": "application/pdf",
            "doc": "(word|officedocument|opendocument|text/plain|text/markdown)",
        }
        pattern = mapping.get(kind)
        if pattern:
            query["mime"] = {"$regex": pattern}
    cur = db.files.find(query, _project_file()).sort("created_at", -1).limit(500)
    return [FileMeta(**doc) async for doc in cur]


@api.get("/files/{file_id}", response_model=FileMeta)
async def get_file(file_id: str):
    doc = await db.files.find_one({"id": file_id}, _project_file())
    if not doc:
        raise HTTPException(404, "File not found")
    return FileMeta(**doc)


@api.get("/files/{file_id}/download")
async def download_file(file_id: str):
    doc = await db.files.find_one({"id": file_id})
    if not doc:
        raise HTTPException(404, "File not found")
    path = doc.get("path")
    if not path or not os.path.exists(path):
        raise HTTPException(410, "File is no longer available on disk")
    return FileResponse(
        path,
        media_type=doc.get("mime", "application/octet-stream"),
        filename=doc["filename"],
    )


@api.patch("/files/{file_id}/favorite", response_model=FileMeta)
async def toggle_favorite(file_id: str, body: ToggleFavoriteBody):
    doc = await db.files.find_one_and_update(
        {"id": file_id},
        {"$set": {"favorite": body.favorite}},
        return_document=True,
        projection=_project_file(),
    )
    if not doc:
        raise HTTPException(404, "File not found")
    return FileMeta(**doc)


@api.delete("/files/{file_id}")
async def delete_file(file_id: str):
    doc = await db.files.find_one({"id": file_id})
    if not doc:
        raise HTTPException(404, "File not found")
    path = doc.get("path")
    if path and os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            logger.warning("Failed to remove %s", path)
    await db.files.delete_one({"id": file_id})
    return JSONResponse({"ok": True, "id": file_id})


@app.websocket("/api/ws/{device_id}")
async def ws_endpoint(ws: WebSocket, device_id: str):
    await ws_manager.connect(device_id, ws)
    await ws.send_json({"type": "connected", "device_id": device_id})
    try:
        while True:
            msg = await ws.receive_json()
            # simple echo/keepalive; clients may send {"type":"ping"}
            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong", "t": utc_now_iso()})
    except WebSocketDisconnect:
        ws_manager.disconnect(device_id, ws)


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
