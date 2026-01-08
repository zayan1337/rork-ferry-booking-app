import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useEmailCampaignStore } from '@/store/admin/emailCampaignStore';
import { useAlertContext } from '@/components/AlertProvider';
import Button from '@/components/admin/Button';
import StatCard from '@/components/admin/StatCard';
import {
  Mail,
  Bell,
  Plus,
  Send,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Eye,
  FileText,
  Pause,
} from 'lucide-react-native';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import {
  EmailCampaign,
  EmailTemplate,
  CampaignStatus,
} from '@/types/emailCampaign';

interface EmailCampaignsTabProps {
  isActive: boolean;
  searchQuery: string;
}

type TabView = 'campaigns' | 'templates';

const EmailCampaignsTab: React.FC<EmailCampaignsTabProps> = ({
  isActive,
  searchQuery,
}) => {
  const {
    campaigns,
    templates,
    stats,
    loading,
    fetchCampaigns,
    fetchTemplates,
    fetchStats,
    deleteCampaign,
    sendCampaign,
    pauseCampaign,
    deleteTemplate,
  } = useEmailCampaignStore();

  const { showSuccess, showError, showConfirmation } = useAlertContext();

  const [activeView, setActiveView] = useState<TabView>('campaigns');
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    await Promise.all([fetchCampaigns(), fetchTemplates(), fetchStats()]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!searchQuery) return campaigns;
    const query = searchQuery.toLowerCase();
    return campaigns.filter(
      c =>
        c.name.toLowerCase().includes(query) ||
        c.subject.toLowerCase().includes(query) ||
        c.status.toLowerCase().includes(query)
    );
  }, [campaigns, searchQuery]);

  // Filter templates based on search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      t =>
        t.name.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  const handleAddCampaign = () => {
    router.push('../email-campaign/new' as any);
  };

  const handleAddTemplate = () => {
    router.push('../email-template/new' as any);
  };

  const handleCampaignPress = (campaignId: string) => {
    router.push(`../email-campaign/${campaignId}` as any);
  };

  const handleTemplatePress = (templateId: string) => {
    router.push(`../email-template/${templateId}` as any);
  };

  // Get correct recipient count from campaign
  const getRecipientCount = (campaign: EmailCampaign) => {
    const criteria = campaign.target_criteria;
    if (criteria?.selectedUserIds && criteria.selectedUserIds.length > 0) {
      return criteria.selectedUserIds.length;
    }
    return campaign.total_recipients;
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    const recipientCount = getRecipientCount(campaign);
    showConfirmation(
      'Send Campaign',
      `Are you sure you want to send "${campaign.name}" to ${recipientCount} recipient${recipientCount !== 1 ? 's' : ''}?`,
      async () => {
        const success = await sendCampaign(campaign.id);
        if (success) {
          showSuccess('Success', 'Campaign is being sent!');
        } else {
          showError('Error', 'Failed to send campaign.');
        }
      }
    );
  };

  const handleDeleteCampaign = async (campaign: EmailCampaign) => {
    showConfirmation(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.name}"?`,
      async () => {
        const success = await deleteCampaign(campaign.id);
        if (success) {
          showSuccess('Success', 'Campaign deleted successfully!');
        } else {
          showError('Error', 'Failed to delete campaign.');
        }
      },
      undefined,
      true
    );
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    showConfirmation(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      async () => {
        const success = await deleteTemplate(template.id);
        if (success) {
          showSuccess('Success', 'Template deleted successfully!');
        } else {
          showError('Error', 'Failed to delete template.');
        }
      },
      undefined,
      true
    );
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

  const getStatusIcon = (status: CampaignStatus) => {
    switch (status) {
      case 'sent':
        return <CheckCircle size={14} color='#34C759' />;
      case 'sending':
        return <Send size={14} color={colors.warning} />;
      case 'scheduled':
        return <Clock size={14} color={colors.info} />;
      case 'draft':
        return <Edit size={14} color={colors.textSecondary} />;
      case 'paused':
        return <Pause size={14} color='#FF9500' />;
      case 'failed':
        return <XCircle size={14} color={colors.danger} />;
      default:
        return <Mail size={14} color={colors.textSecondary} />;
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Statistics */}
      <View style={styles.statsContainer}>
        <StatCard
          title='Total Campaigns'
          value={stats.total_campaigns.toString()}
          icon={<Mail size={20} color={colors.primary} />}
          color={colors.primary}
        />
        <StatCard
          title='Emails Sent'
          value={stats.total_emails_sent.toString()}
          icon={<Send size={20} color='#34C759' />}
          color='#34C759'
        />
        <StatCard
          title='Avg Open Rate'
          value={`${Math.round(stats.average_open_rate)}%`}
          icon={<Eye size={20} color={colors.info} />}
          color={colors.info}
        />
        <StatCard
          title='Templates'
          value={stats.total_templates.toString()}
          icon={<FileText size={20} color={colors.warning} />}
          color={colors.warning}
        />
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionTitleContainer}>
            <View style={styles.sectionIcon}>
              {activeView === 'campaigns' ? (
                <Mail size={20} color={colors.primary} />
              ) : (
                <FileText size={20} color={colors.primary} />
              )}
            </View>
            <View>
              <Text style={styles.sectionTitle}>
                {activeView === 'campaigns'
                  ? 'Email Campaigns'
                  : 'Email Templates'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {activeView === 'campaigns'
                  ? `${filteredCampaigns.length} campaigns`
                  : `${filteredTemplates.length} templates`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.sectionHeaderButton}>
          <Button
            title={activeView === 'campaigns' ? 'New Campaign' : 'New Template'}
            onPress={() =>
              activeView === 'campaigns'
                ? handleAddCampaign()
                : handleAddTemplate()
            }
            size='small'
            variant='primary'
            icon={<Plus size={16} color='white' />}
          />
        </View>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabToggleContainer}>
        <Pressable
          style={[
            styles.tabToggle,
            activeView === 'campaigns' && styles.tabToggleActive,
          ]}
          onPress={() => setActiveView('campaigns')}
        >
          <Mail
            size={16}
            color={
              activeView === 'campaigns' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabToggleText,
              activeView === 'campaigns' && styles.tabToggleTextActive,
            ]}
          >
            Campaigns ({filteredCampaigns.length})
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.tabToggle,
            activeView === 'templates' && styles.tabToggleActive,
          ]}
          onPress={() => setActiveView('templates')}
        >
          <FileText
            size={16}
            color={
              activeView === 'templates' ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabToggleText,
              activeView === 'templates' && styles.tabToggleTextActive,
            ]}
          >
            Templates ({filteredTemplates.length})
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const renderCampaignItem = ({ item }: { item: EmailCampaign }) => {
    const recipientCount = getRecipientCount(item);
    const deliveryRate =
      recipientCount > 0
        ? Math.round((item.sent_count / recipientCount) * 100)
        : 0;
    const openRate =
      item.sent_count > 0
        ? Math.round((item.opened_count / item.sent_count) * 100)
        : 0;

    return (
      <Pressable
        style={styles.campaignCard}
        onPress={() => handleCampaignPress(item.id)}
      >
        <View style={styles.campaignHeader}>
          <View style={styles.campaignInfo}>
            <Text style={styles.campaignName}>{item.name}</Text>
            <Text style={styles.campaignSubject} numberOfLines={1}>
              {item.subject}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(item.status)}20` },
            ]}
          >
            {getStatusIcon(item.status)}
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.channelBadges}>
          {item.send_email && (
            <View
              style={[
                styles.channelBadge,
                { backgroundColor: `${colors.primary}15` },
              ]}
            >
              <Mail size={12} color={colors.primary} />
              <Text style={[styles.channelText, { color: colors.primary }]}>
                Email
              </Text>
            </View>
          )}
          {item.send_notification && (
            <View
              style={[
                styles.channelBadge,
                { backgroundColor: `${colors.warning}15` },
              ]}
            >
              <Bell size={12} color={colors.warning} />
              <Text style={[styles.channelText, { color: colors.warning }]}>
                Notification
              </Text>
            </View>
          )}
        </View>

        <View style={styles.campaignStats}>
          <View style={styles.statItem}>
            <Users size={14} color={colors.primary} />
            <Text style={styles.statText}>
              {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.statItem}>
            <CheckCircle size={14} color='#34C759' />
            <Text style={styles.statText}>
              {item.sent_count} sent ({deliveryRate}%)
            </Text>
          </View>
          {item.opened_count > 0 && (
            <View style={styles.statItem}>
              <Eye size={14} color={colors.info} />
              <Text style={styles.statText}>{openRate}% opened</Text>
            </View>
          )}
        </View>

        <View style={styles.campaignFooter}>
          <Text style={styles.campaignDate}>
            Created {formatDateInMaldives(item.created_at, 'short-date')}
          </Text>
          <View style={styles.actionButtons}>
            {item.status === 'draft' && (
              <>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleSendCampaign(item)}
                >
                  <Send size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => handleDeleteCampaign(item)}
                >
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </>
            )}
            {item.status === 'sending' && (
              <Pressable
                style={styles.actionButton}
                onPress={() => pauseCampaign(item.id)}
              >
                <Pause size={16} color={colors.warning} />
              </Pressable>
            )}
            {(item.status === 'sent' || item.status === 'failed') && (
              <Pressable
                style={styles.actionButton}
                onPress={() => handleDeleteCampaign(item)}
              >
                <Trash2 size={16} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderTemplateItem = ({ item }: { item: EmailTemplate }) => (
    <Pressable
      style={styles.templateCard}
      onPress={() => handleTemplatePress(item.id)}
    >
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateSubject} numberOfLines={1}>
            {item.subject}
          </Text>
        </View>
        <View
          style={[
            styles.categoryBadge,
            {
              backgroundColor:
                item.category === 'emergency'
                  ? `${colors.danger}15`
                  : item.category === 'operational'
                    ? `${colors.warning}15`
                    : item.category === 'marketing'
                      ? `${colors.success}15`
                      : `${colors.primary}15`,
            },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              {
                color:
                  item.category === 'emergency'
                    ? colors.danger
                    : item.category === 'operational'
                      ? colors.warning
                      : item.category === 'marketing'
                        ? colors.success
                        : colors.primary,
              },
            ]}
          >
            {item.category}
          </Text>
        </View>
      </View>

      <View style={styles.templateStats}>
        <View style={styles.statItem}>
          <Send size={14} color={colors.primary} />
          <Text style={styles.statText}>Used {item.usage_count} times</Text>
        </View>
        <View style={styles.statItem}>
          <Clock size={14} color={colors.textSecondary} />
          <Text style={styles.statText}>
            {formatDateInMaldives(item.updated_at, 'short-date')}
          </Text>
        </View>
      </View>

      <View style={styles.templateActions}>
        <Pressable
          style={styles.templateActionButton}
          onPress={() => handleAddCampaign()}
        >
          <Send size={14} color={colors.primary} />
          <Text style={styles.templateActionText}>Use Template</Text>
        </Pressable>
        <Pressable
          style={styles.templateActionButton}
          onPress={() => router.push(`/email-template/edit/${item.id}` as any)}
        >
          <Edit size={14} color={colors.warning} />
          <Text style={[styles.templateActionText, { color: colors.warning }]}>
            Edit
          </Text>
        </Pressable>
        <Pressable
          style={styles.templateActionButton}
          onPress={() => handleDeleteTemplate(item)}
        >
          <Trash2 size={14} color={colors.danger} />
          <Text style={[styles.templateActionText, { color: colors.danger }]}>
            Delete
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        {activeView === 'campaigns' ? (
          <Mail size={48} color={colors.textSecondary} />
        ) : (
          <FileText size={48} color={colors.textSecondary} />
        )}
      </View>
      <Text style={styles.emptyStateTitle}>
        No {activeView === 'campaigns' ? 'Campaigns' : 'Templates'} Yet
      </Text>
      <Text style={styles.emptyStateText}>
        {activeView === 'campaigns'
          ? 'Create your first campaign to reach your users'
          : 'Create reusable templates for your campaigns'}
      </Text>
    </View>
  );

  // Loading state
  if ((loading.campaigns || loading.templates) && campaigns.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const currentData =
    activeView === 'campaigns' ? filteredCampaigns : filteredTemplates;

  return (
    <View style={styles.container}>
      <FlatList<EmailCampaign | EmailTemplate>
        data={currentData}
        renderItem={({ item }) => {
          if (activeView === 'campaigns') {
            return renderCampaignItem({ item: item as EmailCampaign });
          }
          return renderTemplateItem({ item: item as EmailTemplate });
        }}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
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

  // Header
  headerContainer: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Tab Toggle
  tabToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 16,
  },
  tabToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  tabToggleActive: {
    backgroundColor: `${colors.primary}15`,
  },
  tabToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabToggleTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyStateIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: `${colors.textSecondary}10`,
    borderRadius: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  // Campaign Card
  campaignCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${colors.border}30`,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  campaignInfo: {
    flex: 1,
    marginRight: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  campaignSubject: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  channelBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  campaignStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${colors.border}30`,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  campaignFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  campaignDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Template Card
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${colors.border}30`,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  templateInfo: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  templateSubject: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  templateStats: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: `${colors.border}30`,
  },
  templateActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  templateActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  templateActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
});

export default EmailCampaignsTab;
