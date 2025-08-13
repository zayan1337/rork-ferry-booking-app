import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Users,
  Ship,
} from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import { UserProfile } from "@/types/userManagement";

interface UserInfoSectionProps {
  user: UserProfile;
}

export default function UserInfoSection({ user }: UserInfoSectionProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield size={20} color={colors.warning} />;
      case "agent":
        return <Users size={20} color={colors.info} />;
      case "customer":
        return <User size={20} color={colors.primary} />;
      case "passenger":
        return <User size={20} color={colors.success} />;
      case "captain":
        return <Ship size={20} color={colors.primary} />;
      default:
        return <User size={20} color={colors.textSecondary} />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return colors.warning;
      case "agent":
        return colors.info;
      case "customer":
        return colors.primary;
      case "passenger":
        return colors.success;
      case "captain":
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return colors.success;
      case "inactive":
        return colors.textSecondary;
      case "suspended":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>User Information</Text>

      <View style={styles.infoGrid}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <User size={20} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user.name}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View
              style={[styles.infoIcon, { backgroundColor: colors.infoLight }]}
            >
              <Mail size={20} color={colors.info} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: colors.successLight },
              ]}
            >
              <Phone size={20} color={colors.success} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>
                {user.mobile_number || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: getRoleColor(user.role) + "20" },
              ]}
            >
              {getRoleIcon(user.role)}
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text
                style={[styles.infoValue, { color: getRoleColor(user.role) }]}
              >
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {user.date_of_birth && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <View
                style={[
                  styles.infoIcon,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Calendar size={20} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{user.date_of_birth}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View
                style={[
                  styles.infoIcon,
                  {
                    backgroundColor:
                      user.status === "active"
                        ? colors.successLight
                        : colors.backgroundTertiary,
                  },
                ]}
              >
                <User
                  size={20}
                  color={
                    user.status === "active"
                      ? colors.success
                      : colors.textSecondary
                  }
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: getStatusColor(user.status) },
                  ]}
                >
                  {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  infoGrid: {
    gap: 20,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
  },
  infoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    lineHeight: 20,
  },
});
