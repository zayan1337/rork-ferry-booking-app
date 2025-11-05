import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  ArrowLeft,
  Activity,
  User,
  Clock,
  Monitor,
  FileText,
} from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import EmptyState from '@/components/admin/EmptyState';
import { formatBookingDate, formatTimeAMPM } from '@/utils/dateUtils';
import { ActivityLogWithUser } from '@/types/admin/database';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activityLog, setActivityLog] = useState<ActivityLogWithUser | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivityLog();
  }, [id]);

  const loadActivityLog = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('activity_logs_with_users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setActivityLog(data as ActivityLogWithUser);
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivityLog();
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

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading activity details...</Text>
        </View>
      </View>
    );
  }

  if (!activityLog) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Activity Not Found',
            headerShown: true,
            headerLeft: () => (
              <Pressable
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <EmptyState
          icon={<Activity size={48} color={colors.textSecondary} />}
          title='Activity Not Found'
          message='The requested activity log could not be found.'
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Activity Details',
          headerShown: true,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

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
        {/* Action Header */}
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <View
              style={[
                styles.actionIconContainer,
                { backgroundColor: `${getActionColor(activityLog.action)}20` },
              ]}
            >
              <Activity size={24} color={getActionColor(activityLog.action)} />
            </View>
            <View style={styles.actionHeaderText}>
              <Text style={styles.actionTitle}>
                {formatAction(activityLog.action)}
              </Text>
              <Text style={styles.actionSubtitle}>
                {activityLog.entity_type
                  ? formatEntityType(activityLog.entity_type)
                  : 'System Action'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.actionBadge,
              { backgroundColor: `${getActionColor(activityLog.action)}15` },
            ]}
          >
            <Text
              style={[
                styles.actionBadgeText,
                { color: getActionColor(activityLog.action) },
              ]}
            >
              {activityLog.action.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          {activityLog.details && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{activityLog.details}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Timestamp</Text>
            <View style={styles.timeContainer}>
              <Clock size={14} color={colors.textSecondary} />
              <Text style={styles.detailValue}>
                {formatBookingDate(activityLog.created_at)} at{' '}
                {formatTimeAMPM(
                  new Date(activityLog.created_at).toTimeString().split(' ')[0]
                )}
              </Text>
            </View>
          </View>

          {activityLog.entity_type && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Entity Type</Text>
              <Text style={styles.detailValue}>
                {formatEntityType(activityLog.entity_type)}
              </Text>
            </View>
          )}

          {activityLog.entity_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Entity ID</Text>
              <Text style={styles.detailValueMono}>
                {activityLog.entity_id}
              </Text>
            </View>
          )}
        </View>

        {/* User Information Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>User Information</Text>

          <View style={styles.userInfoRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {activityLog.user_name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{activityLog.user_name}</Text>
              {activityLog.user_email && (
                <Text style={styles.userEmail}>{activityLog.user_email}</Text>
              )}
              {activityLog.user_role && (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>
                    {activityLog.user_role.charAt(0).toUpperCase() +
                      activityLog.user_role.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {activityLog.user_id && (
            <View style={styles.detailRow}>
              <User size={14} color={colors.textSecondary} />
              <Text style={styles.detailValueMono}>{activityLog.user_id}</Text>
            </View>
          )}
        </View>

        {/* Technical Information Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Technical Information</Text>

          {activityLog.ip_address && (
            <View style={styles.detailRow}>
              <Monitor size={14} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>IP Address</Text>
              <Text style={styles.detailValueMono}>
                {activityLog.ip_address}
              </Text>
            </View>
          )}

          {activityLog.user_agent && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User Agent</Text>
              <Text style={styles.detailValueSmall}>
                {activityLog.user_agent}
              </Text>
            </View>
          )}

          {activityLog.session_id && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Session ID</Text>
              <Text style={styles.detailValueMono}>
                {activityLog.session_id}
              </Text>
            </View>
          )}
        </View>

        {/* Change History Card */}
        {(activityLog.old_values || activityLog.new_values) && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Change History</Text>

            {activityLog.old_values && (
              <View style={styles.changeSection}>
                <View style={styles.changeHeader}>
                  <FileText size={16} color={colors.textSecondary} />
                  <Text style={styles.changeLabel}>Before</Text>
                </View>
                <View style={styles.jsonContainer}>
                  <Text style={styles.jsonText}>
                    {JSON.stringify(activityLog.old_values, null, 2)}
                  </Text>
                </View>
              </View>
            )}

            {activityLog.new_values && (
              <View style={styles.changeSection}>
                <View style={styles.changeHeader}>
                  <FileText size={16} color={colors.textSecondary} />
                  <Text style={styles.changeLabel}>After</Text>
                </View>
                <View style={styles.jsonContainer}>
                  <Text style={styles.jsonText}>
                    {JSON.stringify(activityLog.new_values, null, 2)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${colors.border}20`,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHeaderText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${colors.border}20`,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  detailValueMono: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    fontFamily: 'monospace',
    flex: 1,
  },
  detailValueSmall: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '400',
    flex: 1,
    lineHeight: 18,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: `${colors.primary}15`,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  changeSection: {
    marginBottom: 20,
    gap: 8,
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  changeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  jsonContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: colors.text,
    lineHeight: 18,
  },
});
