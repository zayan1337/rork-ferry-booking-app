import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAuthStore } from "@/store/authStore";
import {
  User,
  Mail,
  Shield,
  Settings,
  Bell,
  Lock,
  FileText,
  LogOut,
  X,
  Phone,
  Calendar,
  MapPin,
  Activity
} from "lucide-react-native";
import Button from "@/components/admin/Button";

export default function AdminProfileModal() {
  const { user, signOut } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled by the app layout
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name
      ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
      : "AD";
  };

  const adminProfile = user?.profile;
  const adminName = adminProfile?.full_name || (user?.email ? user.email.split("@")[0] : "") || "Admin";
  const adminEmail = user?.email || "";
  const adminRole = adminProfile?.role || "admin";

  const quickActions = [
    {
      id: "notifications",
      title: "Notifications",
      description: "Manage alerts and notifications",
      icon: <Bell size={20} color={colors.warning} />,
      onPress: () => {/* Navigate to notifications */ },
    },
    {
      id: "security",
      title: "Security Settings",
      description: "Password and security",
      icon: <Lock size={20} color={colors.danger} />,
      onPress: () => {/* Navigate to security */ },
    },
    {
      id: "system",
      title: "System Settings",
      description: "App configuration",
      icon: <Settings size={20} color={colors.textSecondary} />,
      onPress: () => {/* Navigate to system settings */ },
    },
    {
      id: "reports",
      title: "Export Reports",
      description: "Download system reports",
      icon: <FileText size={20} color={colors.primary} />,
      onPress: () => router.push("../reports/export"),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: "Admin Profile",
          presentation: "modal",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(adminName)}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: colors.success }]} />
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.name}>{adminName}</Text>
          <Text style={styles.email}>{adminEmail}</Text>
          <View style={styles.roleBadge}>
            <Shield size={14} color="white" />
            <Text style={styles.roleText}>{adminRole.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Admin Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <User size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{adminProfile?.full_name || adminName}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Mail size={20} color={colors.secondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{adminEmail}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Phone size={20} color={colors.warning} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>
                {adminProfile?.mobile_number || "Not provided"}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Shield size={20} color={colors.danger} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Role & Permissions</Text>
              <Text style={styles.detailValue}>
                {adminRole === "admin" ? "Full Admin Access" : "Captain Access"}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Activity size={20} color={colors.success} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Account Status</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>
                Active
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings & Tools</Text>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionCard}
            onPress={action.onPress}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                {action.icon}
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </View>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* System Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Information</Text>
        <View style={styles.systemCard}>
          <View style={styles.systemItem}>
            <Text style={styles.systemLabel}>App Version</Text>
            <Text style={styles.systemValue}>1.0.0</Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemLabel}>Last Login</Text>
            <Text style={styles.systemValue}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemLabel}>Database Status</Text>
            <Text style={[styles.systemValue, { color: colors.success }]}>
              Connected
            </Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <Button
          title="Logout"
          variant="danger"
          icon={<LogOut size={20} color="white" />}
          onPress={handleLogout}
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.card,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 4,
  },
  roleText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "500",
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  arrowText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: "300",
  },
  systemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  systemItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  systemLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  systemValue: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  logoutContainer: {
    marginTop: 16,
  },
});
