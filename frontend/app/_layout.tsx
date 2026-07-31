import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AppProvider, useApp } from "@/src/context/AppContext";
import { TransferProvider } from "@/src/context/TransferContext";

// Disable logbox errors etc so users can see the app.
LogBox.ignoreAllLogs(true);

// Keep the native splash visible until icon fonts register.
SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { effectiveMode } = useApp();
  return (
    <StatusBar
      barStyle={effectiveMode === "dark" ? "light-content" : "dark-content"}
      backgroundColor="transparent"
      translucent
    />
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <TransferProvider>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="preview/[id]" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
              <Stack.Screen name="smartboard/[id]" options={{ animation: "fade" }} />
            </Stack>
          </TransferProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
