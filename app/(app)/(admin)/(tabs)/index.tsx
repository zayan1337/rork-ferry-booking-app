import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { AlertTriangle, Eye, Activity } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  getResponsiveDimensions,
  getResponsivePadding,
} from '@/utils/dashboardUtils';

// Dashboard Components
import WelcomeCard from '@/components/admin/dashboard/WelcomeCard';
import DashboardStats from '@/components/admin/dashboard/DashboardStats';
import SystemHealthDashboard from '@/components/admin/dashboard/SystemHealthDashboard';
import QuickActions from '@/components/admin/dashboard/QuickActions';

// Existing Components
import SectionHeader from '@/components/admin/SectionHeader';
import AlertItem from '@/components/admin/AlertItem';
import BookingItem from '@/components/admin/BookingItem';
import Button from '@/components/admin/Button';

export default function DashboardScreen() {
  const { dashboardStats, markAlertAsRead, markAllAlertsAsRead, refreshData } =
    useAdminStore();

  const {
    canViewDashboard,
    canViewBookings,
    canViewRoutes,
    canViewTrips,
    canViewVessels,
    canViewUsers,
    canViewWallets,
    canViewNotifications,
    canViewActivityLogs,
  } = useAdminPermissions();

  const {
    stats,
    adminName,
    adminRole,
    criticalAlerts,
    alerts,
    bookings,
    trips,
    activityLogs,
  } = useDashboardData();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isTablet, isSmallScreen } = getResponsiveDimensions();

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
          router.push('../booking/new' as any);
        } else {
          Alert.alert(
            'Access Denied',
            "You don't have permission to create bookings."
          );
        }
        break;
      case 'view_bookings':
        if (canViewBookings()) {
          router.push('./bookings' as any);
        }
        break;
      case 'operations':
        router.push('./operations' as any);
        break;
      case 'users':
        if (canViewUsers()) {
          router.push('./users' as any);
        }
        break;
      case 'finance':
        if (canViewWallets()) {
          router.push('./finance' as any);
        }
        break;
      case 'communications':
        if (canViewNotifications()) {
          router.push('./communications' as any);
        }
        break;
      default:
        break;
    }
  };

  const handleProfilePress = () => {
    router.push('../modal');
  };

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
          title: 'Dashboard',
        }}
      />

      {/* Enhanced Welcome Section with Admin Profile */}
      <WelcomeCard
        adminName={adminName}
        adminRole={adminRole}
        unreadNotifications={stats.unreadNotifications}
        todayBookings={stats.todayBookings}
        activeTripsCount={stats.activeTripsCount}
        alertsCount={alerts.filter(a => !a.read).length}
        onPress={handleProfilePress}
        isTablet={isTablet}
      />

      {/* Critical Alerts Banner */}
      {criticalAlerts > 0 && (
        <TouchableOpacity
          style={styles.criticalAlertBanner}
          onPress={() => router.push('./settings' as any)}
        >
          <AlertTriangle size={20} color={colors.danger} />
          <Text style={styles.criticalAlertText}>
            {criticalAlerts} critical alert{criticalAlerts > 1 ? 's' : ''}{' '}
            require attention
          </Text>
          <Eye size={16} color={colors.danger} />
        </TouchableOpacity>
      )}

      {/* Enhanced Stats Grid */}
      <DashboardStats
        stats={stats}
        isTablet={isTablet}
        canViewBookings={canViewBookings()}
        canViewTrips={canViewTrips()}
        canViewUsers={canViewUsers()}
        canViewWallets={canViewWallets()}
      />

      {/* System Health Dashboard */}
      <SystemHealthDashboard dashboardStats={dashboardStats} />

      {/* Quick Actions */}
      <QuickActions
        onActionPress={handleQuickAction}
        canViewBookings={canViewBookings()}
        canViewUsers={canViewUsers()}
        canViewWallets={canViewWallets()}
        canViewNotifications={canViewNotifications()}
      />

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderContent}>
              <SectionHeader
                title='System Alerts'
                subtitle={`${alerts.filter(a => !a.read).length} unread alerts`}
              />
            </View>
            {alerts.filter(a => !a.read).length > 0 && (
              <View style={styles.sectionHeaderButton}>
                <Button
                  title='Mark All Read'
                  onPress={markAllAlertsAsRead}
                  size='small'
                  variant='outline'
                />
              </View>
            )}
          </View>

          <View style={styles.alertsList}>
            {alerts.slice(0, 3).map(alert => (
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
              onPress={() => router.push('./settings' as any)}
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
                title='Recent Bookings'
                subtitle='Latest booking activity'
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
            {bookings.slice(0, 5).map(booking => (
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
                title='Recent Activity'
                subtitle='System activity logs'
              />
            </View>
          </View>

          <View style={styles.activityList}>
            {activityLogs.slice(0, 5).map(log => (
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

  // Original styles for other sections with better alignment
  criticalAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger + '10',
    borderWidth: 1,
    borderColor: colors.danger + '30',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  criticalAlertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.danger,
  },
  alertsSection: {
    marginBottom: 24,
  },
  alertsList: {
    gap: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  recentBookingsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.primary + '08',
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  viewAllLinkText: {
    fontSize: 14,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 14,
    fontWeight: '500',
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
    textAlign: 'right',
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
});
