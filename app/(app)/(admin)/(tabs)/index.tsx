import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { colors } from "@/constants/adminColors";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CreditCard,
  DollarSign,
  Ship,
  Users,
  User,
  Shield,
  Activity,
  TrendingUp
} from "lucide-react-native";
import { Stack, router } from "expo-router";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAuthStore } from "@/store/authStore";
import StatCard from "@/components/admin/StatCard";
import SectionHeader from "@/components/admin/SectionHeader";
import AlertItem from "@/components/admin/AlertItem";
import BookingItem from "@/components/admin/BookingItem";
import TripItem from "@/components/admin/TripItem";
import Button from "@/components/admin/Button";

export default function DashboardScreen() {
  const {
    alerts,
    bookings,
    trips,
    dashboardStats,
    markAlertAsRead,
    markAllAlertsAsRead,
    refreshData
  } = useAdminStore();
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  };

  const handleAlertPress = (id: string) => {
    markAlertAsRead(id);
  };

  const handleBookingPress = (bookingId: string) => {
    router.push(`../booking/${bookingId}` as any);
  };

  const handleTripPress = (tripId: string) => {
    router.push(`../schedule/${tripId}` as any);
  };

  const handleSeeAllBookings = () => {
    router.push("./bookings" as any);
  };

  const handleSeeAllSchedule = () => {
    router.push("./schedule" as any);
  };

  const handleAddBooking = () => {
    router.push("../booking/new" as any);
  };

  const handleManageSchedule = () => {
    router.push("./schedule" as any);
  };

  const handleEmergencyAnnouncement = () => {
    // TODO: Implement emergency announcement modal
    console.log("Emergency announcement modal");
  };

  const handleProfilePress = () => {
    router.push("../modal");
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
  const adminName = adminProfile?.full_name || user?.email?.split("@")[0] || "Admin";
  const adminRole = adminProfile?.role || "admin";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Dashboard",
        }}
      />

      {/* Welcome Section with Admin Profile */}
      <TouchableOpacity
        style={styles.welcomeCard}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <View style={styles.welcomeContent}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(adminName)}</Text>
            <View style={styles.statusIndicator} />
          </View>
          <View style={styles.welcomeInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.adminName}>{adminName}</Text>
            <View style={styles.roleBadge}>
              <Shield size={12} color="white" />
              <Text style={styles.roleText}>{adminRole.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <View style={styles.activityIndicator}>
          <Activity size={20} color={colors.success} />
        </View>
      </TouchableOpacity>

      {/* Stats Row */}
      <View style={styles.statsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          <StatCard
            title="Daily Bookings"
            value={dashboardStats.dailyBookings.count.toString()}
            subtitle={`$${dashboardStats.dailyBookings.revenue} Revenue`}
            icon={<CreditCard size={18} color={colors.primary} />}
          />
          <StatCard
            title="Active Trips"
            value={dashboardStats.activeTrips.toString()}
            icon={<Ship size={18} color={colors.secondary} />}
            color={colors.secondary}
          />
          <StatCard
            title="Active Users"
            value={dashboardStats.activeUsers.toString()}
            icon={<Users size={18} color="#34C759" />}
            color="#34C759"
          />
          <StatCard
            title="Payments"
            value={dashboardStats.paymentStatus.completed.toString()}
            subtitle={`${dashboardStats.paymentStatus.pending} Pending`}
            icon={<DollarSign size={18} color="#FF9500" />}
            color="#FF9500"
          />
        </ScrollView>
      </View>

      {/* System Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>System Status</Text>
          <View style={styles.statusIndicatorGreen}>
            <Text style={styles.statusText}>All Systems Operational</Text>
          </View>
        </View>
        <View style={styles.statusMetrics}>
          <View style={styles.metric}>
            <TrendingUp size={16} color={colors.success} />
            <Text style={styles.metricText}>Uptime: 99.9%</Text>
          </View>
          <View style={styles.metric}>
            <Activity size={16} color={colors.primary} />
            <Text style={styles.metricText}>Performance: Excellent</Text>
          </View>
        </View>
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
          onSeeAll={handleSeeAllBookings}
        />

        {bookings.slice(0, 3).map((booking) => (
          <BookingItem
            key={booking.id}
            booking={booking}
            onPress={() => handleBookingPress(booking.id)}
          />
        ))}
      </View>

      {/* Upcoming Trips Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Upcoming Trips"
          onSeeAll={handleSeeAllSchedule}
        />

        {trips.slice(0, 3).map((trip) => (
          <TripItem
            key={trip.id}
            trip={trip}
            onPress={() => handleTripPress(trip.id)}
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
            icon={<Bell size={18} color="white" />}
            onPress={handleEmergencyAnnouncement}
          />
          <Button
            title="New Booking"
            variant="primary"
            icon={<CreditCard size={18} color="white" />}
            onPress={handleAddBooking}
          />
          <Button
            title="Manage Schedule"
            variant="secondary"
            icon={<Calendar size={18} color="white" />}
            onPress={handleManageSchedule}
          />
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
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.card,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  adminName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: "flex-start",
    gap: 4,
  },
  roleText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  activityIndicator: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.success + "10",
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  statusIndicatorGreen: {
    backgroundColor: colors.success + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  statusMetrics: {
    flexDirection: "row",
    gap: 16,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsScrollContent: {
    paddingRight: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyStateContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  actionsContainer: {
    gap: 12,
  },
});