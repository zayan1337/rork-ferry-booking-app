import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  useEmailCampaignStore,
  SelectableUser,
} from '@/store/admin/emailCampaignStore';
import { useAdminStore } from '@/store/admin/adminStore';
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
  Target,
  Pause,
  X,
  Search,
  Ship,
  Calendar,
  CheckSquare,
  Square,
  User,
} from 'lucide-react-native';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import {
  EmailCampaign,
  EmailTemplate,
  TargetCriteria,
  CampaignStatus,
  UserRole,
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
    error,
    recipientPreviewCount,
    availableUsers,
    availableTrips,
    tripUsers,
    fetchCampaigns,
    fetchTemplates,
    fetchStats,
    createCampaign,
    deleteCampaign,
    sendCampaign,
    pauseCampaign,
    createTemplate,
    deleteTemplate,
    previewRecipientCount,
    fetchAvailableUsers,
    fetchAvailableTrips,
    fetchUsersForTrip,
  } = useEmailCampaignStore();

  const { routes, vessels } = useAdminStore();
  const { showSuccess, showError, showConfirmation } = useAlertContext();

  const [activeView, setActiveView] = useState<TabView>('campaigns');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // User selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState<
    'all' | 'roles' | 'users' | 'trips'
  >('all');

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    template_id: '',
    send_email: true,
    send_notification: false,
    target_criteria: {
      roles: [] as UserRole[],
      routes: [] as string[],
      vessels: [] as string[],
      allUsers: false,
      selectedUserIds: [] as string[],
      selectedTripIds: [] as string[],
    } as TargetCriteria,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    category: 'general' as EmailTemplate['category'],
  });

  // Load data on mount
  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    await Promise.all([fetchCampaigns(), fetchTemplates(), fetchStats()]);
  };

  // Load users and trips when campaign modal opens
  useEffect(() => {
    if (showCampaignModal) {
      fetchAvailableUsers();
      fetchAvailableTrips();
    }
  }, [showCampaignModal]);

  // Search users with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCampaignModal && userSearchQuery) {
        fetchAvailableUsers(userSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, showCampaignModal]);

  // Load users for selected trips
  useEffect(() => {
    const loadTripUsers = async () => {
      const tripIds = Array.from(selectedTrips);
      if (tripIds.length > 0) {
        const allTripUsers: SelectableUser[] = [];
        for (const tripId of tripIds) {
          const users = await fetchUsersForTrip(tripId);
          users.forEach(user => {
            if (!allTripUsers.find(u => u.id === user.id)) {
              allTripUsers.push(user);
            }
          });
        }
        // Auto-select all users from selected trips
        setSelectedUsers(prev => {
          const newSet = new Set(prev);
          allTripUsers.forEach(user => newSet.add(user.id));
          return newSet;
        });
      }
    };
    loadTripUsers();
  }, [selectedTrips]);

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

  // Preview recipient count when criteria changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showCampaignModal) {
        previewRecipientCount(campaignForm.target_criteria);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [campaignForm.target_criteria, showCampaignModal]);

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject) {
      showError(
        'Validation Error',
        'Please fill in campaign name and subject.'
      );
      return;
    }

    if (!campaignForm.send_email && !campaignForm.send_notification) {
      showError(
        'Validation Error',
        'Please select at least one channel (email or notification).'
      );
      return;
    }

    const result = await createCampaign({
      name: campaignForm.name,
      subject: campaignForm.subject,
      html_content: campaignForm.html_content,
      template_id: campaignForm.template_id || undefined,
      send_email: campaignForm.send_email,
      send_notification: campaignForm.send_notification,
      target_criteria: campaignForm.target_criteria,
    });

    if (result) {
      showSuccess('Success', 'Campaign created successfully!');
      setShowCampaignModal(false);
      resetCampaignForm();
    } else {
      showError('Error', error || 'Failed to create campaign.');
    }
  };

  const handleSendCampaign = async (campaign: EmailCampaign) => {
    showConfirmation(
      'Send Campaign',
      `Are you sure you want to send "${campaign.name}" to ${campaign.total_recipients} recipients?`,
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

  const handleCreateTemplate = async () => {
    if (
      !templateForm.name ||
      !templateForm.subject ||
      !templateForm.html_content
    ) {
      showError('Validation Error', 'Please fill in all required fields.');
      return;
    }

    const result = await createTemplate({
      name: templateForm.name,
      subject: templateForm.subject,
      html_content: templateForm.html_content,
      category: templateForm.category,
      variables: [],
    });

    if (result) {
      showSuccess('Success', 'Template created successfully!');
      setShowTemplateModal(false);
      resetTemplateForm();
    } else {
      showError('Error', error || 'Failed to create template.');
    }
  };

  const resetCampaignForm = () => {
    setCampaignForm({
      name: '',
      subject: '',
      html_content: '',
      template_id: '',
      send_email: true,
      send_notification: false,
      target_criteria: {
        roles: [],
        routes: [],
        vessels: [],
        allUsers: false,
        selectedUserIds: [],
        selectedTripIds: [],
      },
    });
    setSelectedUsers(new Set());
    setSelectedTrips(new Set());
    setUserSearchQuery('');
    setSelectionMode('all');
  };

  // User selection functions
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const selectAllUsers = () => {
    const allUserIds = availableUsers.map(u => u.id);
    setSelectedUsers(new Set(allUserIds));
  };

  const deselectAllUsers = () => {
    setSelectedUsers(new Set());
  };

  const toggleTripSelection = (tripId: string) => {
    setSelectedTrips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  // Update target criteria when selection changes
  useEffect(() => {
    if (selectionMode === 'users' || selectionMode === 'trips') {
      setCampaignForm(prev => ({
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          selectedUserIds: Array.from(selectedUsers),
          selectedTripIds: Array.from(selectedTrips),
          allUsers: false,
          roles: [],
        },
      }));
    }
  }, [selectedUsers, selectedTrips, selectionMode]);

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      html_content: '',
      category: 'general',
    });
  };

  const toggleRole = (role: UserRole) => {
    setCampaignForm(prev => {
      const roles = prev.target_criteria.roles || [];
      const newRoles = roles.includes(role)
        ? roles.filter(r => r !== role)
        : [...roles, role];
      return {
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          roles: newRoles,
          allUsers: false,
        },
      };
    });
  };

  const handleSelectionModeChange = (
    mode: 'all' | 'roles' | 'users' | 'trips'
  ) => {
    setSelectionMode(mode);
    if (mode === 'all') {
      setCampaignForm(prev => ({
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          allUsers: true,
          roles: [],
          selectedUserIds: [],
          selectedTripIds: [],
        },
      }));
      setSelectedUsers(new Set());
      setSelectedTrips(new Set());
    } else if (mode === 'roles') {
      setCampaignForm(prev => ({
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          allUsers: false,
          selectedUserIds: [],
          selectedTripIds: [],
        },
      }));
      setSelectedUsers(new Set());
      setSelectedTrips(new Set());
    } else if (mode === 'users') {
      setCampaignForm(prev => ({
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          allUsers: false,
          roles: [],
        },
      }));
      setSelectedTrips(new Set());
    } else if (mode === 'trips') {
      setCampaignForm(prev => ({
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          allUsers: false,
          roles: [],
        },
      }));
      setSelectedUsers(new Set());
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
                ? setShowCampaignModal(true)
                : setShowTemplateModal(true)
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
    const deliveryRate =
      item.total_recipients > 0
        ? Math.round((item.sent_count / item.total_recipients) * 100)
        : 0;
    const openRate =
      item.sent_count > 0
        ? Math.round((item.opened_count / item.sent_count) * 100)
        : 0;

    return (
      <View style={styles.campaignCard}>
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
              {item.total_recipients} recipients
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
      </View>
    );
  };

  const renderTemplateItem = ({ item }: { item: EmailTemplate }) => (
    <View style={styles.templateCard}>
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
          onPress={() => {
            setCampaignForm(prev => ({
              ...prev,
              template_id: item.id,
              subject: item.subject,
              html_content: item.html_content,
            }));
            setShowCampaignModal(true);
          }}
        >
          <Send size={14} color={colors.primary} />
          <Text style={styles.templateActionText}>Use Template</Text>
        </Pressable>
        <Pressable
          style={styles.templateActionButton}
          onPress={() =>
            showConfirmation(
              'Delete Template',
              'Are you sure you want to delete this template?',
              () => deleteTemplate(item.id),
              undefined,
              true
            )
          }
        >
          <Trash2 size={14} color={colors.danger} />
          <Text style={[styles.templateActionText, { color: colors.danger }]}>
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
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

  const renderCampaignModal = () => (
    <Modal
      visible={showCampaignModal}
      animationType='slide'
      {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
      onRequestClose={() => {
        Keyboard.dismiss();
        setShowCampaignModal(false);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Campaign</Text>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowCampaignModal(false);
            }}
          >
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Campaign Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Campaign Name *</Text>
            <TextInput
              style={styles.textInput}
              value={campaignForm.name}
              onChangeText={text =>
                setCampaignForm(prev => ({ ...prev, name: text }))
              }
              placeholder='Enter campaign name'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Subject */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Subject *</Text>
            <TextInput
              style={styles.textInput}
              value={campaignForm.subject}
              onChangeText={text =>
                setCampaignForm(prev => ({ ...prev, subject: text }))
              }
              placeholder='Enter email subject'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Template Selection */}
          {templates.length > 0 && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Template (Optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateSelectorContent}
              >
                {templates.map(template => (
                  <Pressable
                    key={template.id}
                    style={[
                      styles.templateOption,
                      campaignForm.template_id === template.id &&
                        styles.templateOptionSelected,
                    ]}
                    onPress={() => {
                      setCampaignForm(prev => ({
                        ...prev,
                        template_id: template.id,
                        subject: template.subject,
                        html_content: template.html_content,
                      }));
                    }}
                  >
                    <Text
                      style={[
                        styles.templateOptionText,
                        campaignForm.template_id === template.id &&
                          styles.templateOptionTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {template.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Content */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={campaignForm.html_content}
              onChangeText={text =>
                setCampaignForm(prev => ({ ...prev, html_content: text }))
              }
              placeholder='Enter message content (HTML supported)'
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical='top'
            />
          </View>

          {/* Channels */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Channels</Text>
            <View style={styles.channelOptions}>
              <View style={styles.channelOption}>
                <View style={styles.channelOptionInfo}>
                  <View
                    style={[
                      styles.channelOptionIcon,
                      { backgroundColor: `${colors.primary}15` },
                    ]}
                  >
                    <Mail size={18} color={colors.primary} />
                  </View>
                  <View style={styles.channelOptionText}>
                    <Text style={styles.channelOptionLabel}>Email</Text>
                    <Text style={styles.channelOptionDescription}>
                      Send to user's email address
                    </Text>
                  </View>
                </View>
                <Switch
                  value={campaignForm.send_email}
                  onValueChange={value =>
                    setCampaignForm(prev => ({ ...prev, send_email: value }))
                  }
                  trackColor={{
                    false: colors.border,
                    true: `${colors.primary}50`,
                  }}
                  thumbColor={
                    campaignForm.send_email ? colors.primary : colors.card
                  }
                />
              </View>
              <View style={styles.channelOption}>
                <View style={styles.channelOptionInfo}>
                  <View
                    style={[
                      styles.channelOptionIcon,
                      { backgroundColor: `${colors.warning}15` },
                    ]}
                  >
                    <Bell size={18} color={colors.warning} />
                  </View>
                  <View style={styles.channelOptionText}>
                    <Text style={styles.channelOptionLabel}>
                      App Notification
                    </Text>
                    <Text style={styles.channelOptionDescription}>
                      Send in-app notification
                    </Text>
                  </View>
                </View>
                <Switch
                  value={campaignForm.send_notification}
                  onValueChange={value =>
                    setCampaignForm(prev => ({
                      ...prev,
                      send_notification: value,
                    }))
                  }
                  trackColor={{
                    false: colors.border,
                    true: `${colors.warning}50`,
                  }}
                  thumbColor={
                    campaignForm.send_notification
                      ? colors.warning
                      : colors.card
                  }
                />
              </View>
            </View>
          </View>

          {/* Target Audience */}
          <View style={styles.inputGroup}>
            <Text style={styles.sectionLabel}>Target Audience</Text>

            {/* Selection Mode Toggle */}
            <View style={styles.selectionModeContainer}>
              <Pressable
                style={[
                  styles.selectionModeOption,
                  selectionMode === 'all' && styles.selectionModeOptionActive,
                ]}
                onPress={() => handleSelectionModeChange('all')}
              >
                <Users
                  size={16}
                  color={
                    selectionMode === 'all'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.selectionModeText,
                    selectionMode === 'all' && styles.selectionModeTextActive,
                  ]}
                >
                  All Users
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.selectionModeOption,
                  selectionMode === 'roles' && styles.selectionModeOptionActive,
                ]}
                onPress={() => handleSelectionModeChange('roles')}
              >
                <Target
                  size={16}
                  color={
                    selectionMode === 'roles'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.selectionModeText,
                    selectionMode === 'roles' && styles.selectionModeTextActive,
                  ]}
                >
                  By Role
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.selectionModeOption,
                  selectionMode === 'users' && styles.selectionModeOptionActive,
                ]}
                onPress={() => handleSelectionModeChange('users')}
              >
                <User
                  size={16}
                  color={
                    selectionMode === 'users'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.selectionModeText,
                    selectionMode === 'users' && styles.selectionModeTextActive,
                  ]}
                >
                  Individual
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.selectionModeOption,
                  selectionMode === 'trips' && styles.selectionModeOptionActive,
                ]}
                onPress={() => handleSelectionModeChange('trips')}
              >
                <Ship
                  size={16}
                  color={
                    selectionMode === 'trips'
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.selectionModeText,
                    selectionMode === 'trips' && styles.selectionModeTextActive,
                  ]}
                >
                  By Trip
                </Text>
              </Pressable>
            </View>

            {/* Roles Selection */}
            {selectionMode === 'roles' && (
              <View style={styles.roleSelectionContainer}>
                <Text style={styles.roleLabel}>Select User Roles</Text>
                <View style={styles.roleOptions}>
                  {(
                    ['customer', 'agent', 'admin', 'captain'] as UserRole[]
                  ).map(role => (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleOption,
                        campaignForm.target_criteria.roles?.includes(role) &&
                          styles.roleOptionSelected,
                      ]}
                      onPress={() => toggleRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          campaignForm.target_criteria.roles?.includes(role) &&
                            styles.roleOptionTextSelected,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Individual User Selection */}
            {selectionMode === 'users' && (
              <View style={styles.userSelectionContainer}>
                {/* Search */}
                <View style={styles.userSearchContainer}>
                  <Search size={18} color={colors.textSecondary} />
                  <TextInput
                    style={styles.userSearchInput}
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                    placeholder='Search users by name or email'
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                {/* Select All / Deselect All */}
                <View style={styles.selectAllRow}>
                  <Text style={styles.selectAllLabel}>
                    {selectedUsers.size} of {availableUsers.length} selected
                  </Text>
                  <View style={styles.selectAllButtons}>
                    <Pressable
                      style={styles.selectAllButton}
                      onPress={selectAllUsers}
                    >
                      <CheckSquare size={14} color={colors.primary} />
                      <Text style={styles.selectAllButtonText}>Select All</Text>
                    </Pressable>
                    <Pressable
                      style={styles.selectAllButton}
                      onPress={deselectAllUsers}
                    >
                      <Square size={14} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.selectAllButtonText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Clear
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* User List */}
                <View style={styles.userListContainer}>
                  {loading.users ? (
                    <ActivityIndicator
                      size='small'
                      color={colors.primary}
                      style={{ marginVertical: 20 }}
                    />
                  ) : availableUsers.length === 0 ? (
                    <View style={styles.emptyUserList}>
                      <User size={24} color={colors.textSecondary} />
                      <Text style={styles.emptyUserListText}>
                        No users found
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      style={styles.userList}
                      contentContainerStyle={styles.userListContent}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                    >
                      {availableUsers.map(user => (
                        <Pressable
                          key={user.id}
                          style={[
                            styles.userItem,
                            selectedUsers.has(user.id) &&
                              styles.userItemSelected,
                          ]}
                          onPress={() => toggleUserSelection(user.id)}
                        >
                          <View
                            style={[
                              styles.userCheckbox,
                              selectedUsers.has(user.id) &&
                                styles.userCheckboxChecked,
                            ]}
                          >
                            {selectedUsers.has(user.id) && (
                              <CheckCircle size={14} color='white' />
                            )}
                          </View>
                          <View style={styles.userInfo}>
                            <Text style={styles.userName}>
                              {user.full_name}
                            </Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                          </View>
                          <View
                            style={[
                              styles.userRoleBadge,
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
                                styles.userRoleText,
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
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            )}

            {/* Trip-based Selection */}
            {selectionMode === 'trips' && (
              <View style={styles.tripSelectionContainer}>
                <Text style={styles.tripSelectionLabel}>
                  Select trips to include their booked users
                </Text>

                {loading.trips ? (
                  <ActivityIndicator
                    size='small'
                    color={colors.primary}
                    style={{ marginVertical: 20 }}
                  />
                ) : (
                  <ScrollView
                    style={styles.tripList}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                  >
                    {availableTrips.map(trip => (
                      <Pressable
                        key={trip.id}
                        style={[
                          styles.tripItem,
                          selectedTrips.has(trip.id) && styles.tripItemSelected,
                        ]}
                        onPress={() => toggleTripSelection(trip.id)}
                      >
                        <View
                          style={[
                            styles.tripCheckbox,
                            selectedTrips.has(trip.id) &&
                              styles.tripCheckboxChecked,
                          ]}
                        >
                          {selectedTrips.has(trip.id) && (
                            <CheckCircle size={14} color='white' />
                          )}
                        </View>
                        <View style={styles.tripInfo}>
                          <Text style={styles.tripRouteName}>
                            {trip.route_name}
                          </Text>
                          <View style={styles.tripMeta}>
                            <Calendar size={12} color={colors.textSecondary} />
                            <Text style={styles.tripMetaText}>
                              {trip.travel_date}
                            </Text>
                            <Clock size={12} color={colors.textSecondary} />
                            <Text style={styles.tripMetaText}>
                              {trip.departure_time}
                            </Text>
                          </View>
                          <Text style={styles.tripVessel}>
                            {trip.vessel_name}
                          </Text>
                        </View>
                        <View style={styles.tripBookingCount}>
                          <Users size={14} color={colors.primary} />
                          <Text style={styles.tripBookingCountText}>
                            {trip.booking_count}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                    {availableTrips.length === 0 && (
                      <View style={styles.emptyTrips}>
                        <Ship size={24} color={colors.textSecondary} />
                        <Text style={styles.emptyTripsText}>
                          No upcoming trips found
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                )}

                {/* Show selected users from trips */}
                {selectedUsers.size > 0 && (
                  <View style={styles.tripUsersPreview}>
                    <Text style={styles.tripUsersPreviewLabel}>
                      {selectedUsers.size} users will receive this message
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Recipient Preview */}
            <View style={styles.recipientPreview}>
              <View style={styles.recipientPreviewIcon}>
                <Target size={18} color={colors.primary} />
              </View>
              <View style={styles.recipientPreviewInfo}>
                <Text style={styles.recipientPreviewLabel}>
                  Estimated Recipients
                </Text>
                {loading.recipientCount || loading.users ? (
                  <ActivityIndicator size='small' color={colors.primary} />
                ) : (
                  <Text style={styles.recipientPreviewCount}>
                    {selectionMode === 'users' || selectionMode === 'trips'
                      ? selectedUsers.size
                      : recipientPreviewCount}{' '}
                    users
                  </Text>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button
            title='Cancel'
            onPress={() => {
              Keyboard.dismiss();
              setShowCampaignModal(false);
              resetCampaignForm();
            }}
            variant='outline'
          />
          <Button
            title='Create Campaign'
            onPress={handleCreateCampaign}
            variant='primary'
            loading={loading.campaigns}
          />
        </View>
      </View>
    </Modal>
  );

  const renderTemplateModal = () => (
    <Modal
      visible={showTemplateModal}
      animationType='slide'
      {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
      onRequestClose={() => {
        Keyboard.dismiss();
        setShowTemplateModal(false);
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Template</Text>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => {
              Keyboard.dismiss();
              setShowTemplateModal(false);
            }}
          >
            <X size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Template Name *</Text>
            <TextInput
              style={styles.textInput}
              value={templateForm.name}
              onChangeText={text =>
                setTemplateForm(prev => ({ ...prev, name: text }))
              }
              placeholder='Enter template name'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Subject *</Text>
            <TextInput
              style={styles.textInput}
              value={templateForm.subject}
              onChangeText={text =>
                setTemplateForm(prev => ({ ...prev, subject: text }))
              }
              placeholder='Enter email subject'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.categoryOptions}>
              {[
                'general',
                'marketing',
                'operational',
                'transactional',
                'emergency',
              ].map(cat => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryOption,
                    templateForm.category === cat &&
                      styles.categoryOptionSelected,
                  ]}
                  onPress={() =>
                    setTemplateForm(prev => ({ ...prev, category: cat as any }))
                  }
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      templateForm.category === cat &&
                        styles.categoryOptionTextSelected,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HTML Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaLarge]}
              value={templateForm.html_content}
              onChangeText={text =>
                setTemplateForm(prev => ({ ...prev, html_content: text }))
              }
              placeholder='Enter HTML content'
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={10}
              textAlignVertical='top'
            />
          </View>
        </ScrollView>

        <View style={styles.modalActions}>
          <Button
            title='Cancel'
            onPress={() => {
              Keyboard.dismiss();
              setShowTemplateModal(false);
              resetTemplateForm();
            }}
            variant='outline'
          />
          <Button
            title='Create Template'
            onPress={handleCreateTemplate}
            variant='primary'
            loading={loading.templates}
          />
        </View>
      </View>
    </Modal>
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

      {/* Modals */}
      {renderCampaignModal()}
      {renderTemplateModal()}
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

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },

  // Form
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  textAreaLarge: {
    minHeight: 180,
    textAlignVertical: 'top',
    paddingTop: 14,
  },

  // Template Selector
  templateSelectorContent: {
    gap: 8,
    paddingVertical: 4,
  },
  templateOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  templateOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  templateOptionTextSelected: {
    color: 'white',
  },

  // Channel Options
  channelOptions: {
    gap: 12,
  },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  channelOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  channelOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelOptionText: {
    flex: 1,
  },
  channelOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  channelOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  roleSelectionContainer: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  roleOptionTextSelected: {
    color: 'white',
  },

  // Category Options
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  categoryOptionTextSelected: {
    color: 'white',
  },

  // Selection Mode
  selectionModeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  selectionModeOptionActive: {
    backgroundColor: `${colors.primary}15`,
  },
  selectionModeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectionModeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // User Selection
  userSelectionContainer: {
    marginBottom: 16,
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginBottom: 12,
  },
  userSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  selectAllRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAllLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectAllButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectAllButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  userListContainer: {
    height: 280,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  userList: {
    flexGrow: 1,
  },
  userListContent: {
    paddingBottom: 8,
  },
  emptyUserList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyUserListText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}50`,
    gap: 12,
  },
  userItemSelected: {
    backgroundColor: `${colors.primary}08`,
  },
  userCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Trip Selection
  tripSelectionContainer: {
    marginBottom: 16,
  },
  tripSelectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  tripList: {
    maxHeight: 280,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}50`,
    gap: 12,
  },
  tripItemSelected: {
    backgroundColor: `${colors.primary}08`,
  },
  tripCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tripInfo: {
    flex: 1,
  },
  tripRouteName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  tripMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 8,
  },
  tripVessel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tripBookingCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tripBookingCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyTrips: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTripsText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  tripUsersPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: `${colors.success}10`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.success}30`,
  },
  tripUsersPreviewLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.success,
    textAlign: 'center',
  },

  // Recipient Preview
  recipientPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}08`,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    marginTop: 16,
  },
  recipientPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientPreviewInfo: {
    flex: 1,
  },
  recipientPreviewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recipientPreviewCount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default EmailCampaignsTab;
