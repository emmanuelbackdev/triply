import { useAuth, useClerk } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { Redirect } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, View } from "react-native";

// Return URL for Clerk SSO (triply://sso-callback on native, /sso-callback on web).
// - Web: the full-page OAuth redirect lands here. `handleRedirectCallback`
//   finishes sign-in or sign-up, sets the session and navigates to "/".
// - Native: the in-app auth session already finished the flow. If a device
//   opens this route via the deep link, send the user on to the right place.
export default function SSOCallback() {
  const { isLoaded } = useAuth();
  const clerk = useClerk();
  const handled = useRef(false);

  useEffect(() => {
    if (Platform.OS !== "web" || !isLoaded || handled.current) return;
    handled.current = true;
    clerk
      .handleRedirectCallback({
        signInFallbackRedirectUrl: "/",
        signUpFallbackRedirectUrl: "/",
        signInUrl: "/welcome",
        signUpUrl: "/welcome",
      })
      .catch((err: unknown) => {
        Sentry.captureException(err, { extra: { flow: "sso-callback" } });
        window.location.replace("/welcome");
      });
  }, [clerk, isLoaded]);

  if (Platform.OS !== "web" && isLoaded) return <Redirect href="/" />;

  return (
    <View className="flex-1 items-center justify-center bg-night">
      <ActivityIndicator color="#FFFFFF" />
    </View>
  );
}
