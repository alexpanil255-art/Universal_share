import React, { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useTransfers, FileMeta } from "@/src/context/TransferContext";
import { kindOfMime } from "@/src/lib/format";
import { radius, spacing } from "@/src/theme/theme";

type Tool = "pointer" | "pen" | "highlight" | "eraser" | "laser";

interface Stroke {
  d: string;
  color: string;
  width: number;
  opacity: number;
}

const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#111111", "#FFFFFF"];

export default function SmartBoard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, colors } = useApp();
  const { downloadUrl } = useTransfers();
  const router = useRouter();

  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [tool, setTool] = useState<Tool>("pointer");
  const [color, setColor] = useState<string>("#EF4444");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [timerNow, setTimerNow] = useState<number>(Date.now());
  const [laser, setLaser] = useState<{ x: number; y: number } | null>(null);
  const boardRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${api}/files/${id}`);
      if (res.ok) setMeta(await res.json());
    })();
  }, [id, api]);

  useEffect(() => {
    if (timerStart == null) return;
    const t = setInterval(() => setTimerNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [timerStart]);

  const elapsed = timerStart ? Math.floor((timerNow - timerStart) / 1000) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const kind = meta ? kindOfMime(meta.mime) : "other";
  const url = meta ? downloadUrl(meta.id) : "";

  // Drawing: use raw pointer events on web (which handles all cursors incl. stylus/touch)
  // and PanResponder-like handler for native.
  const onWebPointer = (evt: any, phase: "down" | "move" | "up") => {
    if (tool === "pointer") return;
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    if (tool === "laser") {
      if (phase === "up") setLaser(null);
      else setLaser({ x, y });
      return;
    }
    if (tool === "eraser") {
      if (phase === "down") setStrokes([]);
      return;
    }
    if (phase === "down") {
      setCurrent(`M ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else if (phase === "move" && current) {
      setCurrent((c) => c + ` L ${x.toFixed(1)} ${y.toFixed(1)}`);
    } else if (phase === "up" && current) {
      setStrokes((s) => [
        ...s,
        {
          d: current,
          color,
          width: tool === "highlight" ? 14 : 3,
          opacity: tool === "highlight" ? 0.35 : 1,
        },
      ]);
      setCurrent("");
    }
  };

  const contentLayer = () => {
    if (!meta) return null;
    if (kind === "image") {
      return <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="contain" />;
    }
    if (kind === "pdf" || meta.mime.startsWith("text/html")) {
      if (Platform.OS === "web") {
        return (
          // @ts-ignore
          <iframe src={url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
        );
      }
      return <WebView source={{ uri: url }} style={StyleSheet.absoluteFill} />;
    }
    if (kind === "video") {
      if (Platform.OS === "web") {
        return (
          // @ts-ignore
          <video src={url} controls style={{ position: "absolute", inset: 0, width: "100%", height: "100%", backgroundColor: "#000" }} />
        );
      }
      return <WebView source={{ uri: url }} style={StyleSheet.absoluteFill} />;
    }
    return (
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", backgroundColor: "#111" }]}>
        <Ionicons name="document" size={80} color="#FFF" />
        <Text style={{ color: "#FFF", marginTop: 12, fontWeight: "700" }}>{meta.filename}</Text>
        <Text style={{ color: "#AAA", marginTop: 4 }}>Format not renderable — annotate on blank canvas</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Canvas */}
      <View
        ref={boardRef}
        style={styles.canvas}
        // @ts-ignore
        onPointerDown={Platform.OS === "web" ? (e: any) => onWebPointer(e, "down") : undefined}
        // @ts-ignore
        onPointerMove={Platform.OS === "web" ? (e: any) => onWebPointer(e, "move") : undefined}
        // @ts-ignore
        onPointerUp={Platform.OS === "web" ? (e: any) => onWebPointer(e, "up") : undefined}
        // @ts-ignore
        onPointerLeave={Platform.OS === "web" ? (e: any) => onWebPointer(e, "up") : undefined}
      >
        {contentLayer()}
        {/* Annotation overlay */}
        <Svg style={StyleSheet.absoluteFill as any} pointerEvents="none">
          {strokes.map((s, i) => (
            <Path key={i} d={s.d} stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={s.opacity} />
          ))}
          {current ? (
            <Path d={current} stroke={color} strokeWidth={tool === "highlight" ? 14 : 3} strokeLinecap="round" fill="none" opacity={tool === "highlight" ? 0.35 : 1} />
          ) : null}
          {laser ? <Circle cx={laser.x} cy={laser.y} r={8} fill="#FF0033" opacity={0.7} /> : null}
        </Svg>
      </View>

      {/* Top bar */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable
          testID="smartboard-exit"
          onPress={() => router.back()}
          style={[styles.iconChip, { backgroundColor: "rgba(0,0,0,0.6)" }]}
        >
          <Ionicons name="close" size={20} color="#FFF" />
        </Pressable>
        <View style={styles.timerPill}>
          <Ionicons name="stopwatch" size={16} color="#FFF" />
          <Text style={{ color: "#FFF", fontWeight: "800", letterSpacing: 1 }}>{mm}:{ss}</Text>
          <Pressable
            testID="smartboard-timer-toggle"
            onPress={() => {
              if (timerStart == null) setTimerStart(Date.now());
              else setTimerStart(null);
            }}
            hitSlop={10}
          >
            <Ionicons name={timerStart == null ? "play" : "pause"} size={16} color="#FFF" />
          </Pressable>
          {timerStart != null && (
            <Pressable
              testID="smartboard-timer-reset"
              onPress={() => setTimerStart(Date.now())}
              hitSlop={10}
            >
              <Ionicons name="refresh" size={16} color="#FFF" />
            </Pressable>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Bottom toolbar */}
      <View style={styles.toolbar} pointerEvents="box-none">
        <View style={styles.toolbarInner}>
          {(
            [
              { key: "pointer", icon: "hand-left" },
              { key: "pen", icon: "pencil" },
              { key: "highlight", icon: "brush" },
              { key: "laser", icon: "flash" },
              { key: "eraser", icon: "trash" },
            ] as { key: Tool; icon: keyof typeof Ionicons.glyphMap }[]
          ).map((t) => (
            <Pressable
              key={t.key}
              testID={`tool-${t.key}`}
              onPress={() => setTool(t.key)}
              style={[
                styles.toolBtn,
                { backgroundColor: tool === t.key ? colors.brand : "transparent" },
              ]}
            >
              <Ionicons name={t.icon} size={20} color={tool === t.key ? "#FFF" : "#EEE"} />
            </Pressable>
          ))}
          <View style={styles.divider} />
          {COLORS.map((c) => (
            <Pressable
              key={c}
              testID={`color-${c.replace("#", "")}`}
              onPress={() => setColor(c)}
              style={[
                styles.colorSwatch,
                {
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 1,
                  borderColor: color === c ? "#FFF" : "rgba(255,255,255,0.4)",
                },
              ]}
            />
          ))}
          <View style={styles.divider} />
          <Pressable
            testID="smartboard-clear"
            onPress={() => setStrokes([])}
            style={[styles.toolBtn, { paddingHorizontal: 10, flexDirection: "row", gap: 6 }]}
          >
            <Ionicons name="close-circle" size={20} color="#FFF" />
            <Text style={{ color: "#FFF", fontWeight: "700" }}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  canvas: { flex: 1, position: "relative", overflow: "hidden" },
  topBar: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconChip: {
    width: 40, height: 40, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: radius.pill,
  },
  toolbar: {
    position: "absolute",
    left: 0, right: 0,
    bottom: spacing.lg,
    alignItems: "center",
  },
  toolbarInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.72)",
    // @ts-ignore
    backdropFilter: "blur(20px)",
  },
  toolBtn: {
    width: 42, height: 42, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
  },
  divider: {
    width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4,
  },
  colorSwatch: {
    width: 26, height: 26, borderRadius: radius.pill,
  },
});
