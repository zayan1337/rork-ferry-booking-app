import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  ArrowLeft,
  AlertCircle,
  Mail,
  Bell,
  Users,
  CheckCircle,
  Eye,
  Send,
  Pause,
  Trash2,
  Edit,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  useEmailCampaignStore,
  SelectableUser,
} from '@/store/admin/emailCampaignStore';
import { useAlertContext } from '@/components/AlertProvider';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import Button from '@/components/admin/Button';
import { CampaignStatus, EmailCampaign } from '@/types/emailCampaign';
import { supabase } from '@/utils/supabase';

export default function EmailCampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManageSettings } = useAdminPermissions();
  const { showConfirmation, showSuccess, showError } = useAlertContext();
  const { fetchCampaign, sendCampaign, pauseCampaign, deleteCampaign } =
    useEmailCampaignStore();

  const [campaign, setCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<SelectableUser[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showAllRecipients, setShowAllRecipients] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    if (!id) return;
    setLoading(true);
    const result = await fetchCampaign(id);
    setCampaign(result);
    setLoading(false);

    // Load recipients after campaign is loaded
    if (result?.target_criteria) {
      loadRecipients(result.target_criteria);
    }
  };

  const loadRecipients = async (targetCriteria: any) => {
    setLoadingRecipients(true);
    try {
      // If specific users are selected
      if (
        targetCriteria.selectedUserIds &&
        targetCriteria.selectedUserIds.length > 0
      ) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, role, is_active')
          .in('id', targetCriteria.selectedUserIds);
        setRecipients(data || []);
      }
      // If all users
      else if (targetCriteria.allUsers) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, role, is_active')
          .eq('is_active', true)
          .not('email', 'is', null)
          .limit(20);
        setRecipients(data || []);
      }
      // If specific roles
      else if (targetCriteria.roles && targetCriteria.roles.length > 0) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, role, is_active')
          .eq('is_active', true)
          .not('email', 'is', null)
          .in('role', targetCriteria.roles)
          .limit(20);
        setRecipients(data || []);
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'sent':
        return '#34C759';
      case 'sending':
        return colors.warning;
      case 'scheduled':
        return colors.info;
      case 'draft':
        return colors.textSecondary;
      case 'paused':
        return '#FF9500';
      case 'failed':
      case 'cancelled':
        return colors.danger;
      default:
        return colors.textSecondary;
    }
  };

  const handleSendCampaign = () => {
    if (!campaign) return;

    // Get the correct recipient count based on targeting
    const criteria = campaign.target_criteria;
    let recipientCount = campaign.total_recipients;

    // If individual users are selected, use that count
    if (criteria?.selectedUserIds && criteria.selectedUserIds.length > 0) {
      recipientCount = criteria.selectedUserIds.length;
    }

    showConfirmation(
      'Send Campaign',
      `Are you sure you want to send "${campaign.name}" to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}?`,
      async () => {
        const success = await sendCampaign(campaign.id);
        if (success) {
          showSuccess('Success', 'Campaign is being sent!');
          loadCampaign();
        } else {
          showError('Error', 'Failed to send campaign.');
        }
      }
    );
  };

  const handlePauseCampaign = async () => {
    if (!campaign) return;
    const success = await pauseCampaign(campaign.id);
    if (success) {
      showSuccess('Success', 'Campaign paused.');
      loadCampaign();
    } else {
      showError('Error', 'Failed to pause campaign.');
    }
  };

  const handleDeleteCampaign = () => {
    if (!campaign) return;
    showConfirmation(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.name}"?`,
      async () => {
        const success = await deleteCampaign(campaign.id);
        if (success) {
          showSuccess('Success', 'Campaign deleted.');
          router.back();
        } else {
          showError('Error', 'Failed to delete campaign.');
        }
      },
      undefined,
      true
    );
  };

  const handleEditCampaign = () => {
    if (!campaign) return;
    router.push(`/email-campaign/edit/${campaign.id}` as any);
  };

  if (!canManageSettings()) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <View style={styles.noAccessIcon}>
            <AlertCircle size={48} color={colors.warning} />
          </View>
          <Text style={styles.noPermissionTitle}>Access Denied</Text>
          <Text style={styles.noPermissionText}>
            You don't have permission to view campaign details.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading campaign...</Text>
        </View>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Not Found',
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </Pressable>
            ),
          }}
        />
        <View style={styles.noPermissionContainer}>
          <AlertCircle size={48} color={colors.danger} />
          <Text style={styles.noPermissionTitle}>Campaign Not Found</Text>
          <Text style={styles.noPermissionText}>
            The campaign you're looking for doesn't exist.
          </Text>
          <Button
            title='Go Back'
            variant='primary'
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  // Get the correct recipient count based on targeting criteria
  const getActualRecipientCount = () => {
    const criteria = campaign.target_criteria;
    if (criteria?.selectedUserIds && criteria.selectedUserIds.length > 0) {
      return criteria.selectedUserIds.length;
    }
    return campaign.total_recipients;
  };

  const actualRecipientCount = getActualRecipientCount();

  const deliveryRate =
    actualRecipientCount > 0
      ? Math.round((campaign.sent_count / actualRecipientCount) * 100)
      : 0;
  const openRate =
    campaign.sent_count > 0
      ? Math.round((campaign.opened_count / campaign.sent_count) * 100)
      : 0;

  const getTargetingDescription = () => {
    const criteria = campaign.target_criteria;
    if (!criteria) return 'No targeting criteria';

    if (criteria.selectedUserIds && criteria.selectedUserIds.length > 0) {
      return `${criteria.selectedUserIds.length} individual user(s) selected`;
    }
    if (criteria.allUsers) {
      return 'All active users';
    }
    if (criteria.roles && criteria.roles.length > 0) {
      return `Users with roles: ${criteria.roles.join(', ')}`;
    }
    if (criteria.selectedTripIds && criteria.selectedTripIds.length > 0) {
      return `Users from ${criteria.selectedTripIds.length} trip(s)`;
    }
    return 'Custom targeting';
  };

  const displayedRecipients = showAllRecipients
    ? recipients
    : recipients.slice(0, 5);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: campaign.name,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Status & Overview */}
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(campaign.status)}20` },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(campaign.status) },
                ]}
              >
                {campaign.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.dateText}>
              Created {formatDateInMaldives(campaign.created_at, 'short-date')}
            </Text>
          </View>

          <Text style={styles.campaignSubject}>{campaign.subject}</Text>

          <View style={styles.channelRow}>
            {campaign.send_email && (
              <View style={styles.channelBadge}>
                <Mail size={14} color={colors.primary} />
                <Text style={styles.channelBadgeText}>Email</Text>
              </View>
            )}
            {campaign.send_notification && (
              <View
                style={[
                  styles.channelBadge,
                  { backgroundColor: `${colors.warning}15` },
                ]}
              >
                <Bell size={14} color={colors.warning} />
                <Text
                  style={[styles.channelBadgeText, { color: colors.warning }]}
                >
                  Notification
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.statValue}>{actualRecipientCount}</Text>
              <Text style={styles.statLabel}>Recipients</Text>
            </View>
            <View style={styles.statCard}>
              <Send size={20} color='#34C759' />
              <Text style={styles.statValue}>{campaign.sent_count}</Text>
              <Text style={styles.statLabel}>Sent ({deliveryRate}%)</Text>
            </View>
            <View style={styles.statCard}>
              <Eye size={20} color={colors.info} />
              <Text style={styles.statValue}>{campaign.opened_count}</Text>
              <Text style={styles.statLabel}>Opened ({openRate}%)</Text>
            </View>
            <View style={styles.statCard}>
              <CheckCircle size={20} color={colors.success} />
              <Text style={styles.statValue}>{campaign.clicked_count}</Text>
              <Text style={styles.statLabel}>Clicked</Text>
            </View>
          </View>
        </View>

        {/* Recipients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recipients</Text>
            <View style={styles.recipientCount}>
              <Users size={14} color={colors.primary} />
              <Text style={styles.recipientCountText}>
                {actualRecipientCount}
              </Text>
            </View>
          </View>

          <View style={styles.targetingInfo}>
            <Text style={styles.targetingLabel}>Targeting:</Text>
            <Text style={styles.targetingValue}>
              {getTargetingDescription()}
            </Text>
          </View>

          {loadingRecipients ? (
            <ActivityIndicator
              size='small'
              color={colors.primary}
              style={{ marginVertical: 20 }}
            />
          ) : recipients.length > 0 ? (
            <>
              <View style={styles.recipientsList}>
                {displayedRecipients.map(user => (
                  <View key={user.id} style={styles.recipientItem}>
                    <View style={styles.recipientAvatar}>
                      <User size={16} color={colors.textSecondary} />
                    </View>
                    <View style={styles.recipientInfo}>
                      <Text style={styles.recipientName}>{user.full_name}</Text>
                      <Text style={styles.recipientEmail}>{user.email}</Text>
                    </View>
                    <View
                      style={[
                        styles.recipientRoleBadge,
                        {
                          backgroundColor:
                            user.role === 'admin'
                              ? `${colors.danger}15`
                              : user.role === 'agent'
                                ? `${colors.warning}15`
                                : `${colors.primary}15`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recipientRoleText,
                          {
                            color:
                              user.role === 'admin'
                                ? colors.danger
                                : user.role === 'agent'
                                  ? colors.warning
                                  : colors.primary,
                          },
                        ]}
                      >
                        {user.role}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {recipients.length > 5 && (
                <Pressable
                  style={styles.showMoreButton}
                  onPress={() => setShowAllRecipients(!showAllRecipients)}
                >
                  <Text style={styles.showMoreText}>
                    {showAllRecipients
                      ? 'Show Less'
                      : `Show All (${recipients.length})`}
                  </Text>
                  <ChevronRight
                    size={16}
                    color={colors.primary}
                    style={{
                      transform: [
                        { rotate: showAllRecipients ? '-90deg' : '90deg' },
                      ],
                    }}
                  />
                </Pressable>
              )}
            </>
          ) : (
            <View style={styles.noRecipients}>
              <Users size={24} color={colors.textSecondary} />
              <Text style={styles.noRecipientsText}>
                No recipients to display
              </Text>
            </View>
          )}
        </View>

        {/* Content Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message Content</Text>
          <View style={styles.contentPreview}>
            <Text style={styles.contentText}>
              {campaign.html_content || 'No content available'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            {campaign.status === 'draft' && (
              <>
                <Pressable
                  style={styles.actionCard}
                  onPress={handleSendCampaign}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                  >
                    <Send size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.actionLabel}>Send Campaign</Text>
                </Pressable>
                <Pressable
                  style={styles.actionCard}
                  onPress={handleEditCampaign}
                >
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: `${colors.warning}15` },
                    ]}
                  >
                    <Edit size={20} color={colors.warning} />
                  </View>
                  <Text style={styles.actionLabel}>Edit Campaign</Text>
                </Pressable>
              </>
            )}
            {campaign.status === 'sending' && (
              <Pressable
                style={styles.actionCard}
                onPress={handlePauseCampaign}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: `${colors.warning}15` },
                  ]}
                >
                  <Pause size={20} color={colors.warning} />
                </View>
                <Text style={styles.actionLabel}>Pause Campaign</Text>
              </Pressable>
            )}
            <Pressable style={styles.actionCard} onPress={handleDeleteCampaign}>
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${colors.danger}15` },
                ]}
              >
                <Trash2 size={20} color={colors.danger} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.danger }]}>
                Delete Campaign
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 20,
  },
  noAccessIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  campaignSubject: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  channelBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recipientCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  recipientCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  targetingInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  targetingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  targetingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  recipientsList: {
    gap: 8,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  recipientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  recipientEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recipientRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recipientRoleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  noRecipients: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noRecipientsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  contentPreview: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  actionsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
});
