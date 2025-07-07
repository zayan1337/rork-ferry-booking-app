import React from "react";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import { colors } from "@/constants/adminColors";
import {
  Home,
  CreditCard,
  Calendar,
  Ship,
  MapPin,
  Users
} from "lucide-react-native";

export default function TabLayout() {
  const iconSize = 20;

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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Home size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => <CreditCard size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color }) => <Calendar size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vessels"
        options={{
          title: "Vessels",
          tabBarIcon: ({ color }) => <Ship size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: "Routes",
          tabBarIcon: ({ color }) => <MapPin size={iconSize} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => <Users size={iconSize} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === "ios" ? 86 : 58,
    paddingBottom: Platform.OS === "ios" ? 26 : 6,
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  header: {
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 18,
  },
});