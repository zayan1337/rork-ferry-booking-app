import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Bell, Shield, Activity } from 'lucide-react-native';
import { getInitials } from '@/utils/dashboardUtils';

interface DashboardWelcomeProps {
  adminName: string;
  adminRole: string;
  unreadNotifications: number;
  todayBookings: number;
  activeTripsCount: number;
  alertsCount: number;
  onPress?: () => void;
  isTablet?: boolean;
}

export default function WelcomeCard({
  adminName,
  adminRole,
  unreadNotifications,
  todayBookings,
  activeTripsCount,
  alertsCount,
  onPress,
  isTablet,
}: DashboardWelcomeProps) {
  return (
    <TouchableOpacity
      style={[
        styles.welcomeCard,
        {
          padding: isTablet ? 24 : 20,
          marginBottom: 24,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.welcomeHeader}>
        <View style={styles.welcomeContent}>
          <View
            style={[
              styles.avatarContainer,
              {
                width: isTablet ? 64 : 56,
                height: isTablet ? 64 : 56,
                borderRadius: isTablet ? 32 : 28,
              },
            ]}
          >
            <Text style={[styles.avatarText, { fontSize: isTablet ? 24 : 20 }]}>
              {getInitials(adminName)}
            </Text>
            <View
              style={[
                styles.statusIndicator,
                {
                  width: isTablet ? 14 : 12,
                  height: isTablet ? 14 : 12,
                  borderRadius: isTablet ? 7 : 6,
                },
              ]}
            />
          </View>
          <View style={styles.welcomeInfo}>
            <Text
              style={[styles.welcomeText, { fontSize: isTablet ? 16 : 14 }]}
            >
              Welcome back,
            </Text>
            <Text
              style={[styles.adminName, { fontSize: isTablet ? 24 : 20 }]}
              numberOfLines={1}
            >
              {adminName}
            </Text>
            <View style={styles.roleBadge}>
              <Shield size={isTablet ? 14 : 12} color='white' />
              <Text style={[styles.roleText, { fontSize: isTablet ? 12 : 10 }]}>
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
          <Text style={styles.welcomeStatValue}>{alertsCount}</Text>
          <Text style={styles.welcomeStatLabel}>Alerts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  welcomeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border + '20',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    position: 'relative',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    color: 'white',
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusIndicator: {
    position: 'absolute',
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
    fontWeight: '500',
  },
  adminName: {
    color: colors.text,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  roleText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'relative',
    padding: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
  },
  badgeCount: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  activityIndicator: {
    padding: 12,
    backgroundColor: colors.success + '15',
    borderRadius: 12,
  },
  welcomeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border + '20',
  },
  welcomeStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  welcomeStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  welcomeStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  welcomeStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border + '30',
  },
});
