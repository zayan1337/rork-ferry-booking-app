import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "@/constants/adminColors";
import { AlertCircle, Calendar, CreditCard, Ship } from "lucide-react-native";
import { Alert } from "@/types/admin";

interface AlertItemProps {
  alert: Alert;
  onPress?: () => void;
}

export default function AlertItem({ alert, onPress }: AlertItemProps) {
  const getAlertIcon = () => {
    switch (alert.type) {
      case "schedule":
        return <Calendar size={20} color={colors.primary} />;
      case "payment":
        return <CreditCard size={20} color={colors.warning} />;
      case "capacity":
        return <Ship size={20} color={colors.success} />;
      case "system":
      default:
        return <AlertCircle size={20} color={colors.danger} />;
    }
  };

  const getSeverityColor = () => {
    switch (alert.severity) {
      case "high":
        return colors.danger;
      case "medium":
        return colors.warning;
      case "low":
      default:
        return colors.success;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <TouchableOpacity
      style={[styles.container, !alert.read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{getAlertIcon()}</View>
      <View style={styles.content}>
        <Text style={styles.message}>{alert.message}</Text>
        <View style={styles.footer}>
          <View style={[styles.severityIndicator, { backgroundColor: getSeverityColor() }]} />
          <Text style={styles.time}>{formatTime(alert.timestamp)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  unread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  severityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});