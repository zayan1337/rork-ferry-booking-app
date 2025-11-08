import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Mail,
  Phone,
  LogOut,
  TrendingUp,
  Users,
  Calendar,
  Award,
  CreditCard,
  BarChart3,
  Clock,
  CheckCircle,
  X,
  Lock,
  ChevronRight,
} from 'lucide-react-native';

import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useAlertContext } from '@/components/AlertProvider';
import { DateSelector } from '@/components/DateSelector';
import StatCard from '@/components/StatCard';
import { CreditSummaryCard } from '@/components/agent';
import { SkeletonAgentInfoSection } from '@/components/skeleton';

import { useAgentData } from '@/hooks/useAgentData';
import { useRefreshControl } from '@/hooks/useRefreshControl';
import { formatAgentInitials, formatCurrency } from '@/utils/agentFormatters';
import { getDashboardStats } from '@/utils/agentDashboard';
import { formatProfileDate } from '@/utils/customerUtils';

type EditableField = 'name' | 'mobile_number' | 'date_of_birth';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function AgentProfileScreen() {
  const router = useRouter();
  const { showConfirmation, showError, showSuccess } = useAlertContext();
  const { signOut, user } = useAuthStore();
  const {
    agent,
    stats,
    localStats,
    creditTransactions,
    bookings,
    clients,
    reset,
    isInitializing,
    isLoadingProfile,
    refreshAgentData,
  } = useAgentData();

  const { isRefreshing, onRefresh } = useRefreshControl({
    onRefresh: refreshAgentData,
  });

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [, forceUpdate] = useState({});

  // Use utility function for processing stats (same as dashboard)
  const displayStats = getDashboardStats(stats, localStats);

  const handleSignOut = async () => {
    try {
      reset(); // Clear agent store
      await signOut();
      // Navigation will be handled by the app layout
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleLogout = () => {
    showConfirmation(
      'Logout',
      'Are you sure you want to log out?',
      handleSignOut,
      undefined,
      false
    );
  };

  const openEditModal = (field: EditableField) => {
    setEditingField(field);
    let currentValue = '';

    switch (field) {
      case 'name':
        currentValue = agent?.name || '';
        break;
      case 'mobile_number':
        currentValue = user?.profile?.mobile_number || '';
        break;
      case 'date_of_birth':
        currentValue = user?.profile?.date_of_birth || '';
        break;
    }

    setEditValue(currentValue);
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setEditingField(null);
    setEditValue('');
    setIsSaving(false);
  };

  const closePasswordModal = () => {
    setIsPasswordModalVisible(false);
    setNewPassword('');
    setConfirmPassword('');
    setIsSaving(false);
  };

  // Local update function that doesn't trigger global auth loading
  const updateProfileLocally = async (updateData: any) => {
    if (!user?.id) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    if (error) throw error;

    // Refresh agent data
    await refreshAgentData();
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editValue.trim()) {
      showError('Error', 'Please enter a valid value');
      return;
    }

    setIsSaving(true);

    try {
      const updateData: any = {};

      switch (editingField) {
        case 'name':
          updateData.full_name = editValue;
          break;
        case 'mobile_number':
          updateData.mobile_number = editValue;
          break;
        case 'date_of_birth':
          updateData.date_of_birth = editValue;
          break;
      }

      await updateProfileLocally(updateData);

      showSuccess('Success', 'Profile updated successfully', () => {
        closeEditModal();
      });
    } catch (error) {
      console.error('Update error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update profile';
      showError('Error', errorMessage);
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      showError('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      showError('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Error', 'New passwords do not match');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showSuccess('Success', 'Password updated successfully', () => {
        closePasswordModal();
      });
    } catch (error) {
      console.error('Password update error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update password';
      showError('Error', errorMessage);
      setIsSaving(false);
    }
  };

  const getFieldLabel = (field: EditableField): string => {
    switch (field) {
      case 'name':
        return 'Full Name';
      case 'mobile_number':
        return 'Mobile Number';
      case 'date_of_birth':
        return 'Date of Birth';
      default:
        return '';
    }
  };

  const agentInitials = formatAgentInitials(agent);

  // Get recent activity summary
  const recentBookings = bookings.slice(0, 5);
  const todayBookings = bookings.filter(
    booking =>
      new Date(booking.bookingDate).toDateString() === new Date().toDateString()
  );

  const renderProfileHeader = () => (
    <Card variant='elevated' style={styles.profileHeaderCard}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{agentInitials}</Text>
          <View style={styles.statusIndicator} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{agent?.name || 'Loading...'}</Text>
          <Text style={styles.agentId}>ID: {agent?.agentId || '...'}</Text>
          <Text style={styles.email}>{agent?.email || '...'}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.activeBadge}>
              <CheckCircle size={12} color='white' />
              <Text style={styles.badgeText}>Active Agent</Text>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );

  const renderStatistics = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Performance Overview</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
      >
        <StatCard
          title='Total Bookings'
          value={displayStats.totalBookings}
          icon={<Calendar size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Active Bookings'
          value={displayStats.activeBookings}
          icon={<Clock size={20} color={Colors.warning} />}
          color={Colors.warning}
        />
        <StatCard
          title='Completed'
          value={displayStats.completedBookings}
          icon={<CheckCircle size={20} color={Colors.success} />}
          color={Colors.success}
        />
        <StatCard
          title='Cancelled'
          value={displayStats.cancelledBookings}
          icon={<X size={20} color={Colors.error} />}
          color={Colors.error}
        />
        <StatCard
          title='Total Clients'
          value={displayStats.uniqueClients}
          icon={<Users size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Revenue'
          value={formatCurrency(displayStats.totalRevenue)}
          icon={<TrendingUp size={20} color={Colors.primary} />}
        />
        <StatCard
          title='Commission'
          value={formatCurrency(displayStats.totalCommission)}
          icon={<Award size={20} color={Colors.primary} />}
        />
      </ScrollView>
    </View>
  );

  const renderDetailedInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Agent Details</Text>

      <Card variant='outlined' style={styles.detailsCard}>
        <View style={styles.detailsGrid}>
          <Pressable
            style={styles.detailItem}
            onPress={() => openEditModal('name')}
          >
            <User size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{agent?.name}</Text>
            </View>
            <ChevronRight size={18} color={Colors.subtext} />
          </Pressable>

          <View style={styles.detailItem}>
            <Mail size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{agent?.email}</Text>
            </View>
          </View>

          <Pressable
            style={styles.detailItem}
            onPress={() => openEditModal('mobile_number')}
          >
            <Phone size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Mobile Number</Text>
              <Text style={styles.detailValue}>
                {user?.profile?.mobile_number || 'Not set'}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.subtext} />
          </Pressable>

          <Pressable
            style={styles.detailItem}
            onPress={() => openEditModal('date_of_birth')}
          >
            <Calendar size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date of Birth</Text>
              <Text style={styles.detailValue}>
                {formatProfileDate(user?.profile?.date_of_birth || '')}
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.subtext} />
          </Pressable>

          <View style={styles.detailItem}>
            <CreditCard size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Agent ID</Text>
              <Text style={styles.detailValue}>{agent?.agentId}</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <BarChart3 size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Discount Rate</Text>
              <Text style={styles.detailValue}>{agent?.discountRate}%</Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Award size={18} color={Colors.subtext} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Free Tickets</Text>
              <Text style={styles.detailValue}>
                {agent?.freeTicketsRemaining || 0} /{' '}
                {agent?.freeTicketsAllocation || 0}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </View>
  );

  const renderCreditSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Credit Management</Text>
      <CreditSummaryCard
        agent={agent}
        transactions={creditTransactions}
        onRequestCredit={() => router.push('/(app)/(agent)/(tabs)/credit')}
      />
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionsGrid}>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/agent-booking/new')}
        >
          <Calendar size={24} color={Colors.primary} />
          <Text style={styles.actionText}>New Booking</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/(tabs)/clients')}
        >
          <Users size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Manage Clients</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/(tabs)/bookings')}
        >
          <BarChart3 size={24} color={Colors.primary} />
          <Text style={styles.actionText}>View Reports</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => router.push('/(app)/(agent)/(tabs)/credit')}
        >
          <CreditCard size={24} color={Colors.primary} />
          <Text style={styles.actionText}>Credit History</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Settings</Text>

      <Card variant='outlined' style={styles.settingsCard}>
        <Pressable
          style={styles.settingRow}
          onPress={() => setIsPasswordModalVisible(true)}
        >
          <Lock size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Change Password</Text>
          <ChevronRight size={18} color={Colors.subtext} />
        </Pressable>

        {/* Hidden sections - No functionality yet
        <View style={styles.settingDivider} />

        <Pressable style={styles.settingRow}>
          <Bell size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Notifications</Text>
        </Pressable>

        <View style={styles.settingDivider} />

        <Pressable style={styles.settingRow}>
          <Shield size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Privacy & Security</Text>
        </Pressable>

        <View style={styles.settingDivider} />

        <Pressable style={styles.settingRow}>
          <HelpCircle size={20} color={Colors.primary} />
          <Text style={styles.settingText}>Help & Support</Text>
        </Pressable>
        */}
      </Card>
    </View>
  );

  if ((isInitializing || isLoadingProfile) && !agent) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <SkeletonAgentInfoSection delay={0} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      {renderProfileHeader()}
      {renderStatistics()}
      {renderCreditSection()}
      {renderDetailedInfo()}
      {renderQuickActions()}
      {renderSettings()}

      {/* Logout Button */}
      <Button
        title='Log Out'
        onPress={handleLogout}
        variant='outline'
        icon={<LogOut size={20} color={Colors.primary} />}
        style={styles.logoutButton}
      />

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType='slide'
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit {getFieldLabel(editingField!)}
              </Text>
              <Pressable onPress={closeEditModal}>
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              {editingField === 'date_of_birth' ? (
                <DateSelector
                  label='Date of Birth'
                  value={editValue}
                  onChange={setEditValue}
                  maxDate={new Date().toISOString().split('T')[0]}
                  isDateOfBirth={true}
                />
              ) : (
                <Input
                  value={editValue}
                  onChangeText={setEditValue}
                  placeholder={`Enter ${getFieldLabel(editingField!)}`}
                  keyboardType={
                    editingField === 'mobile_number' ? 'phone-pad' : 'default'
                  }
                  autoCapitalize='words'
                />
              )}
            </View>

            <View style={styles.modalFooter}>
              <Button
                title='Cancel'
                variant='outline'
                onPress={closeEditModal}
                style={styles.modalButton}
                disabled={isSaving}
              />
              <Button
                title={isSaving ? 'Saving...' : 'Save'}
                onPress={handleSaveEdit}
                style={styles.modalButton}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={isPasswordModalVisible}
        animationType='slide'
        transparent={true}
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={closePasswordModal}>
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Input
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder='New Password'
                secureTextEntry
                autoCapitalize='none'
              />
              <View style={styles.inputSpacing} />
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder='Confirm New Password'
                secureTextEntry
                autoCapitalize='none'
              />
              <Text style={styles.passwordHint}>
                Password must be at least 6 characters long
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title='Cancel'
                variant='outline'
                onPress={closePasswordModal}
                style={styles.modalButton}
                disabled={isSaving}
              />
              <Button
                title={isSaving ? 'Updating...' : 'Update Password'}
                onPress={handlePasswordChange}
                style={styles.modalButton}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  profileHeaderCard: {
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  agentId: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statsScrollContainer: {
    paddingRight: 16,
  },
  detailsCard: {
    padding: 0,
  },
  detailsGrid: {
    padding: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.subtext,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: isTablet ? '22%' : '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  settingsCard: {
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: Colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
  inputSpacing: {
    height: 16,
  },
  passwordHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
