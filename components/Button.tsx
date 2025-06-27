import React from "react";
import { StyleSheet, Text, TouchableOpacity, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import Colors from "@/constants/colors";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "text";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case "primary":
        return styles.primaryButton;
      case "secondary":
        return styles.secondaryButton;
      case "outline":
        return styles.outlineButton;
      case "text":
        return styles.textButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case "primary":
        return styles.primaryText;
      case "secondary":
        return styles.secondaryText;
      case "outline":
        return styles.outlineText;
      case "text":
        return styles.textButtonText;
      default:
        return styles.primaryText;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case "small":
        return styles.smallButton;
      case "medium":
        return styles.mediumButton;
      case "large":
        return styles.largeButton;
      default:
        return styles.mediumButton;
    }
  };

  const getTextSizeStyle = () => {
    switch (size) {
      case "small":
        return styles.smallText;
      case "medium":
        return styles.mediumText;
      case "large":
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyle(),
        getSizeStyle(),
        disabled && styles.disabledButton,
        fullWidth && styles.fullWidth,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" || variant === "text" ? Colors.primary : "white"}
          size="small"
        />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              getTextStyle(),
              getTextSizeStyle(),
              disabled && styles.disabledText,
              icon ? { marginLeft: 8 } : undefined,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  textButton: {
    backgroundColor: "transparent",
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  mediumButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  largeButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryText: {
    color: "white",
    fontWeight: "600",
  },
  secondaryText: {
    color: "white",
    fontWeight: "600",
  },
  outlineText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  textButtonText: {
    color: Colors.primary,
    fontWeight: "600",
  },
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },
  disabledButton: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
  },
  disabledText: {
    color: Colors.subtext,
  },
  fullWidth: {
    width: '100%',
  },
});