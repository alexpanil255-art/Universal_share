// Everything Share — theme tokens (derived from /app/design_guidelines.json)
export type ThemeMode = "light" | "dark";

export const lightColors = {
  surface: "#F5F5F7",
  onSurface: "#1C1C1E",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1C1C1E",
  surfaceTertiary: "#E5E5EA",
  onSurfaceTertiary: "#3A3A3C",
  surfaceInverse: "#1C1C1E",
  onSurfaceInverse: "#FFFFFF",
  brand: "#10B981",
  brandPrimary: "#10B981",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#34D399",
  onBrandSecondary: "#064E3B",
  brandTertiary: "#D1FAE5",
  onBrandTertiary: "#065F46",
  success: "#34C759",
  warning: "#FF9F0A",
  error: "#FF453A",
  info: "#32ADE6",
  border: "#E5E5EA",
  borderStrong: "#C7C7CC",
  divider: "#C6C6C8",
  muted: "#8E8E93",
  overlay: "rgba(0,0,0,0.4)",
} as const;

export const darkColors = {
  surface: "#000000",
  onSurface: "#F2F2F7",
  surfaceSecondary: "#1C1C1E",
  onSurfaceSecondary: "#F2F2F7",
  surfaceTertiary: "#2C2C2E",
  onSurfaceTertiary: "#EBEBF5",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#1C1C1E",
  brand: "#10B981",
  brandPrimary: "#10B981",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#34D399",
  onBrandSecondary: "#064E3B",
  brandTertiary: "#064E3B",
  onBrandTertiary: "#D1FAE5",
  success: "#34C759",
  warning: "#FF9F0A",
  error: "#FF453A",
  info: "#32ADE6",
  border: "#38383A",
  borderStrong: "#48484A",
  divider: "#38383A",
  muted: "#8E8E93",
  overlay: "rgba(0,0,0,0.6)",
} as const;

export type Colors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  displayFontFamily: "System",
  textFontFamily: "System",
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;
