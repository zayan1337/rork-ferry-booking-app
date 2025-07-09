import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert
} from "react-native";
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
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare,
  Wallet,
  Clock,
  Database,
  Wifi
} from "lucide-react-native";
import { Stack, router } from "expo-router";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAuthStore } from "@/store/authStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import StatCard from "@/components/admin/StatCard";
import SectionHeader from "@/components/admin/SectionHeader";
import AlertItem from "@/components/admin/AlertItem";
import BookingItem from "@/components/admin/BookingItem";
import Button from "@/components/admin/Button";

const { width: screenWidth } = Dimensions.get('window');

export default function DashboardScreen() {
  const {
    alerts,
    bookings,
    trips,
    users,
    vessels,
    routes,
    wallets,
    notifications,
    activityLogs,
    dashboardStats,
    markAlertAsRead,
    markAllAlertsAsRead,
    refreshData
  } = useAdminStore();

  const { user } = useAuthStore();
  const {
    canViewDashboard,
    canViewBookings,
    canViewRoutes,
    canViewTrips,
    canViewVessels,
    canViewUsers,
    canViewWallets,
    canViewNotifications,
    canViewActivityLogs
  } = useAdminPermissions();

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
    if (canViewBookings()) {
      router.push(`../booking/${bookingId}` as any);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new_booking':
        if (canViewBookings()) {
          router.push("../booking/new" as any);
        } else {
          Alert.alert("Access Denied", "You don't have permission to create bookings.");
        }
        break;
      case 'view_bookings':
        if (canViewBookings()) {
          router.push("./bookings" as any);
        }
        break;
      case 'operations':
        router.push("./operations" as any);
        break;
      case 'users':
        if (canViewUsers()) {
          router.push("./users" as any);
        }
        break;
      case 'finance':
        if (canViewWallets()) {
          router.push("./finance" as any);
        }
        break;
      case 'communications':
        if (canViewNotifications()) {
          router.push("./communications" as any);
        }
        break;
      default:
        break;
    }
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

  // Calculate real-time statistics
  const todayBookings = bookings.filter(b =>
    new Date(b.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const activeTripsCount = trips.filter(t =>
    t.is_active && t.travel_date === new Date().toISOString().split('T')[0]
  ).length;

  const totalWalletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.read).length;

  if (!canViewDashboard()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to view the dashboard.
        </Text>
      </View>
    );
  }

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

      {/* Enhanced Welcome Section with Admin Profile */}
      <TouchableOpacity
        style={[
          styles.welcomeCard,
          {
            padding: isTablet ? 24 : 20,
            marginBottom: 24,
          }
        ]}
        onPress={handleProfilePress}
        activeOpacity={0.8}
      >
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeContent}>
            <View style={[
              styles.avatarContainer,
              {
                width: isTablet ? 64 : 56,
                height: isTablet ? 64 : 56,
                borderRadius: isTablet ? 32 : 28,
              }
            ]}>
              <Text style={[
                styles.avatarText,
                { fontSize: isTablet ? 24 : 20 }
              ]}>
                {getInitials(adminName)}
              </Text>
              <View style={[
                styles.statusIndicator,
                {
                  width: isTablet ? 14 : 12,
                  height: isTablet ? 14 : 12,
                  borderRadius: isTablet ? 7 : 6,
                }
              ]} />
            </View>
            <View style={styles.welcomeInfo}>
              <Text style={[
                styles.welcomeText,
                { fontSize: isTablet ? 16 : 14 }
              ]}>
                Welcome back,
              </Text>
              <Text style={[
                styles.adminName,
                { fontSize: isTablet ? 24 : 20 }
              ]} numberOfLines={1}>
                {adminName}
              </Text>
              <View style={styles.roleBadge}>
                <Shield size={isTablet ? 14 : 12} color="white" />
                <Text style={[
                  styles.roleText,
                  { fontSize: isTablet ? 12 : 10 }
                ]}>
                  {adminRole.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.notificationBadge}>
              <Bell size={isTablet ? 24 : 20} color={colors.primary} />
              {unreadNotifications > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.activityIndicator}>
              <Activity size={isTablet ? 24 : 20} color={colors.success} />
            </View>
          </View>
        </View>

        {/* Quick stats in welcome card */}
        <View style={styles.welcomeStats}>
          <View style={styles.welcomeStatItem}>
            <Text style={styles.welcomeStatValue}>{todayBookings}</Text>
            <Text style={styles.welcomeStatLabel}>Today's Bookings</Text>
          </View>
          <View style={styles.welcomeStatDivider} />
          <View style={styles.welcomeStatItem}>
            <Text style={styles.welcomeStatValue}>{activeTripsCount}</Text>
            <Text style={styles.welcomeStatLabel}>Active Trips</Text>
          </View>
          <View style={styles.welcomeStatDivider} />
          <View style={styles.welcomeStatItem}>
            <Text style={styles.welcomeStatValue}>
              {alerts.filter(a => !a.read).length}
            </Text>
            <Text style={styles.welcomeStatLabel}>Alerts</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Critical Alerts Banner */}
      {criticalAlerts > 0 && (
        <TouchableOpacity
          style={styles.criticalAlertBanner}
          onPress={() => router.push("./settings" as any)}
        >
          <AlertTriangle size={20} color={colors.danger} />
          <Text style={styles.criticalAlertText}>
            {criticalAlerts} critical alert{criticalAlerts > 1 ? 's' : ''} require attention
          </Text>
          <Eye size={16} color={colors.danger} />
        </TouchableOpacity>
      )}

      {/* Enhanced Stats Grid */}
      <View style={styles.statsContainer}>
        <View style={styles.statsGrid}>
          {canViewBookings() && (
            <StatCard
              title="Today's Bookings"
              value={todayBookings.toString()}
              subtitle={`MVR ${dashboardStats.dailyBookings?.revenue?.toFixed(2) || '0.00'} Revenue`}
              icon={<CreditCard size={isTablet ? 20 : 18} color={colors.primary} />}
              size={isTablet ? "large" : "medium"}
              trend={dashboardStats.dailyBookings?.change_percentage > 0 ? "up" : "down"}
              trendValue={`${Math.abs(dashboardStats.dailyBookings?.change_percentage || 0)}%`}
            />
          )}

          {canViewTrips() && (
            <StatCard
              title="Active Trips"
              value={activeTripsCount.toString()}
              subtitle={`${dashboardStats.activeTrips?.in_progress || 0} in progress`}
              icon={<Ship size={isTablet ? 20 : 18} color={colors.secondary} />}
              color={colors.secondary}
              size={isTablet ? "large" : "medium"}
            />
          )}

          {canViewUsers() && (
            <StatCard
              title="Active Users"
              value={dashboardStats.activeUsers?.total?.toString() || users.length.toString()}
              subtitle={`${dashboardStats.activeUsers?.online_now || 0} online now`}
              icon={<Users size={isTablet ? 20 : 18} color="#34C759" />}
              color="#34C759"
              size={isTablet ? "large" : "medium"}
            />
          )}

          {canViewWallets() && (
            <StatCard
              title="Wallet Balance"
              value={`MVR ${totalWalletBalance.toFixed(2)}`}
              subtitle={`${dashboardStats.walletStats?.active_wallets || wallets.length} wallets`}
              icon={<Wallet size={isTablet ? 20 : 18} color="#FF9500" />}
              color="#FF9500"
              size={isTablet ? "large" : "medium"}
            />
          )}
        </View>
      </View>

      {/* System Health Dashboard */}
      <View style={styles.systemHealthContainer}>
        <SectionHeader
          title="System Health"
          subtitle="Real-time system status"
        />
        <View style={styles.healthGrid}>
          <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: colors.success + "20" }]}>
              <Database size={16} color={colors.success} />
            </View>
            <Text style={styles.healthLabel}>Database</Text>
            <Text style={[styles.healthStatus, { color: colors.success }]}>
              {dashboardStats.systemHealth?.status === "healthy" ? "Healthy" : "Warning"}
            </Text>
          </View>

          <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: colors.primary + "20" }]}>
              <Wifi size={16} color={colors.primary} />
            </View>
            <Text style={styles.healthLabel}>API</Text>
            <Text style={[styles.healthStatus, { color: colors.primary }]}>Online</Text>
          </View>

          <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: colors.warning + "20" }]}>
              <Activity size={16} color={colors.warning} />
            </View>
            <Text style={styles.healthLabel}>Load</Text>
            <Text style={[styles.healthStatus, { color: colors.warning }]}>Normal</Text>
          </View>

          <View style={styles.healthItem}>
            <View style={[styles.healthIcon, { backgroundColor: colors.secondary + "20" }]}>
              <Clock size={16} color={colors.secondary} />
            </View>
            <Text style={styles.healthLabel}>Backup</Text>
            <Text style={[styles.healthStatus, { color: colors.secondary }]}>
              {dashboardStats.systemHealth?.last_backup ? "Today" : "N/A"}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <SectionHeader
          title="Quick Actions"
          subtitle="Common administrative tasks"
        />
        <View style={styles.quickActionsGrid}>
          {canViewBookings() && (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleQuickAction('new_booking')}
            >
              <CreditCard size={24} color={colors.primary} />
              <Text style={styles.quickActionText}>New Booking</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.quickActionItem}
            onPress={() => handleQuickAction('operations')}
          >
            <Ship size={24} color={colors.secondary} />
            <Text style={styles.quickActionText}>Operations</Text>
          </TouchableOpacity>

          {canViewUsers() && (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleQuickAction('users')}
            >
              <Users size={24} color="#34C759" />
              <Text style={styles.quickActionText}>User Management</Text>
            </TouchableOpacity>
          )}

          {canViewWallets() && (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleQuickAction('finance')}
            >
              <DollarSign size={24} color="#FF9500" />
              <Text style={styles.quickActionText}>Finance</Text>
            </TouchableOpacity>
          )}

          {canViewNotifications() && (
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => handleQuickAction('communications')}
            >
              <MessageSquare size={24} color="#FF3B30" />
              <Text style={styles.quickActionText}>Communications</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <SectionHeader
                title="System Alerts"
                subtitle={`${alerts.filter(a => !a.read).length} unread alerts`}
              />
            </View>
            {alerts.filter(a => !a.read).length > 0 && (
              <View style={styles.sectionHeaderButton}>
                <Button
                  title="Mark All Read"
                  onPress={markAllAlertsAsRead}
                  size="small"
                  variant="outline"
                />
              </View>
            )}
          </View>

          <View style={styles.alertsList}>
            {alerts.slice(0, 3).map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onPress={() => handleAlertPress(alert.id)}
              />
            ))}
          </View>

          {alerts.length > 3 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push("./settings" as any)}
            >
              <Text style={styles.viewAllText}>View All Alerts</Text>
              <Eye size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent Bookings */}
      {canViewBookings() && bookings.length > 0 && (
        <View style={styles.recentBookingsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <SectionHeader
                title="Recent Bookings"
                subtitle="Latest booking activity"
              />
            </View>
            <View style={styles.sectionHeaderButton}>
              <TouchableOpacity
                style={styles.viewAllLink}
                onPress={() => handleQuickAction('view_bookings')}
              >
                <Text style={styles.viewAllLinkText}>View All</Text>
                <Eye size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.bookingsList}>
            {bookings.slice(0, 5).map((booking) => (
              <BookingItem
                key={booking.id}
                booking={booking}
                onPress={() => handleBookingPress(booking.id)}
                compact={true}
              />
            ))}
          </View>
        </View>
      )}

      {/* Activity Logs */}
      {canViewActivityLogs() && activityLogs.length > 0 && (
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <SectionHeader
                title="Recent Activity"
                subtitle="System activity logs"
              />
            </View>
          </View>

          <View style={styles.activityList}>
            {activityLogs.slice(0, 5).map((log) => (
              <View key={log.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Activity size={16} color={colors.primary} />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityAction}>{log.action}</Text>
                  <Text style={styles.activityDetails}>{log.details}</Text>
                  <Text style={styles.activityUser}>by {log.user_name}</Text>
                </View>
                <Text style={styles.activityTime}>
                  {new Date(log.created_at).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    flexGrow: 1,
  },

  // Enhanced Welcome Card (keeping the improved version)
  welcomeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border + "20",
  },
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  welcomeContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
    position: "relative",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: "white",
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  welcomeInfo: {
    flex: 1,
  },
  welcomeText: {
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: "500",
  },
  adminName: {
    color: colors.text,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  roleText: {
    color: "white",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  notificationBadge: {
    position: "relative",
    padding: 12,
    backgroundColor: colors.primary + "10",
    borderRadius: 12,
  },
  badgeCount: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  activityIndicator: {
    padding: 12,
    backgroundColor: colors.success + "15",
    borderRadius: 12,
  },
  welcomeStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border + "20",
  },
  welcomeStatItem: {
    alignItems: "center",
    flex: 1,
  },
  welcomeStatValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
    marginBottom: 4,
  },
  welcomeStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
    textAlign: "center",
  },
  welcomeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border + "30",
  },

  // Original styles for other sections with better alignment
  criticalAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.danger + "10",
    borderWidth: 1,
    borderColor: colors.danger + "30",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  criticalAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: colors.danger,
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
  systemHealthContainer: {
    marginBottom: 24,
  },
  healthGrid: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: "space-between",
  },
  healthItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  healthIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  healthLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  healthStatus: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
    justifyContent: "space-between",
  },
  quickActionItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minWidth: "30%",
    flex: 1,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
    textAlign: "center",
  },
  alertsSection: {
    marginBottom: 24,
  },
  alertsList: {
    gap: 12,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  recentBookingsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    minHeight: 44,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: "40%",
  },
  viewAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary + "08",
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  viewAllLinkText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  bookingsList: {
    gap: 12,
  },
  activitySection: {
    marginBottom: 24,
  },
  activityList: {
    gap: 12,
    marginTop: 16,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: 2,
  },
  activityDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  activityUser: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  activityTime: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "right",
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 250,
  },
});