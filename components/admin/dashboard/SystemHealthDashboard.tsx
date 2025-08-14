import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Database, Wifi, Activity, Clock } from 'lucide-react-native';
import SectionHeader from '@/components/admin/SectionHeader';
import { DashboardStats } from '@/types/admin';

interface SystemHealthDashboardProps {
  dashboardStats: DashboardStats;
}

export default function SystemHealthDashboard({
  dashboardStats,
}: SystemHealthDashboardProps) {
  return (
    <View style={styles.systemHealthContainer}>
      <SectionHeader title='System Health' subtitle='Real-time system status' />
      <View style={styles.healthGrid}>
        <View style={styles.healthItem}>
          <View
            style={[
              styles.healthIcon,
              { backgroundColor: `${colors.success}20` },
            ]}
          >
            <Database size={16} color={colors.success} />
          </View>
          <Text style={styles.healthLabel}>Database</Text>
          <Text style={[styles.healthStatus, { color: colors.success }]}>
            {dashboardStats.systemHealth?.status === 'healthy'
              ? 'Healthy'
              : 'Warning'}
          </Text>
        </View>

        <View style={styles.healthItem}>
          <View
            style={[
              styles.healthIcon,
              { backgroundColor: `${colors.primary}20` },
            ]}
          >
            <Wifi size={16} color={colors.primary} />
          </View>
          <Text style={styles.healthLabel}>API</Text>
          <Text style={[styles.healthStatus, { color: colors.primary }]}>
            Online
          </Text>
        </View>

        <View style={styles.healthItem}>
          <View
            style={[
              styles.healthIcon,
              { backgroundColor: `${colors.warning}20` },
            ]}
          >
            <Activity size={16} color={colors.warning} />
          </View>
          <Text style={styles.healthLabel}>Load</Text>
          <Text style={[styles.healthStatus, { color: colors.warning }]}>
            Normal
          </Text>
        </View>

        <View style={styles.healthItem}>
          <View
            style={[
              styles.healthIcon,
              { backgroundColor: `${colors.secondary}20` },
            ]}
          >
            <Clock size={16} color={colors.secondary} />
          </View>
          <Text style={styles.healthLabel}>Backup</Text>
          <Text style={[styles.healthStatus, { color: colors.secondary }]}>
            {dashboardStats.systemHealth?.last_backup ? 'Today' : 'N/A'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  systemHealthContainer: {
    marginBottom: 24,
  },
  healthGrid: {
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
    justifyContent: 'space-between',
  },
  healthItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  healthIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  healthStatus: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
