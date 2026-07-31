import React from "react";
import { Platform, StyleSheet, View, ViewProps, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useApp } from "@/src/context/AppContext";
import { radius, spacing } from "@/src/theme/theme";

interface Props extends ViewProps {
  intensity?: number;
  padding?: keyof typeof spacing | number;
  style?: ViewStyle | ViewStyle[];
}

export const GlassCard: React.FC<Props> = ({ children, intensity = 40, padding = "lg", style, ...rest }) => {
  const { effectiveMode, colors } = useApp();
  const p = typeof padding === "number" ? padding : spacing[padding];
  const useNativeBlur = Platform.OS !== "web";

  const container: ViewStyle = {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: effectiveMode === "dark" ? "rgba(28,28,30,0.72)" : "rgba(255,255,255,0.72)",
  };

  const inner: ViewStyle = { padding: p };

  if (useNativeBlur) {
    return (
      <View style={[container, style as any]} {...rest}>
        <BlurView intensity={intensity} tint={effectiveMode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={inner}>{children}</View>
      </View>
    );
  }

  // web: rely on backdrop-filter via inline style
  const webStyle: any = {
    // @ts-ignore
    backdropFilter: "blur(24px)",
    // @ts-ignore
    WebkitBackdropFilter: "blur(24px)",
  };
  return (
    <View style={[container, webStyle, style as any]} {...rest}>
      <View style={inner}>{children}</View>
    </View>
  );
};
