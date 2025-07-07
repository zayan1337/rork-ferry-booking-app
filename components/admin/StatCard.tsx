import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { colors } from "@/constants/adminColors";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = colors.primary,
  size = "medium",
  fullWidth = false
}: StatCardProps) {

  const getCardWidth = () => {
    if (fullWidth) return "100%";

    // Calculate responsive width based on screen size
    const padding = 32; // Total horizontal padding
    const gap = 12; // Gap between cards

    if (screenWidth < 480) {
      // Mobile: 2 cards per row
      return (screenWidth - padding - gap) / 2;
    } else if (screenWidth < 768) {
      // Tablet portrait: 3 cards per row
      return (screenWidth - padding - gap * 2) / 3;
    } else {
      // Tablet landscape/Desktop: 4 cards per row
      return (screenWidth - padding - gap * 3) / 4;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          padding: 12,
          minHeight: 80,
          titleSize: 12,
          valueSize: 18,
          subtitleSize: 10,
        };
      case "large":
        return {
          padding: 20,
          minHeight: 140,
          titleSize: 16,
          valueSize: 32,
          subtitleSize: 14,
        };
      default: // medium
        return {
          padding: 16,
          minHeight: 110,
          titleSize: 14,
          valueSize: 24,
          subtitleSize: 12,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[
      styles.container,
      {
        width: getCardWidth(),
        padding: sizeStyles.padding,
        minHeight: sizeStyles.minHeight
      }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: sizeStyles.titleSize }]} numberOfLines={2}>
          {title}
        </Text>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
            {icon}
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.value,
            {
              color,
              fontSize: sizeStyles.valueSize,
              lineHeight: sizeStyles.valueSize * 1.2
            }
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { fontSize: sizeStyles.subtitleSize }]} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border + "30",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  title: {
    color: colors.textSecondary,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
  },
  value: {
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    fontWeight: "500",
    lineHeight: 14,
  },
});