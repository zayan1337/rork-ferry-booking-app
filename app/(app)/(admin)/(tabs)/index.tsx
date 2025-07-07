import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, View, TouchableOpacity, Dimensions, RefreshControl } from "react-native";
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

const { width: screenWidth } = Dimensions.get('window');

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

  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

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

  const getResponsivePadding = () => ({
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Stack.Screen
        options={{
          title: "Dashboard",
        }}
      />

      {/* Welcome Section with Admin Profile */}
      <TouchableOpacity
        style={[styles.welcomeCard, { padding: isTablet ? 24 : 20 }]}
        onPress={handleProfilePress}
        activeOpacity={0.7}
      >
        <View style={styles.welcomeContent}>
          <View style={[styles.avatarContainer, {
            width: isTablet ? 60 : 50,
            height: isTablet ? 60 : 50,
            borderRadius: isTablet ? 30 : 25
          }]}>
            <Text style={[styles.avatarText, { fontSize: isTablet ? 22 : 18 }]}>
              {getInitials(adminName)}
            </Text>
            <View style={styles.statusIndicator} />
          </View>
          <View style={styles.welcomeInfo}>
            <Text style={[styles.welcomeText, { fontSize: isTablet ? 16 : 14 }]}>
              Welcome back,
            </Text>
            <Text style={[styles.adminName, { fontSize: isTablet ? 22 : 18 }]} numberOfLines={1}>
              {adminName}
            </Text>
            <View style={styles.roleBadge}>
              <Shield size={isTablet ? 14 : 12} color="white" />
              <Text style={[styles.roleText, { fontSize: isTablet ? 12 : 10 }]}>
                {adminRole.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.activityIndicator}>
          <Activity size={isTablet ? 24 : 20} color={colors.success} />
        </View>
      </TouchableOpacity>

      {/* Stats Grid - Responsive Layout */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          <StatCard
            title="Daily Bookings"
            value={dashboardStats.dailyBookings.count.toString()}
            subtitle={`$${dashboardStats.dailyBookings.revenue} Revenue`}
            icon={<CreditCard size={isTablet ? 20 : 18} color={colors.primary} />}
            size={isTablet ? "large" : "medium"}
          />
          <StatCard
            title="Active Trips"
            value={dashboardStats.activeTrips.toString()}
            icon={<Ship size={isTablet ? 20 : 18} color={colors.secondary} />}
            color={colors.secondary}
            size={isTablet ? "large" : "medium"}
          />
          <StatCard
            title="Active Users"
            value={dashboardStats.activeUsers.toString()}
            icon={<Users size={isTablet ? 20 : 18} color="#34C759" />}
            color="#34C759"
            size={isTablet ? "large" : "medium"}
          />
          <StatCard
            title="Payments"
            value={dashboardStats.paymentStatus.completed.toString()}
            subtitle={`${dashboardStats.paymentStatus.pending} Pending`}
            icon={<DollarSign size={isTablet ? 20 : 18} color="#FF9500" />}
            color="#FF9500"
            size={isTablet ? "large" : "medium"}
          />
        </View>
      </View>

      {/* System Status */}
      <View style={[styles.statusCard, { padding: isTablet ? 20 : 16 }]}>
        <View style={styles.statusHeader}>
          <Text style={[styles.statusTitle, { fontSize: isTablet ? 18 : 16 }]}>
            System Status
          </Text>
          <View style={styles.statusIndicatorGreen}>
            <Text style={[styles.statusText, { fontSize: isTablet ? 14 : 12 }]}>
              All Systems Operational
            </Text>
          </View>
        </View>
        <View style={styles.statusMetrics}>
          <View style={styles.metric}>
            <TrendingUp size={isTablet ? 18 : 16} color={colors.success} />
            <Text style={[styles.metricText, { fontSize: isTablet ? 16 : 14 }]}>
              Uptime: 99.9%
            </Text>
          </View>
          <View style={styles.metric}>
            <Activity size={isTablet ? 18 : 16} color={colors.primary} />
            <Text style={[styles.metricText, { fontSize: isTablet ? 16 : 14 }]}>
              Performance: Excellent
            </Text>
          </View>
        </View>
      </View>

      {/* Alerts Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Alerts & Notifications"
          size={isTablet ? "large" : "medium"}
          action={
            alerts.some(alert => !alert.read) ? (
              <Button
                title="Mark All as Read"
                variant="outline"
                size={isTablet ? "medium" : "small"}
                onPress={markAllAlertsAsRead}
              />
            ) : undefined
          }
        />

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
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={[styles.emptyStateContainer, { padding: isTablet ? 40 : 32 }]}>
            <AlertTriangle size={isTablet ? 48 : 40} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { fontSize: isTablet ? 18 : 16 }]}>
              No alerts at the moment
            </Text>
          </View>
        )}
      </View>

      {/* Recent Bookings Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent Bookings"
          subtitle={`${bookings.length} total bookings`}
          onSeeAll={handleSeeAllBookings}
          size={isTablet ? "large" : "medium"}
        />

        {bookings.slice(0, 3).map((booking) => (
          <BookingItem
            key={booking.id}
            booking={booking}
            onPress={() => handleBookingPress(booking.id)}
            compact={!isTablet}
          />
        ))}
      </View>

      {/* Upcoming Trips Section */}
      <View style={styles.section}>
        <SectionHeader
          title="Upcoming Trips"
          subtitle={`${trips.length} scheduled trips`}
          onSeeAll={handleSeeAllSchedule}
          size={isTablet ? "large" : "medium"}
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
        <SectionHeader
          title="Quick Actions"
          size={isTablet ? "large" : "medium"}
        />
        <View style={[styles.actionsContainer, { gap: isTablet ? 16 : 12 }]}>
          <Button
            title="Emergency Announcement"
            variant="danger"
            size={isTablet ? "large" : "medium"}
            icon={<Bell size={isTablet ? 20 : 18} color="white" />}
            onPress={handleEmergencyAnnouncement}
            fullWidth={isSmallScreen}
          />
          <Button
            title="New Booking"
            variant="primary"
            size={isTablet ? "large" : "medium"}
            icon={<CreditCard size={isTablet ? 20 : 18} color="white" />}
            onPress={handleAddBooking}
            fullWidth={isSmallScreen}
          />
          <Button
            title="Manage Schedule"
            variant="secondary"
            size={isTablet ? "large" : "medium"}
            icon={<Calendar size={isTablet ? 20 : 18} color="white" />}
            onPress={handleManageSchedule}
            fullWidth={isSmallScreen}
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
    paddingBottom: 32,
  },
  welcomeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + "20",
  },
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    position: "relative",
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: {
    fontWeight: "bold",
    color: "white",
  },
  statusIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.card,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeText: {
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: "500",
  },
  adminName: {
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
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
    fontWeight: "700",
  },
  activityIndicator: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: colors.success + "15",
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border + "20",
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusTitle: {
    fontWeight: "700",
    color: colors.text,
  },
  statusIndicatorGreen: {
    backgroundColor: colors.success + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: colors.success,
    fontWeight: "600",
  },
  statusMetrics: {
    flexDirection: "row",
    gap: 20,
  },
  metric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricText: {
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  section: {
    marginBottom: 28,
  },
  emptyStateContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border + "20",
  },
  emptyStateText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  actionsContainer: {
    flexDirection: "column",
  },
});