import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { Stack } from "expo-router";
import { colors } from "@/constants/adminColors";
import {
  Bell,
  CreditCard,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Settings as SettingsIcon,
  User
} from "lucide-react-native";
import { useAdminStore } from "@/store/admin/adminStore";

const SettingItem = ({
  icon,
  title,
  description,
  onPress,
  rightElement,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) => {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingIconContainer}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );
};

const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
  return (
    <View style={styles.settingSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

export default function SettingsScreen() {
  const { darkMode, toggleDarkMode } = useAdminStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Settings",
        }}
      />

      <View style={styles.profileSection}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>AD</Text>
        </View>
        <Text style={styles.profileName}>Admin User</Text>
        <Text style={styles.profileEmail}>admin@ferrycompany.com</Text>
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <SettingSection title="Appearance">
        <SettingItem
          icon={<Moon size={22} color={colors.primary} />}
          title="Dark Mode"
          description="Switch between light and dark themes"
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={darkMode ? colors.primary : "#f4f3f4"}
            />
          }
        />
      </SettingSection>

      <SettingSection title="Notifications">
        <SettingItem
          icon={<Bell size={22} color={colors.primary} />}
          title="Push Notifications"
          description="Receive alerts about bookings and system events"
          rightElement={
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={notificationsEnabled ? colors.primary : "#f4f3f4"}
            />
          }
        />
        <SettingItem
          icon={<Mail size={22} color={colors.primary} />}
          title="Email Notifications"
          description="Receive daily reports and summaries via email"
          rightElement={
            <Switch
              value={emailNotificationsEnabled}
              onValueChange={setEmailNotificationsEnabled}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={emailNotificationsEnabled ? colors.primary : "#f4f3f4"}
            />
          }
        />
      </SettingSection>

      <SettingSection title="Account">
        <SettingItem
          icon={<User size={22} color={colors.primary} />}
          title="Account Information"
          description="Manage your personal information"
          onPress={() => {/* Navigate to account info */ }}
        />
        <SettingItem
          icon={<Lock size={22} color={colors.primary} />}
          title="Security"
          description="Change password and security settings"
          onPress={() => {/* Navigate to security settings */ }}
        />
        <SettingItem
          icon={<CreditCard size={22} color={colors.primary} />}
          title="Payment Settings"
          description="Manage payment gateways and methods"
          onPress={() => {/* Navigate to payment settings */ }}
        />
      </SettingSection>

      <SettingSection title="Support">
        <SettingItem
          icon={<HelpCircle size={22} color={colors.primary} />}
          title="Help Center"
          description="Get help with using the admin system"
          onPress={() => {/* Navigate to help center */ }}
        />
        <SettingItem
          icon={<Info size={22} color={colors.primary} />}
          title="About"
          description="Version 1.0.0"
          onPress={() => {/* Show about info */ }}
        />
      </SettingSection>

      <TouchableOpacity style={styles.logoutButton} onPress={() => {/* Handle logout */ }}>
        <LogOut size={20} color={colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
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
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  profileSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.danger,
    marginLeft: 8,
  },
});