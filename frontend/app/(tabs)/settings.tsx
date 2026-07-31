import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { useTransfers } from "@/src/context/TransferContext";
import { GlassCard } from "@/src/components/GlassCard";
import { radius, spacing, typography } from "@/src/theme/theme";
import { storage } from "@/src/utils/storage";

export default function SettingsScreen() {
  const { device, colors, themeMode, setThemeMode, renameDevice } = useApp();
  const { received, sent } = useTransfers();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState(device?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveName = async () => {
    if (!device || !name.trim() || name.trim() === device.name) return;
    setSavingName(true);
    try {
      await renameDevice(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSavingName(false);
    }
  };

  const modes: { key: "system" | "light" | "dark"; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "system", label: "System", icon: "phone-portrait" },
    { key: "light", label: "Light", icon: "sunny" },
    { key: "dark", label: "Dark", icon: "moon" },
  ];

  const resetDevice = async () => {
    await storage.removeItem("es.device.v1");
    router.replace("/onboarding");
  };

  if (!device) return null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 + insets.bottom }}>
        <Text style={[styles.title, { color: colors.onSurface }]}>Settings</Text>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <Text style={styles.label(colors)}>Device name</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TextInput
              testID="settings-name-input"
              style={[styles.input, { color: colors.onSurface, backgroundColor: colors.surface, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />
            <Pressable
              testID="settings-save-name"
              onPress={saveName}
              disabled={savingName || !name.trim() || name.trim() === device.name}
              style={[
                styles.saveBtn,
                {
                  backgroundColor: name.trim() && name.trim() !== device.name ? colors.brand : colors.surfaceTertiary,
                },
              ]}
            >
              <Text style={{
                color: name.trim() && name.trim() !== device.name ? colors.onBrandPrimary : colors.muted,
                fontWeight: "700",
              }}>
                {saved ? "Saved!" : savingName ? "…" : "Save"}
              </Text>
            </Pressable>
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <Text style={styles.label(colors)}>Appearance</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            {modes.map((m) => {
              const active = themeMode === m.key;
              return (
                <Pressable
                  key={m.key}
                  testID={`theme-${m.key}`}
                  onPress={() => setThemeMode(m.key)}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: active ? colors.brandTertiary : colors.surface,
                      borderColor: active ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={m.icon} size={20} color={active ? colors.brand : colors.onSurface} />
                  <Text style={{ color: active ? colors.brand : colors.onSurface, fontWeight: "600" }}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <Text style={styles.label(colors)}>Device info</Text>
          <InfoRow label="ID" value={device.id.slice(0, 8) + "…"} colors={colors} />
          <InfoRow label="Code" value={device.code} colors={colors} highlight />
          <InfoRow label="Type" value={device.device_type} colors={colors} />
          <InfoRow label="Files received" value={String(received.length)} colors={colors} />
          <InfoRow label="Files sent" value={String(sent.length)} colors={colors} />
        </GlassCard>

        <Pressable
          testID="settings-reset-device"
          onPress={resetDevice}
          style={[styles.dangerBtn, { borderColor: colors.error }]}
        >
          <Ionicons name="refresh" size={18} color={colors.error} />
          <Text style={{ color: colors.error, fontWeight: "700" }}>Reset device (new code)</Text>
        </Pressable>

        <Text style={{ color: colors.muted, textAlign: "center", marginTop: spacing.xl }}>
          Everything Share · v1.0.0{"\n"}Open source · MIT license
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow: React.FC<{ label: string; value: string; colors: any; highlight?: boolean }> = ({ label, value, colors, highlight }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm }}>
    <Text style={{ color: colors.muted }}>{label}</Text>
    <Text style={{ color: highlight ? colors.brand : colors.onSurface, fontWeight: highlight ? "800" : "600", letterSpacing: highlight ? 3 : 0 }}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: typography["3xl"], fontWeight: "800", letterSpacing: -0.5, marginBottom: spacing.lg },
  label: (colors: any) => ({
    color: colors.muted,
    fontSize: typography.sm,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  }),
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    fontSize: typography.lg,
  },
  saveBtn: {
    height: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  themeChip: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  dangerBtn: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
