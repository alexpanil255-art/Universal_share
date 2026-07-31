import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams } from "expo-router";

import { useApp, Device } from "@/src/context/AppContext";
import { useTransfers } from "@/src/context/TransferContext";
import { GlassCard } from "@/src/components/GlassCard";
import { humanBytes } from "@/src/lib/format";
import { radius, spacing, typography } from "@/src/theme/theme";

interface PendingFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  blob: any; // web File or {uri,name,type}
}

export default function SendScreen() {
  const { colors, api } = useApp();
  const { sendFile, queue } = useTransfers();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();

  const [code, setCode] = useState<string>((params.code as string) || "");
  const [target, setTarget] = useState<Device | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingFile[]>([]);

  // resolve target when code has 6 digits
  useEffect(() => {
    const c = code.replace(/\D/g, "").slice(0, 6);
    if (c.length !== 6) {
      setTarget(null);
      setError(null);
      return;
    }
    let alive = true;
    setChecking(true);
    setError(null);
    fetch(`${api}/devices/code/${c}`)
      .then(async (r) => {
        if (!alive) return;
        if (r.ok) {
          setTarget(await r.json());
        } else {
          setTarget(null);
          setError("No device found with that code");
        }
      })
      .catch(() => alive && setError("Network error"))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [code, api]);

  const pickFiles = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: "*/*",
    });
    if (res.canceled) return;
    const assets = res.assets || [];
    const items: PendingFile[] = [];
    for (const a of assets) {
      let blob: any;
      if (Platform.OS === "web") {
        // On web, expo-document-picker returns { file: File } inside asset.
        // @ts-ignore
        blob = a.file;
      } else {
        blob = { uri: a.uri, name: a.name, type: a.mimeType || "application/octet-stream" };
      }
      items.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: a.name,
        size: a.size || (blob?.size ?? 0),
        mime: a.mimeType || (blob?.type ?? "application/octet-stream"),
        blob,
      });
    }
    setPending((p) => [...items, ...p]);
  }, []);

  const removeItem = (id: string) => setPending((p) => p.filter((x) => x.id !== id));

  const canSend = target && pending.length > 0;

  const doSend = useCallback(async () => {
    if (!target || pending.length === 0) return;
    const toSend = [...pending];
    setPending([]);
    for (const item of toSend) {
      await sendFile({
        fileBlob: item.blob,
        filename: item.name,
        mime: item.mime,
        size: item.size,
        toCode: target.code,
      });
    }
  }, [target, pending, sendFile]);

  const totalSize = useMemo(() => pending.reduce((s, i) => s + (i.size || 0), 0), [pending]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.onSurface }]}>Send</Text>
          <Text style={{ color: colors.muted }}>Enter the recipient&apos;s 6-digit code</Text>
        </View>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <Text style={{ color: colors.muted, fontSize: typography.sm, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 1 }}>
            Recipient code
          </Text>
          <TextInput
            testID="send-code-input"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={[
              styles.codeInput,
              { color: colors.onSurface, backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            maxLength={6}
          />
          {checking && <Text style={{ color: colors.muted, marginTop: spacing.sm }}>Looking up…</Text>}
          {error && <Text style={{ color: colors.error, marginTop: spacing.sm }}>{error}</Text>}
          {target && (
            <View
              testID="send-target-info"
              style={[styles.targetBox, { backgroundColor: colors.brandTertiary }]}
            >
              <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.onBrandTertiary, fontWeight: "700" }}>{target.name}</Text>
                <Text style={{ color: colors.onBrandTertiary, fontSize: typography.sm }}>
                  {target.device_type} · code {target.code}
                </Text>
              </View>
            </View>
          )}
        </GlassCard>

        <View style={styles.rowBetween}>
          <Text style={{ color: colors.onSurface, fontSize: typography.xl, fontWeight: "800" }}>
            Files ({pending.length})
          </Text>
          <Pressable
            testID="send-pick-files"
            onPress={pickFiles}
            style={[styles.pickBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          >
            <Ionicons name="add" size={18} color={colors.brand} />
            <Text style={{ color: colors.brand, fontWeight: "700" }}>Add files</Text>
          </Pressable>
        </View>

        {pending.length === 0 ? (
          <Pressable
            testID="send-empty-dropzone"
            onPress={pickFiles}
            style={[styles.dropzone, { borderColor: colors.borderStrong, backgroundColor: colors.surfaceSecondary }]}
          >
            <Ionicons name="cloud-upload-outline" size={44} color={colors.muted} />
            <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: spacing.sm }}>Pick or drop files</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>Images, videos, PDFs, any format</Text>
          </Pressable>
        ) : (
          <View>
            {pending.map((f) => (
              <View
                key={f.id}
                style={[styles.fileRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.brandTertiary }]}>
                  <Ionicons name="document" size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>{f.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: typography.sm }}>{humanBytes(f.size)}</Text>
                </View>
                <Pressable onPress={() => removeItem(f.id)} testID={`send-remove-${f.id}`} hitSlop={12}>
                  <Ionicons name="close-circle" size={22} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            <Text style={{ color: colors.muted, marginTop: spacing.xs }}>Total: {humanBytes(totalSize)}</Text>
          </View>
        )}

        {queue.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={{ color: colors.onSurface, fontSize: typography.xl, fontWeight: "800", marginBottom: spacing.sm }}>
              Transfer queue
            </Text>
            {queue.slice(0, 6).map((t) => (
              <View
                key={t.id}
                style={[styles.queueRow, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: "600" }} numberOfLines={1}>{t.filename}</Text>
                  <View style={[styles.progressBg, { backgroundColor: colors.surfaceTertiary }]}>
                    <View
                      style={{
                        width: `${Math.round(t.progress * 100)}%`,
                        backgroundColor: t.status === "error" ? colors.error : colors.brand,
                        height: 4,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: typography.sm, marginTop: 2 }}>
                    {t.status === "uploading" && `${Math.round(t.progress * 100)}% · ${humanBytes(t.size)}`}
                    {t.status === "done" && `Sent · ${humanBytes(t.size)}`}
                    {t.status === "error" && (t.error || "Failed")}
                  </Text>
                </View>
                <Ionicons
                  name={t.status === "done" ? "checkmark-circle" : t.status === "error" ? "alert-circle" : "sync"}
                  color={t.status === "error" ? colors.error : t.status === "done" ? colors.success : colors.brand}
                  size={22}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 90, backgroundColor: colors.surface + "F0" }]}>
        <Pressable
          testID="send-cta"
          disabled={!canSend}
          onPress={doSend}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: canSend ? colors.brand : colors.surfaceTertiary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="paper-plane" size={20} color={canSend ? colors.onBrandPrimary : colors.muted} />
          <Text style={{ color: canSend ? colors.onBrandPrimary : colors.muted, fontWeight: "800", fontSize: typography.lg }}>
            {canSend ? `Send ${pending.length} file${pending.length > 1 ? "s" : ""}` : "Pick files & code"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingVertical: spacing.md },
  title: { fontSize: typography["3xl"], fontWeight: "800", letterSpacing: -0.5 },
  codeInput: {
    height: 68,
    borderRadius: radius.md,
    borderWidth: 1,
    textAlign: "center",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 12,
  },
  targetBox: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    padding: spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  progressBg: { height: 4, borderRadius: 2, marginTop: 6 },
  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  cta: {
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
