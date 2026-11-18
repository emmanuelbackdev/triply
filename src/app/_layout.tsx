import "../../global.css";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: "https://fc54fba5a4152bce84bf136f574fbef0@o4512450637594624.ingest.de.sentry.io/4512450656534608",
  // Adds context data to events, such as IP address, cookies, and user.
  sendDefaultPii: true,

  integrations: [
    // Enables Session Replay
    Sentry.mobileReplayIntegration(),
    // Enables User Feedback. Open the form with Sentry.showFeedbackWidget().
    Sentry.feedbackIntegration(),
  ],

  // Enables Tracing.
  // Set to 1.0 to capture 100% of spans for tracing.
  // We recommend reducing this value in production.
  tracesSampleRate: 1.0,

  // Enables Profiling for 100% of sampled transactions.
  profilesSampleRate: 1.0,

  // Enables Logs to be sent to Sentry.
  enableLogs: true,

  // Capture replays for 10% of sessions and 100% of sessions with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to .env.local.",
  );
}

function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey!} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }} />
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayout);
