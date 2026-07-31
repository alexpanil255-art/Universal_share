import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "./AppContext";

export interface FileMeta {
  id: string;
  filename: string;
  size: number;
  mime: string;
  from_device_id: string;
  from_device_name: string;
  to_device_id: string;
  to_device_name: string;
  created_at: string;
  favorite: boolean;
  tags: string[];
}

export interface TransferItem {
  id: string; // client-side id
  filename: string;
  size: number;
  mime: string;
  progress: number; // 0..1
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
  fileId?: string; // server id when done
}

interface TransferState {
  received: FileMeta[];
  sent: FileMeta[];
  queue: TransferItem[];
  refreshing: boolean;
  incomingToast: FileMeta | null;
  clearIncoming: () => void;
  refresh: () => Promise<void>;
  sendFile: (params: {
    fileBlob: Blob | { uri: string; name: string; type: string; size?: number };
    filename: string;
    mime: string;
    size: number;
    toCode: string;
  }) => Promise<FileMeta | null>;
  toggleFavorite: (fileId: string, fav: boolean) => Promise<void>;
  deleteFile: (fileId: string) => Promise<void>;
  downloadUrl: (fileId: string) => string;
}

const TransferContext = createContext<TransferState | null>(null);

export const TransferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { device, api, backendUrl } = useApp();
  const [received, setReceived] = useState<FileMeta[]>([]);
  const [sent, setSent] = useState<FileMeta[]>([]);
  const [queue, setQueue] = useState<TransferItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [incomingToast, setIncomingToast] = useState<FileMeta | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const refresh = useCallback(async () => {
    if (!device) return;
    setRefreshing(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`${api}/files/received/${device.id}`),
        fetch(`${api}/files/sent/${device.id}`),
      ]);
      if (r1.ok) setReceived(await r1.json());
      if (r2.ok) setSent(await r2.json());
    } finally {
      setRefreshing(false);
    }
  }, [device, api]);

  useEffect(() => {
    if (!device) return;
    refresh();
    // websocket
    const wsUrl = backendUrl.replace(/^http/, "ws") + `/api/ws/${device.id}`;
    let stopped = false;
    let ws: WebSocket | null = null;
    const connect = () => {
      if (stopped) return;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "file.received") {
            const f: FileMeta = msg.file;
            setReceived((prev) => [f, ...prev.filter((x) => x.id !== f.id)]);
            setIncomingToast(f);
          } else if (msg.type === "file.sent") {
            const f: FileMeta = msg.file;
            setSent((prev) => [f, ...prev.filter((x) => x.id !== f.id)]);
          }
        } catch {}
      };
      ws.onclose = () => {
        if (!stopped) setTimeout(connect, 2000);
      };
      ws.onerror = () => {
        try { ws?.close(); } catch {}
      };
    };
    connect();
    return () => {
      stopped = true;
      try { ws?.close(); } catch {}
    };
  }, [device, backendUrl, refresh]);

  const clearIncoming = useCallback(() => setIncomingToast(null), []);

  const sendFile = useCallback(async ({ fileBlob, filename, mime, size, toCode }) => {
    if (!device) return null;
    const clientId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: TransferItem = {
      id: clientId,
      filename,
      size,
      mime,
      progress: 0,
      status: "uploading",
    };
    setQueue((q) => [item, ...q]);

    return await new Promise<FileMeta | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${api}/files/upload`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const p = e.loaded / e.total;
          setQueue((q) => q.map((t) => (t.id === clientId ? { ...t, progress: p } : t)));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const meta: FileMeta = JSON.parse(xhr.responseText);
            setQueue((q) => q.map((t) => (t.id === clientId ? { ...t, status: "done", progress: 1, fileId: meta.id } : t)));
            setSent((prev) => [meta, ...prev.filter((x) => x.id !== meta.id)]);
            resolve(meta);
          } catch {
            setQueue((q) => q.map((t) => (t.id === clientId ? { ...t, status: "error", error: "Bad response" } : t)));
            resolve(null);
          }
        } else {
          let msg = "Upload failed";
          try {
            const j = JSON.parse(xhr.responseText);
            if (j?.detail) msg = j.detail;
          } catch {}
          setQueue((q) => q.map((t) => (t.id === clientId ? { ...t, status: "error", error: msg } : t)));
          resolve(null);
        }
      };
      xhr.onerror = () => {
        setQueue((q) => q.map((t) => (t.id === clientId ? { ...t, status: "error", error: "Network error" } : t)));
        resolve(null);
      };
      const fd = new FormData();
      fd.append("from_device_id", device.id);
      fd.append("to_code", toCode);
      // Native and web accept different shapes
      // @ts-ignore
      fd.append("file", fileBlob, filename);
      xhr.send(fd);
    });
  }, [api, device]);

  const toggleFavorite = useCallback(async (fileId: string, fav: boolean) => {
    const res = await fetch(`${api}/files/${fileId}/favorite`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: fav }),
    });
    if (res.ok) {
      const updated: FileMeta = await res.json();
      setReceived((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setSent((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    }
  }, [api]);

  const deleteFile = useCallback(async (fileId: string) => {
    const res = await fetch(`${api}/files/${fileId}`, { method: "DELETE" });
    if (res.ok) {
      setReceived((prev) => prev.filter((f) => f.id !== fileId));
      setSent((prev) => prev.filter((f) => f.id !== fileId));
    }
  }, [api]);

  const downloadUrl = useCallback((fileId: string) => `${api}/files/${fileId}/download`, [api]);

  const value = useMemo(
    () => ({
      received, sent, queue, refreshing, incomingToast,
      clearIncoming, refresh, sendFile, toggleFavorite, deleteFile, downloadUrl,
    }),
    [received, sent, queue, refreshing, incomingToast, clearIncoming, refresh, sendFile, toggleFavorite, deleteFile, downloadUrl]
  );

  return <TransferContext.Provider value={value}>{children}</TransferContext.Provider>;
};

export function useTransfers(): TransferState {
  const v = useContext(TransferContext);
  if (!v) throw new Error("useTransfers must be used inside TransferProvider");
  return v;
}
