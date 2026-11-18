import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

// Protected routes. Signed-out users are sent to the welcome screen.
export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/welcome" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
