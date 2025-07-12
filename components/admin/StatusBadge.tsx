import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/adminColors";

type StatusType =
  | "confirmed" | "pending" | "cancelled" | "completed"
  | "paid" | "refunded" | "failed"
  | "active" | "inactive" | "suspended" | "banned" | "maintenance"
  | "scheduled" | "in-progress";

interface StatusBadgeProps {
  status: StatusType;
  size?: "small" | "medium";
  variant?: "default" | "payment";
}

export default function StatusBadge({ status, size = "medium", variant = "default" }: StatusBadgeProps) {
  const getStatusColor = () => {
    // Payment-specific styling
    if (variant === "payment") {
      switch (status) {
        case "paid":
        case "completed":
          return {
            bg: "#E8F5E8",
            text: "#2E7D32",
          };
        case "pending":
          return {
            bg: "#FFF3E0",
            text: "#F57C00",
          };
        case "failed":
        case "refunded":
          return {
            bg: "#FFEBEE",
            text: "#C62828",
          };
        default:
          return {
            bg: colors.backgroundSecondary,
            text: colors.textSecondary,
          };
      }
    }

    // Default status styling
    switch (status) {
      case "confirmed":
      case "completed":
      case "paid":
      case "active":
      case "scheduled":
        return {
          bg: "#E3F9E5",
          text: "#34C759",
        };
      case "pending":
      case "in-progress":
        return {
          bg: "#FFF9E6",
          text: "#FF9500",
        };
      case "cancelled":
      case "refunded":
      case "inactive":
      case "suspended":
      case "maintenance":
      case "failed":
        return {
          bg: "#FFE5E5",
          text: "#FF3B30",
        };
      case "banned":
        return {
          bg: "#2C2C2E",
          text: "#FFFFFF",
        };
      default:
        return {
          bg: colors.backgroundSecondary,
          text: colors.textSecondary,
        };
    }
  };

  const { bg, text } = getStatusColor();
  const isSmall = size === "small";

  const formatStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.smallBadge]}>
      <Text style={[styles.text, { color: text }, isSmall && styles.smallText]}>
        {formatStatusText(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 16,
  },
  smallText: {
    fontSize: 12,
    lineHeight: 14,
  },
});