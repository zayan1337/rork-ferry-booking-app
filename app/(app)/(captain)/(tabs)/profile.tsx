import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import {
  User,
  Mail,
  LogOut,
  Ship,
  CheckCircle,
  Clock,
  Anchor,
  Phone,
  Award,
  TrendingUp,
  ChevronRight,
  X,
  Lock,
  Calendar,
} from 'lucide-react-native';
import { Stack, useFocusEffect } from 'expo-router';

import { useAuthStore } from '@/store/authStore';
import { useCaptainStore } from '@/store/captainStore';
import { supabase } from '@/utils/supabase';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { DateSelector } from '@/components/DateSelector';
import StatCard from '@/components/StatCard';
import { formatProfileDate } from '@/utils/customerUtils';
import { useAlertContext } from '@/components/AlertProvider';

type EditableField = 'full_name' | 'mobile_number' | 'date_of_birth';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth > 768;

export default function CaptainProfileScreen() {
  const { user, signOut, deleteAccount } = useAuthStore();
  const {
    profile,
    dashboardStats,
    loading,
    error,
    fetchProfile,
    fetchTodayTrips,
    fetchDashboardStats,
  } = useCaptainStore();
  const { showError, showSuccess, showConfirmation } = useAlertContext();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [, forceUpdate] = useState({});

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      fetchProfile(),
      fetchTodayTrips(),
      fetchDashboardStats(),
    ]);
  }, [fetchProfile, fetchTodayTrips, fetchDashboardStats]);

  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  const handleSignOut = () => {
    showConfirmation(
      'Sign Out',
      'Are you sure you want to sign out?',
      () => signOut(),
      undefined,
      true // Mark as destructive action
    );
  };

  const openDeleteModal = () => {
    setDeleteEmailInput('');
    setIsDeleteModalVisible(true);
  };

  const handleDeleteAccount = async () => {
    if (!user?.email) {
      showError('Error', 'Unable to verify your account email.');
      return;
    }

    if (!deleteEmailInput.trim()) {
      showError('Verification Failed', 'Please enter your email to confirm.');
      return;
    }

    if (deleteEmailInput.trim().toLowerCase() !== user.email.toLowerCase()) {
      showError(
        'Verification Failed',
        'Email does not match. Account deletion cancelled.'
      );
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      setIsDeleteModalVisible(false);
      showSuccess(
        'Account Deleted',
        'Your account has been scheduled for deletion.'
      );
    } catch (error) {
      console.error('Delete account error:', error);
      showError(
        'Deletion Failed',
        error instanceof Error ? error.message : 'Unable to delete account.'
      );
    } finally {
      setIsDeleting(false);
      setDeleteEmailInput('');
    }
  };

  const handleNavigation = (screen: string) => {
    router.push(screen as any);
  };

  const openEditModal = (field: EditableField) => {
    setEditingField(field);
    let currentValue = '';

    switch (field) {
      case 'full_name':
        currentValue = user?.profile?.full_name || '';
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

    // Refresh captain profile
    await fetchProfile();
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
        case 'full_name':
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

      showSuccess('Success', 'Profile updated successfully');
      closeEditModal();
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

      showSuccess('Success', 'Password updated successfully');
      closePasswordModal();
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
      case 'full_name':
        return 'Full Name';
      case 'mobile_number':
        return 'Mobile Number';
      case 'date_of_birth':
        return 'Date of Birth';
      default:
        return '';
    }
  };

  if (loading.profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={loading.profile}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <Stack.Screen options={{ title: 'Settings' }} />

      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color={Colors.primary} />
            </View>
            <View style={styles.statusBadge}>
              <CheckCircle size={12} color={Colors.success} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile?.full_name || user?.email || 'Captain'}
            </Text>
            <Text style={styles.profileRole}>Ferry Captain</Text>
            <View style={styles.profileMeta}>
              <Mail size={14} color={Colors.textSecondary} />
              <Text style={styles.profileEmail}>
                {profile?.email || user?.email}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Personal Details */}
      <Card style={styles.detailsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <User size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Personal Details</Text>
        </View>

        <Pressable
          style={styles.detailItem}
          onPress={() => openEditModal('full_name')}
        >
          <User size={18} color={Colors.textSecondary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>
              {user?.profile?.full_name || 'Not set'}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.detailItem}>
          <Mail size={18} color={Colors.textSecondary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>
              {profile?.email || user?.email}
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.detailItem}
          onPress={() => openEditModal('mobile_number')}
        >
          <Phone size={18} color={Colors.textSecondary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Mobile Number</Text>
            <Text style={styles.detailValue}>
              {user?.profile?.mobile_number || 'Not set'}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.detailItem}
          onPress={() => openEditModal('date_of_birth')}
        >
          <Calendar size={18} color={Colors.textSecondary} />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Date of Birth</Text>
            <Text style={styles.detailValue}>
              {formatProfileDate(user?.profile?.date_of_birth || '')}
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textSecondary} />
        </Pressable>
      </Card>

      {/* Today's Performance */}
      <Card style={styles.performanceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <TrendingUp size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Today's Performance</Text>
        </View>
        {loading.stats ? (
          <View style={styles.loadingStats}>
            <ActivityIndicator size='small' color={Colors.primary} />
            <Text style={styles.loadingStatsText}>
              Loading performance data...
            </Text>
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='Trips'
                value={dashboardStats?.todayTrips?.toString() || '0'}
                icon={<Ship size={16} color={Colors.primary} />}
                color={Colors.primary}
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='Passengers'
                value={dashboardStats?.totalPassengers?.toString() || '0'}
                icon={<User size={16} color={Colors.success} />}
                color={Colors.success}
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='On Time'
                value={`${dashboardStats?.onTimePercentage || 100}%`}
                icon={<Clock size={16} color={Colors.warning} />}
                color={Colors.warning}
              />
            </View>
            <View style={styles.statCardWrapper}>
              <StatCard
                title='Checked In'
                value={dashboardStats?.checkedInPassengers?.toString() || '0'}
                icon={<Award size={16} color={Colors.success} />}
                color={Colors.success}
              />
            </View>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Anchor size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsList}>
          <Pressable
            style={styles.actionItem}
            onPress={() => handleNavigation('/(captain)/(tabs)/')}
          >
            <View style={styles.actionIcon}>
              <Anchor size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Dashboard</Text>
              <Text style={styles.actionSubtitle}>View today's overview</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.actionItem}
            onPress={() => handleNavigation('/(captain)/(tabs)/trips')}
          >
            <View style={styles.actionIcon}>
              <Ship size={20} color={Colors.primary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>My Trips</Text>
              <Text style={styles.actionSubtitle}>Manage assigned trips</Text>
            </View>
          </Pressable>

          <Pressable
            style={styles.actionItem}
            onPress={() => handleNavigation('/(captain)/(tabs)/checkin')}
          >
            <View style={styles.actionIcon}>
              <CheckCircle size={20} color={Colors.success} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Check-in</Text>
              <Text style={styles.actionSubtitle}>Scan passenger tickets</Text>
            </View>
          </Pressable>
        </View>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Lock size={20} color={Colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Account Settings</Text>
        </View>
        <View style={styles.settingsList}>
          <Pressable
            style={styles.settingItem}
            onPress={() => setIsPasswordModalVisible(true)}
          >
            <Lock size={20} color={Colors.textSecondary} />
            <View style={styles.settingContent}>
              <Text style={styles.settingText}>Change Password</Text>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} />
          </Pressable>

          {/* Hidden sections - No functionality yet
          <Pressable style={styles.settingItem}>
            <Bell size={20} color={Colors.textSecondary} />
            <Text style={styles.settingText}>Notifications</Text>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <Shield size={20} color={Colors.textSecondary} />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </Pressable>

          <Pressable style={styles.settingItem}>
            <HelpCircle size={20} color={Colors.textSecondary} />
            <Text style={styles.settingText}>Help & Support</Text>
          </Pressable>
          */}
        </View>
      </Card>

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDescription}>
          Permanently delete your account and remove personal data. This action
          cannot be undone.
        </Text>
        <Button
          title='Delete Account'
          onPress={openDeleteModal}
          style={styles.deleteButton}
          textStyle={styles.deleteButtonText}
          fullWidth
        />
      </View>

      {/* Sign Out */}
      <View style={styles.signOutContainer}>
        <Button
          title='Sign Out'
          variant='outline'
          onPress={handleSignOut}
          icon={<LogOut size={18} color={Colors.error} />}
          style={styles.signOutButton}
          textStyle={{ color: Colors.error }}
        />
      </View>

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

      {/* Delete Account Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType='slide'
        transparent={true}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Deletion</Text>
              <Pressable onPress={() => setIsDeleteModalVisible(false)}>
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalInstruction}>
                Enter your account email ({user?.email}) to confirm permanent
                deletion. This cannot be undone.
              </Text>
              <Input
                value={deleteEmailInput}
                onChangeText={setDeleteEmailInput}
                placeholder='Enter your email'
                autoCapitalize='none'
                keyboardType='email-address'
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title='Cancel'
                variant='outline'
                onPress={() => setIsDeleteModalVisible(false)}
                style={styles.modalButton}
                disabled={isDeleting}
              />
              <Button
                title='Delete'
                onPress={handleDeleteAccount}
                style={styles.modalButton}
                textStyle={styles.deleteButtonText}
                loading={isDeleting}
                disabled={isDeleting}
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  profileCard: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.card,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
  performanceCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isTablet ? 16 : 8,
  },
  statCardWrapper: {
    width: isTablet ? '22%' : '48%',
    marginBottom: 12,
  },
  loadingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingStatsText: {
    marginLeft: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  actionsCard: {
    marginBottom: 16,
  },
  actionsList: {
    gap: 0,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  settingsCard: {
    marginBottom: 16,
  },
  settingsList: {
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingContent: {
    flex: 1,
    marginLeft: 16,
  },
  settingText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 16,
  },
  signOutContainer: {
    marginTop: 16,
  },
  signOutButton: {
    borderColor: Colors.error,
  },
  dangerSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  deleteButton: {
    borderColor: Colors.error,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  detailsCard: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailContent: {
    flex: 1,
    marginLeft: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
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
  modalInstruction: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
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
