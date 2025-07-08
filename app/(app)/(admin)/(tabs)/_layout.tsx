import React from "react";
import { Tabs } from "expo-router";
import { Platform, StyleSheet, TouchableOpacity, View, Alert, Dimensions } from "react-native";
import { colors } from "@/constants/adminColors";
import { useAuthStore } from "@/store/authStore";
import { useRoleAccess } from "@/hooks";
import { router } from "expo-router";
import {
  Home,
  CreditCard,
  Calendar,
  Ship,
  MapPin,
  Users,
  User,
  LogOut,
  Shield
} from "lucide-react-native";

const { width: screenWidth } = Dimensions.get('window');

export default function TabLayout() {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  const iconSize = isSmallScreen ? 18 : isTablet ? 22 : 20;
  const { user, signOut } = useAuthStore();
  const {
    canManagePermissions,
    canAccessDashboard,
    canAccessBookingsTab,
    canAccessScheduleTab,
    canAccessVesselsTab,
    canAccessRoutesTab,
    canAccessUsersTab
  } = useRoleAccess();

  const handleProfilePress = () => {
    router.push("../modal");
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
            } catch (error) {
              console.error("Logout error:", error);
            }
          },
        },
      ]
    );
  };

  const renderHeaderRight = () => (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleProfilePress}
        accessibilityRole="button"
        accessibilityLabel="Profile"
      >
        <User size={20} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Logout"
      >
        <LogOut size={20} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
        headerRight: renderHeaderRight,
        tabBarHideOnKeyboard: true,
      }}
    >
      {canAccessDashboard() && (
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <Home size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
      {canAccessBookingsTab() && (
        <Tabs.Screen
          name="bookings"
          options={{
            title: "Bookings",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <CreditCard size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
      {canAccessScheduleTab() && (
        <Tabs.Screen
          name="schedule"
          options={{
            title: "Schedule",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <Calendar size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
      {canAccessVesselsTab() && (
        <Tabs.Screen
          name="vessels"
          options={{
            title: "Vessels",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <Ship size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
      {canAccessRoutesTab() && (
        <Tabs.Screen
          name="routes"
          options={{
            title: "Routes",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <MapPin size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
      {canAccessUsersTab() && (
        <Tabs.Screen
          name="users"
          options={{
            title: isSmallScreen ? "Users" : "Management",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <Users size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
      {canManagePermissions() && (
        <Tabs.Screen
          name="permissions"
          options={{
            title: "Permissions",
            tabBarIcon: ({ color, focused }) => (
              <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
                <Shield size={iconSize} color={color} />
              </View>
            ),
          }}
        />
      )}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === "ios" ? 86 : 60,
    paddingBottom: Platform.OS === "ios" ? 26 : 8,
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 10,
    minWidth: 30,
    minHeight: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerFocused: {
    backgroundColor: colors.primary + "15",
  },
  header: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "30",
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTitle: {
    fontWeight: "700",
    color: colors.text,
    fontSize: 18,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border + "20",
  },
});