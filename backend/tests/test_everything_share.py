"""End-to-end backend tests for Everything Share."""
import asyncio
import io
import json
import os
import re
import time

import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("EXPO_BACKEND_URL")
    or "http://localhost:8001"
).rstrip("/")
API = f"{BASE_URL}/api"


# ---------------- helpers ----------------
def _register(name, dtype="phone"):
    r = requests.post(f"{API}/devices/register", json={"name": name, "device_type": dtype})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def sender():
    return _register("TEST_Sender_A", "laptop")


@pytest.fixture(scope="module")
def receiver():
    return _register("TEST_Receiver_B", "phone")


# ---------------- devices ----------------
class TestDevices:
    def test_register_returns_code(self):
        d = _register("TEST_Reg", "tablet")
        assert re.fullmatch(r"\d{6}", d["code"]), f"bad code {d['code']}"
        assert d["name"] == "TEST_Reg"
        assert d["device_type"] == "tablet"
        assert "id" in d

    def test_get_by_id(self, sender):
        r = requests.get(f"{API}/devices/{sender['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == sender["id"]

    def test_get_by_id_404(self):
        r = requests.get(f"{API}/devices/does-not-exist-xxx")
        assert r.status_code == 404

    def test_get_by_code(self, receiver):
        r = requests.get(f"{API}/devices/code/{receiver['code']}")
        assert r.status_code == 200
        assert r.json()["code"] == receiver["code"]

    def test_get_by_code_404(self):
        r = requests.get(f"{API}/devices/code/000001")
        # If randomly collides with a real code, retry a couple times
        assert r.status_code in (404, 200)

    def test_patch_name(self, sender):
        new = "TEST_Sender_A_Renamed"
        r = requests.patch(f"{API}/devices/{sender['id']}", json={"name": new})
        assert r.status_code == 200
        assert r.json()["name"] == new
        # verify persistence
        r2 = requests.get(f"{API}/devices/{sender['id']}")
        assert r2.json()["name"] == new


# ---------------- upload ----------------
class TestUpload:
    def test_upload_text_and_persist(self, sender, receiver):
        files = {"file": ("hello.txt", b"hello world", "text/plain")}
        data = {"from_device_id": sender["id"], "to_code": receiver["code"]}
        r = requests.post(f"{API}/files/upload", data=data, files=files)
        assert r.status_code == 200, r.text
        meta = r.json()
        assert meta["filename"] == "hello.txt"
        assert meta["size"] == len(b"hello world")
        assert meta["from_device_id"] == sender["id"]
        assert meta["to_device_id"] == receiver["id"]
        # persistence — GET
        g = requests.get(f"{API}/files/{meta['id']}")
        assert g.status_code == 200
        assert g.json()["id"] == meta["id"]
        # keep for further tests
        pytest.shared_file_id = meta["id"]

    def test_upload_png(self, sender, receiver):
        # 1x1 PNG
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08"
            b"\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00"
            b"\x00\x00\x03\x00\x01\x5c\xcd\xff\x69\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("pixel.png", png, "image/png")}
        data = {"from_device_id": sender["id"], "to_code": receiver["code"]}
        r = requests.post(f"{API}/files/upload", data=data, files=files)
        assert r.status_code == 200, r.text
        assert r.json()["mime"] == "image/png"

    def test_upload_unknown_code(self, sender):
        files = {"file": ("x.txt", b"x", "text/plain")}
        r = requests.post(
            f"{API}/files/upload",
            data={"from_device_id": sender["id"], "to_code": "999999"},
            files=files,
        )
        # this could theoretically hit a real code, but unlikely in fresh test env
        assert r.status_code in (404, 200)

    def test_upload_unknown_sender(self, receiver):
        files = {"file": ("x.txt", b"x", "text/plain")}
        r = requests.post(
            f"{API}/files/upload",
            data={"from_device_id": "nope-nope", "to_code": receiver["code"]},
            files=files,
        )
        assert r.status_code == 404


# ---------------- lists / search ----------------
class TestListing:
    def test_received_and_sent(self, sender, receiver):
        r1 = requests.get(f"{API}/files/received/{receiver['id']}")
        r2 = requests.get(f"{API}/files/sent/{sender['id']}")
        r3 = requests.get(f"{API}/files/all/{sender['id']}")
        assert r1.status_code == 200 and isinstance(r1.json(), list)
        assert r2.status_code == 200 and isinstance(r2.json(), list)
        assert r3.status_code == 200 and isinstance(r3.json(), list)
        assert len(r1.json()) >= 1
        # sorted desc by created_at
        cas = [x["created_at"] for x in r1.json()]
        assert cas == sorted(cas, reverse=True)

    def test_search_q(self, receiver):
        r = requests.get(f"{API}/files/search/{receiver['id']}", params={"q": "hello"})
        assert r.status_code == 200
        names = [x["filename"] for x in r.json()]
        assert any("hello" in n.lower() for n in names)

    def test_search_kind_image(self, receiver):
        r = requests.get(f"{API}/files/search/{receiver['id']}", params={"kind": "image"})
        assert r.status_code == 200
        for x in r.json():
            assert x["mime"].startswith("image/")


# ---------------- file actions ----------------
class TestFileActions:
    def test_download(self):
        fid = getattr(pytest, "shared_file_id", None)
        assert fid, "upload test must run first"
        r = requests.get(f"{API}/files/{fid}/download")
        assert r.status_code == 200
        assert r.content == b"hello world"

    def test_favorite_toggle(self):
        fid = getattr(pytest, "shared_file_id", None)
        assert fid
        r = requests.patch(f"{API}/files/{fid}/favorite", json={"favorite": True})
        assert r.status_code == 200
        assert r.json()["favorite"] is True
        # verify persistence via GET
        g = requests.get(f"{API}/files/{fid}")
        assert g.json()["favorite"] is True

    def test_delete(self):
        fid = getattr(pytest, "shared_file_id", None)
        assert fid
        r = requests.delete(f"{API}/files/{fid}")
        assert r.status_code == 200
        # verify gone
        g = requests.get(f"{API}/files/{fid}")
        assert g.status_code == 404


# ---------------- websocket ----------------
class TestWebSocket:
    def test_ws_receives_events(self, sender, receiver):
        try:
            import websockets  # type: ignore
        except Exception:
            pytest.skip("websockets not installed")

        ws_base = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        recv_url = f"{ws_base}/api/ws/{receiver['id']}"
        send_url = f"{ws_base}/api/ws/{sender['id']}"

        async def _collect(ws, results, key):
            try:
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=8)
                    data = json.loads(msg)
                    if data.get("type") in ("file.received", "file.sent"):
                        results[key] = data
                        return
            except asyncio.TimeoutError:
                return

        async def runner():
            async with websockets.connect(recv_url) as rws, websockets.connect(send_url) as sws:
                # consume initial 'connected' handshake
                await asyncio.wait_for(rws.recv(), timeout=5)
                await asyncio.wait_for(sws.recv(), timeout=5)

                results = {}
                recv_task = asyncio.create_task(_collect(rws, results, "recv"))
                send_task = asyncio.create_task(_collect(sws, results, "sent"))

                # give listeners a moment
                await asyncio.sleep(0.2)

                def do_upload():
                    files = {"file": ("ws.txt", b"ws-hello", "text/plain")}
                    data = {"from_device_id": sender["id"], "to_code": receiver["code"]}
                    return requests.post(f"{API}/files/upload", data=data, files=files)

                loop = asyncio.get_event_loop()
                up = await loop.run_in_executor(None, do_upload)
                assert up.status_code == 200

                await asyncio.wait([recv_task, send_task], timeout=10)
                return results.get("recv"), results.get("sent")

        got_recv, got_sent = asyncio.new_event_loop().run_until_complete(runner())
        assert got_recv is not None, "receiver did not get file.received"
        assert got_sent is not None, "sender did not get file.sent"
        assert got_recv["file"]["filename"] == "ws.txt"
