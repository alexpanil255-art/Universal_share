import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useTransfers, FileMeta } from "@/src/context/TransferContext";
import { humanBytes, kindOfMime, timeAgo } from "@/src/lib/format";
import { radius, spacing, typography } from "@/src/theme/theme";

export default function PreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, colors, effectiveMode } = useApp();
  const { downloadUrl, toggleFavorite, deleteFile } = useTransfers();
  const router = useRouter();
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${api}/files/${id}`);
        if (!res.ok) throw new Error("Not found");
        const m: FileMeta = await res.json();
        if (!alive) return;
        setMeta(m);
        const kind = kindOfMime(m.mime);
        if (kind === "code" || m.mime.startsWith("text/") || m.mime === "application/json") {
          const t = await fetch(`${api}/files/${id}/download`);
          if (t.ok) setTextContent(await t.text());
        }
      } catch (e: any) {
        if (alive) setError(e.message || "Failed to load");
      }
    })();
    return () => { alive = false; };
  }, [id, api]);

  if (!meta) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top", "bottom"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {error ? (
            <Text style={{ color: colors.error }}>{error}</Text>
          ) : (
            <ActivityIndicator color={colors.brand} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const kind = kindOfMime(meta.mime);
  const url = downloadUrl(meta.id);

  const openExternal = async () => {
    if (Platform.OS === "web") {
      // trigger download
      window.location.href = url;
    } else {
      await Linking.openURL(url);
    }
  };

  const openSmartboard = () => router.push(`/smartboard/${meta.id}`);

  const del = async () => {
    await deleteFile(meta.id);
    router.back();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top", "bottom"]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} testID="preview-back" hitSlop={12}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <Text style={{ color: colors.onSurface, fontWeight: "700" }} numberOfLines={1}>{meta.filename}</Text>
          <Text style={{ color: colors.muted, fontSize: typography.sm }} numberOfLines={1}>
            {humanBytes(meta.size)} · {timeAgo(meta.created_at)} · {meta.mime}
          </Text>
        </View>
        <Pressable
          testID="preview-favorite"
          onPress={() => toggleFavorite(meta.id, !meta.favorite)}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name={meta.favorite ? "star" : "star-outline"} size={22} color={meta.favorite ? colors.warning : colors.onSurface} />
        </Pressable>
      </View>

      <View style={{ flex: 1, backgroundColor: effectiveMode === "dark" ? "#000" : "#000" }}>
        {kind === "image" ? (
          <Image source={{ uri: url }} style={{ flex: 1 }} resizeMode="contain" />
        ) : kind === "video" ? (
          <Video url={url} mime={meta.mime} />
        ) : kind === "audio" ? (
          <AudioPlayer url={url} mime={meta.mime} colors={colors} />
        ) : kind === "pdf" || meta.mime.startsWith("text/html") ? (
          <PdfOrHtml url={url} mime={meta.mime} />
        ) : textContent !== null ? (
          <ScrollView style={{ backgroundColor: colors.surfaceSecondary }} contentContainerStyle={{ padding: spacing.lg }}>
            <Text style={{ color: colors.onSurface, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13, lineHeight: 20 }} selectable>
              {textContent}
            </Text>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.surface }}>
            <Ionicons name="document-attach" size={72} color={colors.muted} />
            <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: spacing.md, textAlign: "center" }}>
              No inline preview for this format
            </Text>
            <Text style={{ color: colors.muted, textAlign: "center", marginTop: spacing.xs }}>
              {meta.mime}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.footer, { backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }]}>
        <ActionButton icon="download" label="Download" onPress={openExternal} colors={colors} testID="preview-download" />
        <ActionButton icon="easel" label="Present" onPress={openSmartboard} colors={colors} testID="preview-present" primary />
        <ActionButton icon="trash" label="Delete" onPress={del} colors={colors} testID="preview-delete" danger />
      </View>
    </SafeAreaView>
  );
}

const ActionButton: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; colors: any; testID: string; primary?: boolean; danger?: boolean }> = ({ icon, label, onPress, colors, testID, primary, danger }) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    style={({ pressed }) => [
      {
        flex: 1,
        height: 52,
        borderRadius: radius.md,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
        backgroundColor: primary ? colors.brand : danger ? colors.surface : colors.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: danger ? colors.error : colors.border,
        opacity: pressed ? 0.85 : 1,
      },
    ]}
  >
    <Ionicons name={icon} size={18} color={primary ? colors.onBrandPrimary : danger ? colors.error : colors.onSurface} />
    <Text style={{ color: primary ? colors.onBrandPrimary : danger ? colors.error : colors.onSurface, fontWeight: "700" }}>
      {label}
    </Text>
  </Pressable>
);

// A tiny cross-platform video component
const Video: React.FC<{ url: string; mime: string }> = ({ url, mime }) => {
  if (Platform.OS === "web") {
    return (
      // @ts-ignore
      <video src={url} controls style={{ width: "100%", height: "100%", backgroundColor: "#000" }} />
    );
  }
  return <WebView source={{ uri: url }} style={{ flex: 1, backgroundColor: "#000" }} />;
};

const AudioPlayer: React.FC<{ url: string; mime: string; colors: any }> = ({ url, colors }) => {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: colors.surface }}>
        <Ionicons name="musical-notes" size={80} color={colors.brand} />
        <View style={{ height: 20 }} />
        {/* @ts-ignore */}
        <audio src={url} controls style={{ width: "80%" }} />
      </View>
    );
  }
  return <WebView source={{ uri: url }} style={{ flex: 1 }} />;
};

const PdfOrHtml: React.FC<{ url: string; mime: string }> = ({ url, mime }) => {
  const viewer = mime === "application/pdf" ? url : url;
  if (Platform.OS === "web") {
    return (
      // @ts-ignore
      <iframe src={viewer} style={{ flex: 1, width: "100%", height: "100%", border: 0, backgroundColor: "#fff" }} />
    );
  }
  return <WebView source={{ uri: viewer }} style={{ flex: 1, backgroundColor: "#fff" }} originWhitelist={["*"]} />;
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: spacing.xs },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
});
