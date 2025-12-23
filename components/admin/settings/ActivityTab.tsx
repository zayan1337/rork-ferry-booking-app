import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Activity, Clock, Users, Filter } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ActivityLog as AdminActivityLog } from '@/types/admin';
import { SettingsStats } from '@/types/settings';
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import StatCard from '@/components/admin/StatCard';
import EmptyState from '@/components/admin/EmptyState';
import { styles } from './styles';
import { formatDateInMaldives } from '@/utils/timezoneUtils';

interface ActivityTabProps {
  filteredData: AdminActivityLog[];
  stats: SettingsStats;
  selectedTimeframe: '24h' | '7d' | '30d';
  setSelectedTimeframe: (timeframe: '24h' | '7d' | '30d') => void;
  onExportActivity: () => void;
  canExportReports: boolean;
}

export default function ActivityTab({
  filteredData,
  stats,
  selectedTimeframe,
  setSelectedTimeframe,
  onExportActivity,
  canExportReports,
}: ActivityTabProps) {
  return (
    <View style={styles.tabContent}>
      {/* Activity Statistics */}
      <View style={styles.statsContainer}>
        <StatCard
          title='Total Activity'
          value={stats.totalActivityLogs.toString()}
          icon={<Activity size={20} color={colors.primary} />}
          trend='up'
          trendValue='+12%'
        />
        <StatCard
          title={`${selectedTimeframe.toUpperCase()} Activity`}
          value={stats.recentActivity.toString()}
          icon={<Clock size={20} color={colors.secondary} />}
          trend='neutral'
          trendValue='Active period'
        />
        <StatCard
          title='Active Users'
          value='24'
          icon={<Users size={20} color={colors.success} />}
          trend='up'
          trendValue='+3'
        />
      </View>

      {/* Timeframe Filter */}
      <View style={styles.timeframeContainer}>
        <Text style={styles.filterLabel}>Timeframe:</Text>
        <View style={styles.timeframeButtons}>
          {(['24h', '7d', '30d'] as const).map(period => (
            <Pressable
              key={period}
              style={[
                styles.timeframeButton,
                selectedTimeframe === period && styles.timeframeButtonActive,
              ]}
              onPress={() => setSelectedTimeframe(period)}
            >
              <Text
                style={[
                  styles.timeframeButtonText,
                  selectedTimeframe === period &&
                    styles.timeframeButtonTextActive,
                ]}
              >
                {period === '24h'
                  ? '24 Hours'
                  : period === '7d'
                    ? '7 Days'
                    : '30 Days'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <SectionHeader
        title='Activity Logs'
        subtitle={`${stats.recentActivity} activities in ${selectedTimeframe} • Complete audit trail`}
        action={
          <View style={styles.headerActions}>
            {/* {canExportReports && (
              <Button
                title='Export'
                variant='outline'
                size='small'
                icon={<Download size={16} color={colors.primary} />}
                onPress={onExportActivity}
              />
            )} */}
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
          icon={<Activity size={48} color={colors.textSecondary} />}
          title='No activity logs found'
          message='System activity will be logged here'
        />
      ) : (
        <View style={styles.activityList}>
          {filteredData.map(log => (
            <Pressable
              key={log.id}
              style={styles.activityItem}
              onPress={() => {
                router.push(`/settings/activity/${log.id}` as any);
              }}
            >
              <View style={styles.activityIcon}>
                <Activity size={16} color={colors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityAction}>{log.action}</Text>
                <Text style={styles.activityDetails}>{log.details}</Text>
                <Text style={styles.activityUser}>by {log.user_name}</Text>
              </View>
              <View style={styles.activityTime}>
                <Text style={styles.activityTimeText}>
                  {formatDateInMaldives(log.created_at, 'short-date')}
                </Text>
                <Text style={styles.activityTimeText}>
                  {formatDateInMaldives(log.created_at, 'time')}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
