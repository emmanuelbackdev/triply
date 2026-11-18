import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

type AuthButtonProps = {
  label: string;
  icon: ReactNode;
  variant: "primary" | "light";
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AuthButton({
  label,
  icon,
  variant,
  onPress,
  loading = false,
  disabled = false,
}: AuthButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-[61px] flex-row items-center justify-center gap-3 rounded-full active:opacity-85 ${
        isPrimary ? "bg-primary shadow-lg shadow-primary/50" : "bg-white"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#FFFFFF" : "#000000"} />
      ) : (
        icon
      )}
      <Text
        className={`text-[18px] font-semibold ${
          isPrimary ? "text-white" : "text-black"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
