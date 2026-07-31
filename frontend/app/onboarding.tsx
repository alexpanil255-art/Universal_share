import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useApp } from "@/src/context/AppContext";
import { radius, spacing, typography } from "@/src/theme/theme";

const DEVICE_OPTIONS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "phone", label: "Phone", icon: "phone-portrait" },
  { key: "tablet", label: "Tablet", icon: "tablet-portrait" },
  { key: "laptop", label: "Laptop", icon: "laptop" },
  { key: "desktop", label: "Desktop", icon: "desktop" },
  { key: "board", label: "Smart Board", icon: "easel" },
];

export default function Onboarding() {
  const { colors, registerDevice, registering } = useApp();
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("phone");

  const submit = async () => {
    const finalName = name.trim() || "My Device";
    await registerDevice(finalName, type);
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.surface }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={[styles.logoWrap, { backgroundColor: colors.brandTertiary }]}>
            <Ionicons name="share-social" size={44} color={colors.brand} />
          </View>
          <Text style={[styles.title, { color: colors.onSurface }]} testID="onboarding-title">
            Everything Share
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            No accounts. No cloud. Just share.
          </Text>

          <View style={{ height: spacing["2xl"] }} />

          <Text style={[styles.label, { color: colors.onSurface }]}>Name this device</Text>
          <TextInput
            testID="onboarding-name-input"
            placeholder="e.g. Alex's iPhone"
            placeholderTextColor={colors.muted}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceSecondary,
                color: colors.onSurface,
                borderColor: colors.border,
              },
            ]}
            value={name}
            onChangeText={setName}
            maxLength={40}
            autoFocus
          />

          <Text style={[styles.label, { color: colors.onSurface, marginTop: spacing.lg }]}>Device type</Text>
          <View style={styles.typeGrid}>
            {DEVICE_OPTIONS.map((o) => {
              const active = type === o.key;
              return (
                <Pressable
                  key={o.key}
                  testID={`onboarding-type-${o.key}`}
                  onPress={() => setType(o.key)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: active ? colors.brandTertiary : colors.surfaceSecondary,
                      borderColor: active ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Ionicons name={o.icon} size={18} color={active ? colors.brand : colors.onSurfaceTertiary} />
                  <Text style={{ color: active ? colors.brand : colors.onSurface, fontWeight: "600" }}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flex: 1 }} />

          <Pressable
            testID="onboarding-continue"
            onPress={submit}
            disabled={registering}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: colors.brand,
                opacity: pressed || registering ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.ctaText, { color: colors.onBrandPrimary }]}>
              {registering ? "Setting up…" : "Get started"}
            </Text>
          </Pressable>
          <Text style={[styles.footnote, { color: colors.muted }]}>
            A unique 6-digit code will be created for this device.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, padding: spacing.xl, paddingTop: spacing["2xl"] },
  logoWrap: {
    width: 88, height: 88, borderRadius: radius.lg,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: typography["3xl"], fontWeight: "800", letterSpacing: -0.5 },
  subtitle: { fontSize: typography.lg, marginTop: spacing.xs },
  label: { fontSize: typography.base, fontWeight: "600", marginBottom: spacing.sm },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    fontSize: typography.lg,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    minHeight: 40,
  },
  cta: {
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  ctaText: { fontSize: typography.lg, fontWeight: "700" },
  footnote: { textAlign: "center", fontSize: typography.sm },
});
