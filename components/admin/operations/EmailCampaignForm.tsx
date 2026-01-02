import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  useEmailCampaignStore,
  SelectableUser,
} from '@/store/admin/emailCampaignStore';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAlertContext } from '@/components/AlertProvider';
import Button from '@/components/admin/Button';
import {
  Mail,
  Bell,
  Users,
  Target,
  User,
  Ship,
  Search,
  CheckCircle,
  CheckSquare,
  Square,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { TargetCriteria, UserRole, EmailCampaign } from '@/types/emailCampaign';

interface EmailCampaignFormProps {
  campaign?: EmailCampaign;
  onSuccess: () => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const EmailCampaignForm: React.FC<EmailCampaignFormProps> = ({
  campaign,
  onSuccess,
  onError,
  onCancel,
}) => {
  const {
    templates,
    loading,
    error,
    recipientPreviewCount,
    availableUsers,
    availableTrips,
    fetchTemplates,
    createCampaign,
    updateCampaign,
    previewRecipientCount,
    fetchAvailableUsers,
    fetchAvailableTrips,
    fetchUsersForTrip,
  } = useEmailCampaignStore();

  const { routes, vessels } = useAdminStore();
  const { showSuccess, showError } = useAlertContext();

  // User selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedTrips, setSelectedTrips] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState<
    'all' | 'roles' | 'users' | 'trips'
  >('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Campaign form state
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    subject: campaign?.subject || '',
    html_content: campaign?.html_content || '',
    template_id: campaign?.template_id || '',
    send_email: campaign?.send_email ?? true,
    send_notification: campaign?.send_notification ?? false,
    target_criteria: {
      roles: (campaign?.target_criteria?.roles || []) as UserRole[],
      routes: campaign?.target_criteria?.routes || [],
      vessels: campaign?.target_criteria?.vessels || [],
      allUsers: campaign?.target_criteria?.allUsers ?? false,
      selectedUserIds: campaign?.target_criteria?.selectedUserIds || [],
      selectedTripIds: campaign?.target_criteria?.selectedTripIds || [],
    } as TargetCriteria,
  });

  // Load data on mount
  useEffect(() => {
    fetchTemplates();
    fetchAvailableUsers();
    fetchAvailableTrips();
  }, []);

  // Initialize selection state from campaign data
  useEffect(() => {
    if (campaign?.target_criteria) {
      if (campaign.target_criteria.selectedUserIds?.length) {
        setSelectedUsers(new Set(campaign.target_criteria.selectedUserIds));
        setSelectionMode('users');
      } else if (campaign.target_criteria.selectedTripIds?.length) {
        setSelectedTrips(new Set(campaign.target_criteria.selectedTripIds));
        setSelectionMode('trips');
      } else if (campaign.target_criteria.roles?.length) {
        setSelectionMode('roles');
      } else if (campaign.target_criteria.allUsers) {
        setSelectionMode('all');
      }
    }
  }, [campaign]);

  // Search users with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery) {
        fetchAvailableUsers(userSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery]);

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
        setSelectedUsers(prev => {
          const newSet = new Set(prev);
          allTripUsers.forEach(user => newSet.add(user.id));
          return newSet;
        });
      }
    };
    loadTripUsers();
  }, [selectedTrips]);

  // Preview recipient count when criteria changes
  useEffect(() => {
    const timer = setTimeout(() => {
      previewRecipientCount(formData.target_criteria);
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.target_criteria]);

  // Update target criteria when selection changes
  useEffect(() => {
    if (selectionMode === 'users' || selectionMode === 'trips') {
      setFormData(prev => ({
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

  const handleSelectionModeChange = (
    mode: 'all' | 'roles' | 'users' | 'trips'
  ) => {
    setSelectionMode(mode);
    if (mode === 'all') {
      setFormData(prev => ({
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
      setFormData(prev => ({
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
      setFormData(prev => ({
        ...prev,
        target_criteria: {
          ...prev.target_criteria,
          allUsers: false,
          roles: [],
        },
      }));
      setSelectedTrips(new Set());
    } else if (mode === 'trips') {
      setFormData(prev => ({
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

  const toggleRole = (role: UserRole) => {
    setFormData(prev => {
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

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError('Validation Error', 'Please enter a campaign name.');
      return;
    }

    if (!formData.subject.trim()) {
      showError('Validation Error', 'Please enter an email subject.');
      return;
    }

    if (!formData.send_email && !formData.send_notification) {
      showError(
        'Validation Error',
        'Please select at least one channel (email or notification).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = campaign
        ? await updateCampaign(campaign.id, {
            name: formData.name,
            subject: formData.subject,
            html_content: formData.html_content,
            send_email: formData.send_email,
            send_notification: formData.send_notification,
            target_criteria: formData.target_criteria,
          })
        : await createCampaign({
            name: formData.name,
            subject: formData.subject,
            html_content: formData.html_content,
            template_id: formData.template_id || undefined,
            send_email: formData.send_email,
            send_notification: formData.send_notification,
            target_criteria: formData.target_criteria,
          });

      if (result) {
        showSuccess(
          'Success',
          campaign
            ? 'Campaign updated successfully!'
            : 'Campaign created successfully!'
        );
        onSuccess();
      } else {
        onError(error || 'Failed to save campaign.');
      }
    } catch (err: any) {
      onError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Campaign Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaign Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Campaign Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, name: text }))
              }
              placeholder='Enter campaign name'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Subject *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.subject}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, subject: text }))
              }
              placeholder='Enter email subject'
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Template Selection */}
          {templates.length > 0 && !campaign && (
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
                      formData.template_id === template.id &&
                        styles.templateOptionSelected,
                    ]}
                    onPress={() => {
                      setFormData(prev => ({
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
                        formData.template_id === template.id &&
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

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Message Content *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={formData.html_content}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, html_content: text }))
              }
              placeholder='Enter message content (HTML supported)'
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
              textAlignVertical='top'
            />
          </View>
        </View>

        {/* Channels Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Channels</Text>

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
                value={formData.send_email}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, send_email: value }))
                }
                trackColor={{
                  false: colors.border,
                  true: `${colors.primary}50`,
                }}
                thumbColor={formData.send_email ? colors.primary : colors.card}
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
                value={formData.send_notification}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, send_notification: value }))
                }
                trackColor={{
                  false: colors.border,
                  true: `${colors.warning}50`,
                }}
                thumbColor={
                  formData.send_notification ? colors.warning : colors.card
                }
              />
            </View>
          </View>
        </View>

        {/* Target Audience Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Audience</Text>

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
                {(['customer', 'agent', 'admin', 'captain'] as UserRole[]).map(
                  role => (
                    <Pressable
                      key={role}
                      style={[
                        styles.roleOption,
                        formData.target_criteria.roles?.includes(role) &&
                          styles.roleOptionSelected,
                      ]}
                      onPress={() => toggleRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          formData.target_criteria.roles?.includes(role) &&
                            styles.roleOptionTextSelected,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>
          )}

          {/* Individual User Selection */}
          {selectionMode === 'users' && (
            <View style={styles.userSelectionContainer}>
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
                    <Text style={styles.emptyUserListText}>No users found</Text>
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
                          selectedUsers.has(user.id) && styles.userItemSelected,
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
                          <Text style={styles.userName}>{user.full_name}</Text>
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

      {/* Actions */}
      <View style={styles.actions}>
        <Button title='Cancel' onPress={onCancel} variant='outline' />
        <Button
          title={campaign ? 'Update Campaign' : 'Create Campaign'}
          onPress={handleSubmit}
          variant='primary'
          loading={isSubmitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.backgroundSecondary,
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
  channelOptions: {
    gap: 12,
  },
  channelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
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
  selectionModeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
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
  userSelectionContainer: {
    marginBottom: 16,
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
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
    backgroundColor: colors.backgroundSecondary,
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
    backgroundColor: colors.backgroundSecondary,
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
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
});

export default EmailCampaignForm;
