import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/src/context/AppContext";
import { IncomingToast } from "@/src/components/IncomingToast";

function TabBarBg() {
  const { effectiveMode, colors } = useApp();
  if (Platform.OS === "web") {
    return (
      <View
        // @ts-ignore
        style={[StyleSheet.absoluteFill, { backgroundColor: effectiveMode === "dark" ? "rgba(28,28,30,0.72)" : "rgba(255,255,255,0.78)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTopWidth: 1, borderTopColor: colors.border }]}
      />
    );
  }
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={60} tint={effectiveMode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { borderTopWidth: 1, borderTopColor: colors.border }]} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useApp();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            position: "absolute",
            borderTopWidth: 0,
            backgroundColor: "transparent",
            elevation: 0,
            height: 78,
            paddingBottom: 20,
            paddingTop: 10,
          },
          tabBarBackground: () => <TabBarBg />,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
            tabBarButtonTestID: "tab-home",
          }}
        />
        <Tabs.Screen
          name="send"
          options={{
            title: "Send",
            tabBarIcon: ({ color, size }) => <Ionicons name="paper-plane" color={color} size={size} />,
            tabBarButtonTestID: "tab-send",
          }}
        />
        <Tabs.Screen
          name="receive"
          options={{
            title: "Receive",
            tabBarIcon: ({ color, size }) => <Ionicons name="download" color={color} size={size} />,
            tabBarButtonTestID: "tab-receive",
          }}
        />
        <Tabs.Screen
          name="files"
          options={{
            title: "Files",
            tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
            tabBarButtonTestID: "tab-files",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
            tabBarButtonTestID: "tab-settings",
          }}
        />
      </Tabs>
      <IncomingToast />
    </>
  );
}
