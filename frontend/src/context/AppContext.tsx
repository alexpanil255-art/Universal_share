import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance } from "react-native";
import { storage } from "@/src/utils/storage";
import { Colors, darkColors, lightColors, ThemeMode } from "@/src/theme/theme";

const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  "https://universal-share-backend.onrender.com";

const API = `${BACKEND_URL}/api`;
const API = `${BACKEND_URL}/api`;

export interface Device {
  id: string;
  code: string;
  name: string;
  device_type: string;
  created_at: string;
  last_seen: string;
}

interface AppState {
  device: Device | null;
  themeMode: ThemeMode | "system";
  effectiveMode: ThemeMode;
  colors: Colors;
  api: string;
  backendUrl: string;
  registering: boolean;
  registerDevice: (name: string, deviceType?: string) => Promise<Device>;
  renameDevice: (name: string) => Promise<void>;
  setThemeMode: (m: ThemeMode | "system") => Promise<void>;
  refreshDevice: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const DEVICE_KEY = "es.device.v1";
const THEME_KEY = "es.theme.v1";

function detectDeviceType(): string {
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|tablet/.test(ua)) return "tablet";
    if (/iphone|android.*mobile|mobile/.test(ua)) return "phone";
    if (/mac|windows|linux/.test(ua)) return "laptop";
  }
  return "phone";
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode | "system">("system");
  const [systemMode, setSystemMode] = useState<ThemeMode>(
    (Appearance.getColorScheme() as ThemeMode) || "light"
  );
  const [registering, setRegistering] = useState(false);

  // hydrate persisted state
  useEffect(() => {
    (async () => {
      const [rawDevice, rawTheme] = await Promise.all([
        storage.getItem(DEVICE_KEY, null),
        storage.getItem(THEME_KEY, null),
      ]);
      if (rawDevice) {
        try {
          setDevice(JSON.parse(rawDevice));
        } catch {}
      }
      if (rawTheme === "light" || rawTheme === "dark" || rawTheme === "system") {
        setThemeModeState(rawTheme);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode((colorScheme as ThemeMode) || "light");
    });
    return () => sub.remove();
  }, []);

  const registerDevice = useCallback(async (name: string, deviceType?: string) => {
    setRegistering(true);
    try {
      const res = await fetch(`${API}/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "My Device",
          device_type: deviceType || detectDeviceType(),
        }),
      });
      if (!res.ok) throw new Error("register failed");
      const d: Device = await res.json();
      await storage.setItem(DEVICE_KEY, JSON.stringify(d));
      setDevice(d);
      return d;
    } finally {
      setRegistering(false);
    }
  }, []);

  const renameDevice = useCallback(async (name: string) => {
    if (!device) return;
    const res = await fetch(`${API}/devices/${device.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("rename failed");
    const d: Device = await res.json();
    await storage.setItem(DEVICE_KEY, JSON.stringify(d));
    setDevice(d);
  }, [device]);

  const refreshDevice = useCallback(async () => {
    if (!device) return;
    try {
      const res = await fetch(`${API}/devices/${device.id}`);
      if (res.status === 404) {
        // stale device — clear so we can re-register
        await storage.removeItem(DEVICE_KEY);
        setDevice(null);
        return;
      }
      if (res.ok) {
        const d: Device = await res.json();
        await storage.setItem(DEVICE_KEY, JSON.stringify(d));
        setDevice(d);
      }
    } catch {
      // offline is fine
    }
  }, [device]);

  const setThemeMode = useCallback(async (m: ThemeMode | "system") => {
    setThemeModeState(m);
    await storage.setItem(THEME_KEY, m);
  }, []);

  const effectiveMode: ThemeMode = themeMode === "system" ? systemMode : themeMode;
  const colors = effectiveMode === "dark" ? darkColors : lightColors;

  const value: AppState = useMemo(
    () => ({
      device,
      themeMode,
      effectiveMode,
      colors,
      api: API,
      backendUrl: BACKEND_URL,
      registering,
      registerDevice,
      renameDevice,
      setThemeMode,
      refreshDevice,
    }),
    [device, themeMode, effectiveMode, colors, registering, registerDevice, renameDevice, setThemeMode, refreshDevice]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppState {
  const v = useContext(AppContext);
  if (!v) throw new Error("useApp must be used inside AppProvider");
  return v;
}
