import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/adminColors";

type StatusType =
  | "confirmed" | "pending" | "cancelled" | "completed"
  | "paid" | "refunded" | "failed"
  | "active" | "inactive" | "suspended" | "maintenance"
  | "scheduled" | "in-progress";

interface StatusBadgeProps {
  status: StatusType;
  size?: "small" | "medium";
}

export default function StatusBadge({ status, size = "medium" }: StatusBadgeProps) {
  const getStatusColor = () => {
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
      default:
        return {
          bg: colors.backgroundSecondary,
          text: colors.textSecondary,
        };
    }
  };

  const { bg, text } = getStatusColor();
  const isSmall = size === "small";

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.smallBadge]}>
      <Text style={[styles.text, { color: text }, isSmall && styles.smallText]}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
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
  },
  smallText: {
    fontSize: 12,
  },
});