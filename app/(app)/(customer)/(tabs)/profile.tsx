import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  Keyboard,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Input from '@/components/Input';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { getUserInitials, formatProfileDate } from '@/utils/customerUtils';
import { useAlertContext } from '@/components/AlertProvider';

type EditableField = 'full_name' | 'mobile_number' | 'date_of_birth';

export default function ProfileScreen() {
  const {
    user,
    signOut,
    isLoading,
    error,
    deleteAccount,
    isGuestMode,
    isAuthenticated,
  } = useAuthStore();
  const { showError, showSuccess, showConfirmation } = useAlertContext();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (error) {
      showError('Error', error);
    }
  }, [error, showError]);

  // Dismiss keyboard when modals close on iOS
  useEffect(() => {
    if (
      !isEditModalVisible &&
      !isPasswordModalVisible &&
      !isDeleteModalVisible
    ) {
      Keyboard.dismiss();
    }
  }, [isEditModalVisible, isPasswordModalVisible, isDeleteModalVisible]);

  const isGuestView = isGuestMode || !isAuthenticated || !user;

  const handleLoginNavigation = () => {
    router.push('/(auth)' as any);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={Colors.primary} />
      </View>
    );
  }

  if (isGuestView) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>
              {getUserInitials('Guest')}
            </Text>
          </View>
          <Text style={styles.profileName}>Guest User</Text>
          <Text style={styles.profileUsername}>
            Sign in to complete your profile
          </Text>
        </View>

        <Card variant='elevated' style={styles.section}>
          <Text style={styles.sectionTitle}>Why create an account?</Text>
          <Text style={styles.guestInfoText}>
            {'\u2022 Manage bookings and passenger details\n'}
            {'\u2022 Save your contact information for faster checkout\n'}
            {'\u2022 Access tickets, invoices, and travel history'}
          </Text>
        </Card>

        <Button
          title='Sign In or Create Account'
          onPress={handleLoginNavigation}
          fullWidth
        />
      </ScrollView>
    );
  }

  const handleLogout = () => {
    showConfirmation(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        try {
          await signOut();
          // Navigation will be handled by the app layout
        } catch (error) {
          console.error('Logout error:', error);
        }
      },
      undefined,
      true // Mark as destructive action
    );
  };

  const openDeleteModal = () => {
    setDeleteEmailInput('');
    setIsDeleteModalVisible(true);
  };

  const handleDeleteAccount = async () => {
    if (
      !deleteEmailInput ||
      deleteEmailInput.trim().toLowerCase() !==
        (user?.email || '').toLowerCase()
    ) {
      showError(
        'Verification Failed',
        'Email does not match. Account deletion cancelled.'
      );
      return;
    }

    try {
      await deleteAccount();
      setIsDeleteModalVisible(false);
      showSuccess(
        'Account Deleted',
        'Your account has been permanently deleted.'
      );
    } catch (error) {
      console.error('Delete account error:', error);
      showError(
        'Deletion Failed',
        error instanceof Error
          ? error.message
          : 'Unable to delete account right now.'
      );
    }
  };

  /* Unused functions - Hidden
  const updateProfileSetting = (key: keyof ProfileSettings, value: boolean) => {
    setProfileSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleExportCSV = () => {
    Alert.alert(
      'Export Data',
      'Your data will be exported as CSV and sent to your email address.',
      [{ text: 'OK' }]
    );
  };

  const handleExportPDF = () => {
    Alert.alert(
      'Export Data',
      'Your data will be exported as PDF and sent to your email address.',
      [{ text: 'OK' }]
    );
  };
  */

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
    Keyboard.dismiss();
    setIsEditModalVisible(false);
    setEditingField(null);
    setEditValue('');
    setIsSaving(false);
  };

  const closePasswordModal = () => {
    Keyboard.dismiss();
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

    // Fetch updated profile
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (updatedProfile && user.profile) {
      // Update profile fields directly
      Object.assign(user.profile, updatedProfile);
      // Force re-render
      forceUpdate({});
    }
  };

  const handleSaveEdit = async () => {
    if (!editingField || !editValue.trim()) {
      showError('Error', 'Please enter a valid value');
      return;
    }

    setIsSaving(true);

    try {
      // Update profile fields
      const updateData: any = {};
      updateData[editingField] = editValue;

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>
            {getUserInitials(user?.profile?.full_name)}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user?.profile?.full_name || 'Guest User'}
        </Text>
        <Text style={styles.profileUsername}>
          {user?.email || 'guest@example.com'}
        </Text>
      </View>

      <Card variant='elevated' style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <Pressable
          style={styles.infoItem}
          onPress={() => openEditModal('full_name')}
        >
          <View style={styles.infoIcon}>
            <User size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.profile?.full_name}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </Pressable>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Mail size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
        </View>

        <Pressable
          style={styles.infoItem}
          onPress={() => openEditModal('mobile_number')}
        >
          <View style={styles.infoIcon}>
            <Phone size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoValue}>{user?.profile?.mobile_number}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </Pressable>

        <Pressable
          style={styles.infoItem}
          onPress={() => openEditModal('date_of_birth')}
        >
          <View style={styles.infoIcon}>
            <Calendar size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>
              {formatProfileDate(user?.profile?.date_of_birth || '')}
            </Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </Pressable>
      </Card>

      <Card variant='elevated' style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <Pressable
          style={styles.settingItem}
          onPress={() => setIsPasswordModalVisible(true)}
        >
          <View style={styles.settingIcon}>
            <Lock size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Change Password</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </Pressable>

        {/* Notification Settings - Hidden
        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
          </View>
          <Switch
            value={profileSettings.emailNotifications}
            onValueChange={value =>
              updateProfileSetting('emailNotifications', value)
            }
            trackColor={{ false: Colors.inactive, true: Colors.primary }}
            thumbColor={Colors.card}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>SMS Notifications</Text>
          </View>
          <Switch
            value={profileSettings.smsNotifications}
            onValueChange={value =>
              updateProfileSetting('smsNotifications', value)
            }
            trackColor={{ false: Colors.inactive, true: Colors.primary }}
            thumbColor={Colors.card}
          />
        </View>
        */}
      </Card>

      {/* Export Data Section - Hidden
      <Card variant='elevated' style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <Text style={styles.exportText}>
          Download your booking history and personal information
        </Text>
        <View style={styles.exportButtons}>
          <Button
            title='Export as CSV'
            variant='outline'
            size='small'
            style={styles.exportButton}
            onPress={handleExportCSV}
          />
          <Button
            title='Export as PDF'
            variant='outline'
            size='small'
            style={styles.exportButton}
            onPress={handleExportPDF}
          />
        </View>
      </Card>
      */}

      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerDescription}>
          Permanently delete your account. This will remove your personal
          information and you will lose access to your account immediately. This
          action cannot be undone.
        </Text>
        <Text style={styles.dangerNote}>
          Note: Booking records may be retained for legal compliance purposes,
          but will not contain your personal information.
        </Text>
        <Button
          title='Delete Account'
          onPress={openDeleteModal}
          style={styles.deleteButton}
          textStyle={styles.deleteButtonText}
          fullWidth
        />
      </View>

      <Button
        title='Logout'
        variant='outline'
        onPress={handleLogout}
        style={styles.logoutButton}
        textStyle={styles.logoutButtonText}
        fullWidth
      />

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType='slide'
        transparent={true}
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
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
                <CalendarDatePicker
                  label='Date of Birth'
                  value={editValue}
                  onChange={setEditValue}
                  maxDate={new Date().toISOString().split('T')[0]}
                  placeholder='Select date of birth'
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
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
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

      {/* Delete Account Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType='slide'
        transparent={true}
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
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
                account deletion.
              </Text>
              <Text style={styles.modalWarning}>
                This will permanently delete your account and remove your
                personal information. You will lose access immediately and this
                action cannot be undone.
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
              />
              <Button
                title='Delete'
                onPress={handleDeleteAccount}
                style={styles.modalButton}
                textStyle={styles.deleteButtonText}
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.card,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIcon: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  /* Unused styles - Hidden
  exportText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  */
  dangerSection: {
    marginTop: 16,
    marginBottom: 8,
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
    backgroundColor: Colors.card,
  },
  deleteButtonText: {
    color: Colors.error,
  },
  logoutButton: {
    marginTop: 8,
    borderColor: Colors.error,
  },
  logoutButtonText: {
    color: Colors.error,
  },
  guestInfoText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  dangerNote: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 8,
    fontWeight: '600',
  },
  modalWarning: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 12,
    lineHeight: 18,
  },
});
