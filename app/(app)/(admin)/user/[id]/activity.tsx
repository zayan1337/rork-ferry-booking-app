import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, Activity as ActivityIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { supabase } from '@/utils/supabase';
import EmptyState from '@/components/admin/EmptyState';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
  entity_type: string | null;
  entity_id: string | null;
  user_agent: string | null;
  old_values: any;
  new_values: any;
}

export default function UserActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [id]);

  const loadActivities = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch activity logs for this user
      const { data, error } = await supabase
        .from('activity_logs_with_users')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const transformedActivities: ActivityLog[] = (data || []).map(
        (log: any) => ({
          id: log.id,
          action: log.action || 'Unknown Action',
          details: log.details,
          ip_address: log.ip_address,
          created_at: log.created_at,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          user_agent: log.user_agent,
          old_values: log.old_values,
          new_values: log.new_values,
        })
      );

      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const getActionColor = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('add')) {
      return colors.success;
    }
    if (actionLower.includes('update') || actionLower.includes('edit')) {
      return colors.info;
    }
    if (actionLower.includes('delete') || actionLower.includes('remove')) {
      return colors.danger;
    }
    if (actionLower.includes('login') || actionLower.includes('logout')) {
      return colors.primary;
    }
    return colors.textSecondary;
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatEntityType = (entityType: string | null) => {
    if (!entityType) return 'System';
    return entityType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'User Activity',
          headerShown: true,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading activity...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {activities.length === 0 ? (
            <EmptyState
              icon={<ActivityIcon size={48} color={colors.textSecondary} />}
              title='No Activity'
              message='This user has no activity logs yet.'
            />
          ) : (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>
                {activities.length} Activity Log
                {activities.length !== 1 ? 's' : ''}
              </Text>
              {activities.map(activity => (
                <View key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityMain}>
                      <View
                        style={[
                          styles.actionBadge,
                          {
                            backgroundColor: `${getActionColor(activity.action)}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            { color: getActionColor(activity.action) },
                          ]}
                        >
                          {formatAction(activity.action)}
                        </Text>
                      </View>
                      {activity.entity_type && (
                        <Text style={styles.entityType}>
                          {formatEntityType(activity.entity_type)}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.activityDate}>
                      {formatBookingDate(activity.created_at)} at{' '}
                      {formatTimeAMPM(
                        new Date(activity.created_at)
                          .toTimeString()
                          .split(' ')[0]
                      )}
                    </Text>
                  </View>

                  {activity.details && (
                    <Text style={styles.activityDetails}>
                      {activity.details}
                    </Text>
                  )}

                  {(activity.old_values || activity.new_values) && (
                    <View style={styles.changesContainer}>
                      {activity.old_values && (
                        <View style={styles.changeSection}>
                          <Text style={styles.changeLabel}>Before:</Text>
                          <Text style={styles.changeValue}>
                            {JSON.stringify(activity.old_values, null, 2)}
                          </Text>
                        </View>
                      )}
                      {activity.new_values && (
                        <View style={styles.changeSection}>
                          <Text style={styles.changeLabel}>After:</Text>
                          <Text style={styles.changeValue}>
                            {JSON.stringify(activity.new_values, null, 2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.activityMeta}>
                    {activity.ip_address && (
                      <Text style={styles.metaText}>
                        IP: {activity.ip_address}
                      </Text>
                    )}
                    {activity.user_agent && (
                      <Text style={styles.metaText} numberOfLines={1}>
                        {activity.user_agent}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  activityCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  activityHeader: {
    marginBottom: 12,
  },
  activityMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  actionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  entityType: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  activityDetails: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  changesContainer: {
    gap: 8,
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  changeSection: {
    gap: 4,
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  changeValue: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  activityMeta: {
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
