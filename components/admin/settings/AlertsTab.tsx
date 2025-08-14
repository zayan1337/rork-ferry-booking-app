import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Bell, AlertTriangle, X, Filter, Trash2 } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { Alert as AdminAlert } from '@/types/admin';
import { SettingsStats } from '@/types/settings';
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import StatCard from '@/components/admin/StatCard';
import EmptyState from '@/components/admin/EmptyState';
import AlertItem from '@/components/admin/AlertItem';
import { styles } from './styles';

interface AlertsTabProps {
  filteredData: AdminAlert[];
  stats: SettingsStats;
  onAlertAction: (alert: AdminAlert, action: 'read' | 'delete') => void;
  onMarkAllAlertsAsRead: () => void;
}

export default function AlertsTab({
  filteredData,
  stats,
  onAlertAction,
  onMarkAllAlertsAsRead,
}: AlertsTabProps) {
  return (
    <View style={styles.tabContent}>
      {/* Alert Statistics */}
      <View style={styles.statsContainer}>
        <StatCard
          title='Total Alerts'
          value={stats.totalAlerts.toString()}
          icon={<Bell size={20} color={colors.primary} />}
          trend='up'
          trendValue='+5'
        />
        <StatCard
          title='Unread Alerts'
          value={stats.unreadAlerts.toString()}
          icon={<AlertTriangle size={20} color={colors.warning} />}
          trend={stats.unreadAlerts > 0 ? 'up' : 'neutral'}
          trendValue={stats.unreadAlerts > 0 ? 'Action needed' : 'All clear'}
        />
        <StatCard
          title='Critical Alerts'
          value={stats.criticalAlerts.toString()}
          icon={<X size={20} color={colors.danger} />}
          trend={stats.criticalAlerts > 0 ? 'up' : 'neutral'}
          trendValue={stats.criticalAlerts > 0 ? 'High priority' : 'Normal'}
        />
      </View>

      <SectionHeader
        title='System Alerts'
        subtitle={`${stats.unreadAlerts} unread • ${stats.criticalAlerts} critical alerts`}
        action={
          <View style={styles.headerActions}>
            {stats.unreadAlerts > 0 && (
              <Button
                title='Mark All Read'
                variant='outline'
                size='small'
                onPress={onMarkAllAlertsAsRead}
              />
            )}
            <Button
              title='Filter'
              variant='ghost'
              size='small'
              icon={<Filter size={16} color={colors.primary} />}
              onPress={() => {}}
            />
          </View>
        }
      />

      {filteredData.length === 0 ? (
        <EmptyState
          icon={<Bell size={48} color={colors.textSecondary} />}
          title='No alerts found'
          message='System alerts will appear here'
        />
      ) : (
        <View style={styles.alertsList}>
          {filteredData.map(alert => (
            <View key={alert.id} style={styles.alertWrapper}>
              <AlertItem
                alert={alert}
                onPress={() => onAlertAction(alert, 'read')}
              />
              <TouchableOpacity
                style={styles.deleteAlertButton}
                onPress={() => onAlertAction(alert, 'delete')}
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
