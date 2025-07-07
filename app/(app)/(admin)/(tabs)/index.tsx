import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/adminColors";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CreditCard,
  DollarSign,
  Ship,
  Users
} from "lucide-react-native";
import { Stack } from "expo-router";
import { useAdminStore } from "@/store/admin/adminStore";
import { mockBookings, mockDashboardStats, mockTrips } from "@/mocks/adminData";
import StatCard from "@/components/admin/StatCard";
import SectionHeader from "@/components/admin/SectionHeader";
import AlertItem from "@/components/admin/AlertItem";
import BookingItem from "@/components/admin/BookingItem";
import TripItem from "@/components/admin/TripItem";
import Button from "@/components/admin/Button";

export default function DashboardScreen() {
  const { alerts, markAlertAsRead, markAllAlertsAsRead } = useAdminStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleAlertPress = (id: string) => {
    markAlertAsRead(id);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Dashboard",
          headerRight: () => (
            <View style={styles.headerRight}>
              <Bell size={24} color={colors.text} />
              {alerts.some(alert => !alert.read) && (
                <View style={styles.notificationBadge} />
              )}
            </View>
          ),
        }}
      />

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          <StatCard
            title="Daily Bookings"
            value={mockDashboardStats.dailyBookings.count.toString()}
            subtitle={`$${mockDashboardStats.dailyBookings.revenue} Revenue`}
            icon={<CreditCard size={18} color={colors.primary} />}
          />
          <StatCard
            title="Active Trips"
            value={mockDashboardStats.activeTrips.toString()}
            icon={<Ship size={18} color={colors.secondary} />}
            color={colors.secondary}
          />
          <StatCard
            title="Active Users"
            value={mockDashboardStats.activeUsers.toString()}
            icon={<Users size={18} color="#34C759" />}
            color="#34C759"
          />
          <StatCard
            title="Payments"
            value={mockDashboardStats.paymentStatus.completed.toString()}
            subtitle={`${mockDashboardStats.paymentStatus.pending} Pending`}
            icon={<DollarSign size={18} color="#FF9500" />}
            color="#FF9500"
          />
        </ScrollView>
      </View>

      {/* Alerts Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderContainer}>
          <SectionHeader title="Alerts & Notifications" />
          {alerts.some(alert => !alert.read) && (
            <Button
              title="Mark All as Read"
              variant="outline"
              size="small"
              onPress={markAllAlertsAsRead}
            />
          )}
        </View>

        {alerts.length > 0 ? (
          <FlatList
            data={alerts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AlertItem
                alert={item}
                onPress={() => handleAlertPress(item.id)}
              />
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <AlertTriangle size={40} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No alerts at the moment</Text>
          </View>
        )}
      </View>

      {/* Recent Bookings Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Bookings"
          onSeeAll={() => {/* Navigate to bookings */ }}
        />

        {mockBookings.slice(0, 3).map((booking) => (
          <BookingItem
            key={booking.id}
            booking={booking}
            onPress={() => {/* Navigate to booking details */ }}
          />
        ))}
      </View>

      {/* Upcoming Trips Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Upcoming Trips"
          onSeeAll={() => {/* Navigate to schedule */ }}
        />

        {mockTrips.slice(0, 3).map((trip) => (
          <TripItem
            key={trip.id}
            trip={trip}
            onPress={() => {/* Navigate to trip details */ }}
          />
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionsContainer}>
          <Button
            title="Emergency Announcement"
            variant="danger"
            icon={<AlertTriangle size={18} color="#FFFFFF" />}
            onPress={() => {/* Show announcement modal */ }}
            fullWidth
          />
          <View style={styles.actionRow}>
            <Button
              title="Add Booking"
              variant="primary"
              icon={<CreditCard size={18} color="#FFFFFF" />}
              onPress={() => {/* Navigate to add booking */ }}
              fullWidth
            />
            <View style={styles.actionSpacer} />
            <Button
              title="Manage Schedule"
              variant="secondary"
              icon={<Calendar size={18} color="#FFFFFF" />}
              onPress={() => {/* Navigate to schedule management */ }}
              fullWidth
            />
          </View>
        </View>
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
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  headerRight: {
    marginRight: 16,
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  actionsContainer: {
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
  },
  actionSpacer: {
    width: 12,
  },
});