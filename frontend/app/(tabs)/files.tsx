import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useTransfers, FileMeta } from "@/src/context/TransferContext";
import { humanBytes, kindOfMime, timeAgo } from "@/src/lib/format";
import { radius, spacing, typography } from "@/src/theme/theme";

const FILTERS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "all", label: "All", icon: "apps" },
  { key: "received", label: "Received", icon: "arrow-down" },
  { key: "sent", label: "Sent", icon: "arrow-up" },
  { key: "favorite", label: "Favorites", icon: "star" },
  { key: "image", label: "Images", icon: "image" },
  { key: "video", label: "Videos", icon: "videocam" },
  { key: "pdf", label: "PDFs", icon: "document-text" },
  { key: "doc", label: "Docs", icon: "document" },
  { key: "audio", label: "Audio", icon: "musical-notes" },
];

const KIND_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  image: "image",
  video: "videocam",
  audio: "musical-notes",
  pdf: "document-text",
  doc: "document",
  archive: "archive",
  code: "code-slash",
  other: "document-attach",
};

export default function FilesScreen() {
  const { device, colors } = useApp();
  const { received, sent, toggleFavorite, deleteFile } = useTransfers();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const all: FileMeta[] = useMemo(() => {
    const map = new Map<string, FileMeta>();
    [...received, ...sent].forEach((f) => map.set(f.id, f));
    return Array.from(map.values()).sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [received, sent]);

  const filtered = useMemo(() => {
    return all.filter((f) => {
      if (q && !f.filename.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "all") return true;
      if (filter === "received") return f.to_device_id === device?.id;
      if (filter === "sent") return f.from_device_id === device?.id;
      if (filter === "favorite") return f.favorite;
      const k = kindOfMime(f.mime);
      return k === filter;
    });
  }, [all, q, filter, device]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top"]}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={[styles.title, { color: colors.onSurface }]}>Files</Text>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            testID="files-search"
            placeholder="Search filename…"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            style={[styles.searchInput, { color: colors.onSurface }]}
          />
          {q ? (
            <Pressable onPress={() => setQ("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipRow}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: "center" }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              testID={`filter-${f.key}`}
              onPress={() => setFilter(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.brand : colors.surfaceSecondary,
                  borderColor: active ? colors.brand : colors.border,
                },
              ]}
            >
              <Ionicons name={f.icon} size={14} color={active ? colors.onBrandPrimary : colors.onSurface} />
              <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "600" }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: 100 + insets.bottom,
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: spacing["3xl"] }}>
            <Ionicons name="folder-open-outline" size={56} color={colors.muted} />
            <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: spacing.sm }}>
              No files here yet
            </Text>
            <Text style={{ color: colors.muted, marginTop: 4, textAlign: "center" }}>
              Send or receive a file to see it in your inbox
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const kind = kindOfMime(item.mime);
          const isIncoming = item.to_device_id === device?.id;
          return (
            <View
              style={[styles.row, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
            >
              <Pressable
                testID={`file-open-${item.id}`}
                onPress={() => router.push(`/preview/${item.id}`)}
                style={styles.rowMain}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
                  <Ionicons name={KIND_ICON[kind]} size={22} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>
                    {item.filename}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: typography.sm }} numberOfLines={1}>
                    {isIncoming ? `From ${item.from_device_name}` : `To ${item.to_device_name}`} · {humanBytes(item.size)} · {timeAgo(item.created_at)}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                testID={`file-fav-${item.id}`}
                onPress={() => toggleFavorite(item.id, !item.favorite)}
                hitSlop={10}
                style={styles.iconBtn}
              >
                <Ionicons
                  name={item.favorite ? "star" : "star-outline"}
                  size={20}
                  color={item.favorite ? colors.warning : colors.muted}
                />
              </Pressable>
              <Pressable
                testID={`file-delete-${item.id}`}
                onPress={() => deleteFile(item.id)}
                hitSlop={10}
                style={styles.iconBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: typography["3xl"], fontWeight: "800", letterSpacing: -0.5, marginBottom: spacing.md },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.base,
  },
  chipRow: {
    height: 56,
    marginTop: spacing.md,
    flexGrow: 0,
    flexShrink: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexShrink: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  iconBtn: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
});
