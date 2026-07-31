# Roadmap

Everything Share ships today as a fully working cloud-relay file-sharing PWA. The roadmap below tracks the direction we want the project to grow.

## Now (v1.x)

- ✅ 6-digit code pairing
- ✅ QR code display
- ✅ File upload / download / delete
- ✅ Received / Sent inboxes + search
- ✅ Real-time WebSocket notifications
- ✅ Image / video / audio / PDF / text / code previews
- ✅ Smart Board / Presentation mode with pen, highlighter, laser, eraser, timer
- ✅ Dark / Light / System themes
- ✅ MIT license & CI workflow

## Next (v1.1)

- [ ] Drag & drop file zone on web
- [ ] Folder transfer (zip on upload, browse on download)
- [ ] Multi-file preview carousel
- [ ] File tagging + tag filter chips
- [ ] Recent transfer speed / ETA meter

## Later (v1.2)

- [ ] WebRTC LAN P2P transport (reuse `/api/ws/{id}` for signaling)
- [ ] mDNS / Bonjour discovery in native builds
- [ ] AES-256 client-side encryption for zero-knowledge relay
- [ ] Chunked + resumable uploads for 10 GB+ files
- [ ] Slide sidebar & thumbnail strip in Smart Board mode
- [ ] Multi-user co-annotation via CRDT (Yjs)

## Farther

- [ ] Native Windows / macOS / Linux packages via Tauri or Electron
- [ ] Interactive Smart Board hardware profiles (large-format kiosks)
- [ ] Local-only mode with browser IndexedDB storage

Have an idea? Open a [Feature Request](../.github/ISSUE_TEMPLATE/feature_request.md).
