import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Activity, Users, User, Crown, UserCheck } from 'lucide-react-native';
import SectionHeader from '@/components/admin/SectionHeader';
import StatusBadge from '@/components/admin/StatusBadge';

// Common Components
import { StatsSection } from '@/components/admin/common';

interface UserStatsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    activeRate: string;
    adminCount: number;
    agentCount: number;
    customerCount: number;
    passengerCount: number;
    newUsersThisMonth: number;
    suspendedCount: number;
  };
  isTablet?: boolean;
}

export default function UserStats({ stats, isTablet = false }: UserStatsProps) {
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} color={colors.danger} />;
      case 'agent':
        return <UserCheck size={16} color={colors.primary} />;
      case 'customer':
        return <User size={16} color={colors.secondary} />;
      case 'passenger':
        return <Users size={16} color={colors.success} />;
      default:
        return <User size={16} color={colors.textSecondary} />;
    }
  };

  const userStatsData = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toString(),
      subtitle: `${stats.newUsersThisMonth} new this month`,
      icon: <Users size={isTablet ? 20 : 18} color={colors.primary} />,
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toString(),
      subtitle: `${stats.activeRate}% active rate`,
      icon: <Activity size={isTablet ? 20 : 18} color={colors.success} />,
      color: colors.success,
    },
    {
      title: 'Agents',
      value: stats.agentCount.toString(),
      subtitle: `${stats.adminCount} admins`,
      icon: <UserCheck size={isTablet ? 20 : 18} color={colors.secondary} />,
      color: colors.secondary,
    },
    {
      title: 'Passengers',
      value: stats.passengerCount.toString(),
      subtitle: `${stats.customerCount} customers`,
      icon: <User size={isTablet ? 20 : 18} color='#FF9500' />,
      color: '#FF9500',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Enhanced Stats */}
      <StatsSection
        title='User Analytics'
        subtitle='User statistics and trends'
        stats={userStatsData}
        isTablet={isTablet}
        headerSize={isTablet ? 'large' : 'medium'}
      />

      {/* Role Distribution */}
      <View style={styles.roleDistributionContainer}>
        <SectionHeader
          title='Role Distribution'
          subtitle='User roles breakdown'
          size={isTablet ? 'large' : 'medium'}
        />
        <View style={styles.roleGrid}>
          {[
            {
              role: 'admin',
              label: 'Admins',
              count: stats.adminCount,
              color: colors.danger,
            },
            {
              role: 'agent',
              label: 'Agents',
              count: stats.agentCount,
              color: colors.primary,
            },
            {
              role: 'customer',
              label: 'Customers',
              count: stats.customerCount,
              color: colors.secondary,
            },
            {
              role: 'passenger',
              label: 'Passengers',
              count: stats.passengerCount,
              color: colors.success,
            },
          ].map(item => (
            <View key={item.role} style={styles.roleItem}>
              <View
                style={[
                  styles.roleIcon,
                  { backgroundColor: `${item.color}20` },
                ]}
              >
                {getRoleIcon(item.role)}
              </View>
              <Text style={styles.roleCount}>{item.count}</Text>
              <Text style={styles.roleLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Status Overview */}
      <View style={styles.quickStatsContainer}>
        <SectionHeader
          title='Status Overview'
          subtitle='Current user status distribution'
          size={isTablet ? 'large' : 'medium'}
        />
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatItem}>
            <View style={styles.quickStatContent}>
              <Text style={styles.quickStatValue}>0</Text>
              <Text style={styles.quickStatLabel}>Pending Approval</Text>
              <View style={styles.badgeContainer}>
                <StatusBadge status='inactive' size='small' />
              </View>
            </View>
          </View>
          <View style={styles.quickStatItem}>
            <View style={styles.quickStatContent}>
              <Text style={styles.quickStatValue}>{stats.suspendedCount}</Text>
              <Text style={styles.quickStatLabel}>Suspended</Text>
              <View style={styles.badgeContainer}>
                <StatusBadge status='suspended' size='small' />
              </View>
            </View>
          </View>
          <View style={styles.quickStatItem}>
            <View style={styles.quickStatContent}>
              <Text style={styles.quickStatValue}>{stats.activeUsers}</Text>
              <Text style={styles.quickStatLabel}>Active</Text>
              <View style={styles.badgeContainer}>
                <StatusBadge status='active' size='small' />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  roleDistributionContainer: {
    marginBottom: 24,
  },
  roleGrid: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  roleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleCount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  roleLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  quickStatsContainer: {
    marginBottom: 24,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 32,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 4,
  },
  badgeContainer: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
