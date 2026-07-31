import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTransfers } from "@/src/context/TransferContext";
import { useApp } from "@/src/context/AppContext";
import { radius, spacing, typography } from "@/src/theme/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const IncomingToast: React.FC = () => {
  const { incomingToast, clearIncoming } = useTransfers();
  const { colors } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (incomingToast) {
      const t = setTimeout(() => clearIncoming(), 4500);
      return () => clearTimeout(t);
    }
  }, [incomingToast, clearIncoming]);

  if (!incomingToast) return null;

  return (
    <Animated.View
      entering={FadeInDown}
      exiting={FadeOutUp}
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        testID="incoming-toast"
        onPress={() => {
          const id = incomingToast.id;
          clearIncoming();
          router.push(`/preview/${id}`);
        }}
        style={[styles.toast, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: colors.brandTertiary }]}>
          <Ionicons name="download" size={20} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.onSurface, fontWeight: "700" }} numberOfLines={1}>
            Received &quot;{incomingToast.filename}&quot;
          </Text>
          <Text style={{ color: colors.muted, fontSize: typography.sm }} numberOfLines={1}>
            from {incomingToast.from_device_name}
          </Text>
        </View>
        <Text style={{ color: colors.brand, fontWeight: "700" }}>Open</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
});
