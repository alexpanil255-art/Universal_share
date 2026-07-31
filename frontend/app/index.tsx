import { Redirect } from "expo-router";
import { useApp } from "@/src/context/AppContext";

export default function Index() {
  const { device } = useApp();
  if (!device) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
