import React, { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp, Device } from "@/src/context/AppContext";
import { useTransfers, FileMeta } from "@/src/context/TransferContext";
import { GlassCard } from "@/src/components/GlassCard";
import { humanBytes, kindOfMime, timeAgo } from "@/src/lib/format";
import { radius, spacing, typography } from "@/src/theme/theme";

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

function deviceIcon(t: string): keyof typeof Ionicons.glyphMap {
  return (
    {
      phone: "phone-portrait",
      tablet: "tablet-portrait",
      laptop: "laptop",
      desktop: "desktop",
      board: "easel",
    } as any
  )[t] || "phone-portrait";
}

export default function HomeScreen() {
  const { device, colors } = useApp();
  const { received, sent, refresh, refreshing } = useTransfers();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [peers, setPeers] = useState<Device[]>([]);

  useEffect(() => {
    (async () => {
      if (!device) return;
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/devices/${device.id}/peers`);
        if (res.ok) setPeers(await res.json());
      } catch {}
    })();
  }, [device, received, sent]);

  const recent: FileMeta[] = [...received, ...sent]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 8);

  if (!device) return null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, paddingHorizontal: spacing.lg }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.hi, { color: colors.muted }]}>Hi, {device.name}</Text>
            <Text style={[styles.title, { color: colors.onSurface }]}>Everything Share</Text>
          </View>
          <Pressable
            testID="home-open-settings"
            onPress={() => router.push("/(tabs)/settings")}
            style={[styles.circleBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* My code card */}
        <GlassCard style={{ marginBottom: spacing.lg }}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ color: colors.muted, fontSize: typography.sm, letterSpacing: 1, textTransform: "uppercase" }}>
                Your device code
              </Text>
              <Text
                testID="home-device-code"
                style={{
                  color: colors.onSurface,
                  fontSize: 36,
                  fontWeight: "800",
                  letterSpacing: 6,
                  marginTop: spacing.xs,
                }}
              >
                {device.code}
              </Text>
              <Text style={{ color: colors.muted, marginTop: spacing.xs }}>
                Share this with someone to receive files
              </Text>
            </View>
            <View style={[styles.deviceBadge, { backgroundColor: colors.brandTertiary }]}>
              <Ionicons name={deviceIcon(device.device_type)} size={28} color={colors.brand} />
            </View>
          </View>
        </GlassCard>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            testID="home-quick-send"
            onPress={() => router.push("/(tabs)/send")}
            style={[styles.actionCard, styles.actionSend]}
          >
            <LinearGradient
              colors={["#10B981", "#34D399"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="paper-plane" size={26} color="#FFFFFF" />
            <Text style={styles.actionTitle}>Send</Text>
            <Text style={styles.actionSub}>To a 6-digit code</Text>
          </Pressable>
          <Pressable
            testID="home-quick-receive"
            onPress={() => router.push("/(tabs)/receive")}
            style={[
              styles.actionCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Ionicons name="download" size={26} color={colors.brand} />
            <Text style={[styles.actionTitle, { color: colors.onSurface }]}>Receive</Text>
            <Text style={[styles.actionSub, { color: colors.muted }]}>Share your code</Text>
          </Pressable>
        </View>

        {/* Nearby / recent peers */}
        <SectionHeader title="Recent devices" hint={peers.length ? undefined : "Devices you've shared with appear here"} />
        {peers.length > 0 ? (
          <FlatList
            horizontal
            data={peers}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.xs }}
            renderItem={({ item }) => (
              <Pressable
                testID={`peer-${item.code}`}
                onPress={() => router.push({ pathname: "/(tabs)/send", params: { code: item.code } })}
                style={[styles.peer, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              >
                <View style={[styles.peerAvatar, { backgroundColor: colors.brandTertiary }]}>
                  <Ionicons name={deviceIcon(item.device_type)} size={24} color={colors.brand} />
                </View>
                <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ color: colors.muted, fontSize: typography.sm, letterSpacing: 2 }}>
                  {item.code}
                </Text>
              </Pressable>
            )}
          />
        ) : (
          <GlassCard>
            <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
              <Ionicons name="radio-outline" size={36} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: spacing.sm, textAlign: "center" }}>
                No paired devices yet.{"\n"}Send a file to see them here.
              </Text>
            </View>
          </GlassCard>
        )}

        {/* Recent transfers */}
        <SectionHeader title="Recent transfers" />
        {recent.length === 0 ? (
          <GlassCard>
            <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
              <Ionicons name="swap-horizontal" size={36} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: spacing.sm }}>No transfers yet</Text>
            </View>
          </GlassCard>
        ) : (
          recent.map((f) => {
            const isIncoming = f.to_device_id === device.id;
            const kind = kindOfMime(f.mime);
            return (
              <Pressable
                key={f.id}
                testID={`recent-${f.id}`}
                onPress={() => router.push(`/preview/${f.id}`)}
                style={[styles.row, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
                  <Ionicons name={KIND_ICON[kind]} size={22} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>
                    {f.filename}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: typography.sm }} numberOfLines={1}>
                    {isIncoming ? "From" : "To"} {isIncoming ? f.from_device_name : f.to_device_name} · {humanBytes(f.size)} · {timeAgo(f.created_at)}
                  </Text>
                </View>
                <Ionicons
                  name={isIncoming ? "arrow-down-circle" : "arrow-up-circle"}
                  size={22}
                  color={isIncoming ? colors.brand : colors.info}
                />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const SectionHeader: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => {
  const { colors } = useApp();
  return (
    <View style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Text style={{ color: colors.onSurface, fontSize: typography.xl, fontWeight: "800" }}>{title}</Text>
      {hint && <Text style={{ color: colors.muted, marginTop: 2 }}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  hi: { fontSize: typography.base },
  title: { fontSize: typography["3xl"], fontWeight: "800", letterSpacing: -0.5 },
  circleBtn: {
    width: 44, height: 44, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  deviceBadge: {
    width: 64, height: 64, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    minHeight: 120,
    borderRadius: radius.lg,
    overflow: "hidden",
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  actionSend: {},
  actionTitle: { color: "#FFFFFF", fontSize: typography.xl, fontWeight: "800", marginTop: spacing.md },
  actionSub: { color: "rgba(255,255,255,0.85)", fontSize: typography.sm },
  peer: {
    width: 130,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  peerAvatar: {
    width: 44, height: 44, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
});
