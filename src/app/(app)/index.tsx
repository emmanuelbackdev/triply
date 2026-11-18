import { useClerk, useUser } from "@clerk/expo";
import * as Sentry from "@sentry/react-native";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Placeholder home until the trips screens land.
export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useClerk();

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center gap-6 bg-white px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-center text-2xl font-bold text-black">
        Welcome{user?.firstName ? `, ${user.firstName}` : ""}!
      </Text>
      <Text className="text-center text-base text-neutral-500">
        {user?.primaryEmailAddress?.emailAddress}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onSignOut}
        className="h-12 items-center justify-center rounded-full bg-black px-8 active:opacity-80"
      >
        <Text className="text-base font-semibold text-white">Sign out</Text>
      </Pressable>
    </View>
  );
}
