import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useTransfers } from "@/src/context/TransferContext";
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

export default function ReceiveScreen() {
  const { device, colors } = useApp();
  const { received } = useTransfers();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!device) return null;
  const payload = JSON.stringify({ app: "everything-share", code: device.code, name: device.name });

  const copy = async () => {
    await Clipboard.setStringAsync(device.code);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 + insets.bottom }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Receive</Text>
          <Text style={{ color: colors.muted }}>Share your code to receive files</Text>
        </View>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <View style={{ alignItems: "center", padding: spacing.md }}>
            <View style={[styles.qrWrap, { backgroundColor: "#FFFFFF" }]}>
              <QRCode
                value={payload}
                size={200}
                color={"#000000"}
                backgroundColor={"#FFFFFF"}
              />
            </View>
            <Text testID="receive-code" style={[styles.bigCode, { color: colors.onSurface }]}>{device.code}</Text>
            <Text style={{ color: colors.muted, marginBottom: spacing.md }}>{device.name}</Text>

            <Pressable
              testID="receive-copy-code"
              onPress={copy}
              style={[styles.copyBtn, { backgroundColor: colors.brand }]}
            >
              <Ionicons name="copy" size={18} color={colors.onBrandPrimary} />
              <Text style={{ color: colors.onBrandPrimary, fontWeight: "700" }}>Copy code</Text>
            </Pressable>
          </View>
        </GlassCard>

        <Text style={{ color: colors.onSurface, fontSize: typography.xl, fontWeight: "800", marginBottom: spacing.sm }}>
          Incoming ({received.length})
        </Text>

        {received.length === 0 ? (
          <GlassCard>
            <View style={{ alignItems: "center", paddingVertical: spacing["2xl"] }}>
              <Ionicons name="hourglass-outline" size={44} color={colors.muted} />
              <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: spacing.sm }}>
                Waiting for files…
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4, textAlign: "center" }}>
                Give the code above to someone{"\n"}on any device
              </Text>
            </View>
          </GlassCard>
        ) : (
          received.slice(0, 30).map((f) => {
            const kind = kindOfMime(f.mime);
            return (
              <Pressable
                key={f.id}
                testID={`receive-file-${f.id}`}
                onPress={() => router.push(`/preview/${f.id}`)}
                style={[styles.row, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
                  <Ionicons name={KIND_ICON[kind]} size={22} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>{f.filename}</Text>
                  <Text style={{ color: colors.muted, fontSize: typography.sm }} numberOfLines={1}>
                    from {f.from_device_name} · {humanBytes(f.size)} · {timeAgo(f.created_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingVertical: spacing.md },
  title: { fontSize: typography["3xl"], fontWeight: "800", letterSpacing: -0.5 },
  qrWrap: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  bigCode: {
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 8,
    marginTop: spacing.xs,
  },
  copyBtn: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
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
