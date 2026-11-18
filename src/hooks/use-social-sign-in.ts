import { isClerkAPIResponseError, useClerk, useSSO } from "@clerk/expo";
import { useSignInWithApple } from "@clerk/expo/apple";
import * as Sentry from "@sentry/react-native";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

export type SocialProvider = "google" | "apple";

const GENERIC_ERROR = "Something went wrong signing you in. Please try again.";

function isCancellation(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err.code === "ERR_REQUEST_CANCELED" || err.code === "SIGN_IN_CANCELLED")
  );
}

// Preloads the browser on Android so the SSO sheet opens faster.
function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

/**
 * Google and Apple sign-in (one combined sign-in-or-sign-up flow).
 * - iOS Apple: native sheet.
 * - Native (other): Clerk's browser SSO via an in-app auth session.
 * - Web: full-page redirect. `useSSO` opens a popup only after an awaited
 *   network call, which browsers (Safari especially) block because the click's
 *   user activation has expired. `/sso-callback` finishes the redirect flow.
 */
export function useSocialSignIn() {
  useWarmUpBrowser();

  const router = useRouter();
  const clerk = useClerk();
  const { startSSOFlow } = useSSO();
  const { startAppleAuthenticationFlow } = useSignInWithApple();
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: SocialProvider) {
    if (pending) return;
    setPending(provider);
    setError(null);

    try {
      if (Platform.OS === "web") {
        const signInResource = clerk.client?.signIn;
        if (!signInResource) throw new Error("Clerk client is not loaded yet");
        // Navigates the whole page to the provider; /sso-callback completes it.
        await signInResource.authenticateWithRedirect({
          strategy: provider === "google" ? "oauth_google" : "oauth_apple",
          redirectUrl: "/sso-callback",
          redirectUrlComplete: "/",
        });
        return;
      }

      const result =
        provider === "apple" && Platform.OS === "ios"
          ? await startAppleAuthenticationFlow()
          : await startSSOFlow({
              strategy: provider === "google" ? "oauth_google" : "oauth_apple",
            });

      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace("/");
        return;
      }

      // The instance requires no extra sign-up fields, so this means the
      // dashboard config changed. Surface it instead of failing silently.
      if (result.signUp?.status === "missing_requirements") {
        Sentry.captureMessage("Social sign-up missing requirements", {
          extra: { provider, missingFields: result.signUp.missingFields },
        });
        setError(GENERIC_ERROR);
      }
      // Otherwise the user closed the sheet or browser: do nothing.
    } catch (err) {
      if (isCancellation(err)) return;
      Sentry.captureException(err, { extra: { provider } });
      setError(
        isClerkAPIResponseError(err)
          ? (err.errors[0]?.longMessage ?? err.errors[0]?.message ?? GENERIC_ERROR)
          : GENERIC_ERROR,
      );
    } finally {
      setPending(null);
    }
  }

  return { signIn, pending, error };
}
