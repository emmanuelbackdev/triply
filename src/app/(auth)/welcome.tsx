import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthButton } from "@/components/auth/auth-button";
import { AppleIcon, GoogleIcon } from "@/components/auth/auth-icons";
import { useSocialSignIn } from "@/hooks/use-social-sign-in";

const hero = require("@/assets/images/auth-hero.png");

// Darkens the photo toward night-navy (#08131F) from top to bottom.
const overlayColors = [
  "rgba(8, 19, 31, 0.02)",
  "rgba(8, 19, 31, 0.17)",
  "rgba(8, 19, 31, 0.34)",
  "rgba(8, 19, 31, 0.44)",
  "rgba(8, 19, 31, 0.6)",
  "rgba(8, 19, 31, 0.86)",
  "rgba(8, 19, 31, 0.96)",
  "rgba(8, 19, 31, 0.98)",
] as const;
const overlayLocations = [0, 0.15, 0.38, 0.53, 0.62, 0.75, 0.9, 1] as const;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { signIn, pending, error } = useSocialSignIn();

  return (
    <View className="flex-1 bg-night">
      <StatusBar style="light" />
      <Image source={hero} contentFit="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={overlayColors}
        locations={overlayLocations}
        style={StyleSheet.absoluteFill}
      />

      <View
        className="flex-1 justify-end"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <View className="px-6">
          <Text className="text-center text-[44px] font-extrabold leading-[50px] tracking-[-0.5px] text-white">
            Your next adventure starts here
          </Text>
        </View>

        <View className="mt-9 gap-[15px] px-0.5">
          <AuthButton
            variant="light"
            label="Continue with Google"
            icon={<GoogleIcon size={23} />}
            onPress={() => signIn("google")}
            loading={pending === "google"}
            disabled={pending === "apple"}
          />
          <AuthButton
            variant="light"
            label="Continue with Apple"
            icon={<AppleIcon size={22} />}
            onPress={() => signIn("apple")}
            loading={pending === "apple"}
            disabled={pending === "google"}
          />
        </View>

        {error ? (
          <Text
            accessibilityRole="alert"
            className="mt-4 px-6 text-center text-[14px] text-red-300"
          >
            {error}
          </Text>
        ) : null}

        <Text className="mt-8 px-6 text-center text-[15px] leading-[23px] text-white/80">
          By continuing, you agree to our{"\n"}
          <Text className="text-link">Terms of Service</Text> and{" "}
          <Text className="text-link">Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}
