export function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "";
  const diff = (Date.now() - t) / 1000;
  if (diff < 45) return "just now";
  if (diff < 90) return "1m ago";
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 7200) return "1h ago";
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 172800) return "yesterday";
  return `${Math.round(diff / 86400)}d ago`;
}

export function kindOfMime(mime: string): "image" | "video" | "audio" | "pdf" | "doc" | "archive" | "code" | "other" {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (/word|officedocument|opendocument|text\/plain|text\/markdown|text\/csv/.test(mime)) return "doc";
  if (/zip|x-7z|x-rar|x-tar|gzip/.test(mime)) return "archive";
  if (/javascript|json|xml|typescript|x-python|x-c|x-java|x-go|x-rust/.test(mime)) return "code";
  return "other";
}
