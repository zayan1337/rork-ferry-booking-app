import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAuthStore } from '@/store/authStore';
import { useAlertContext } from '@/components/AlertProvider';
import { supabase } from '@/utils/supabase';
import {
  User,
  Mail,
  Shield,
  Lock,
  LogOut,
  X,
  Phone,
  Activity,
  ChevronRight,
  Calendar,
} from 'lucide-react-native';
import Button from '@/components/admin/Button';
import Input from '@/components/Input';
import { DateSelector } from '@/components/DateSelector';
import { formatProfileDate } from '@/utils/customerUtils';

type EditableField = 'full_name' | 'mobile_number' | 'date_of_birth';

export default function AdminProfileModal() {
  const { user, signOut } = useAuthStore();
  const { showError, showSuccess, showConfirmation } = useAlertContext();
  const [refreshing, setRefreshing] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    // Add refresh logic here if needed
    setTimeout(() => setRefreshing(false), 1000);
  };

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
      false
    );
  };

  const getInitials = (name: string) => {
    return name
      ? name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'AD';
  };

  const openEditModal = (field: EditableField) => {
    setEditingField(field);
    let currentValue = '';

    switch (field) {
      case 'full_name':
        currentValue = adminProfile?.full_name || '';
        break;
      case 'mobile_number':
        currentValue = adminProfile?.mobile_number || '';
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

    // Trigger a refresh
    await handleRefresh();
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

  const adminProfile = user?.profile;
  const adminName =
    adminProfile?.full_name ||
    (user?.email ? user.email.split('@')[0] : '') ||
    'Admin';
  const adminEmail = user?.email || '';
  const adminRole = adminProfile?.role || 'admin';

  return (
    <ScrollView
      style={styles.container}
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
      <Stack.Screen
        options={{
          title: 'Admin Profile',
          presentation: 'modal',
          headerRight: () => (
            <Pressable onPress={() => router.back()}>
              <X size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      {/* Profile Header */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{getInitials(adminName)}</Text>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: colors.success },
            ]}
          />
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.name}>{adminName}</Text>
          <Text style={styles.email}>{adminEmail}</Text>
          <View style={styles.roleBadge}>
            <Shield size={14} color='white' />
            <Text style={styles.roleText}>{adminRole.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Admin Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Details</Text>
        <View style={styles.detailsCard}>
          <Pressable
            style={styles.detailItem}
            onPress={() => openEditModal('full_name')}
          >
            <User size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>
                {adminProfile?.full_name || adminName}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.detailItem}>
            <Mail size={20} color={colors.secondary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{adminEmail}</Text>
            </View>
          </View>

          <Pressable
            style={styles.detailItem}
            onPress={() => openEditModal('mobile_number')}
          >
            <Phone size={20} color={colors.warning} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>
                {adminProfile?.mobile_number || 'Not provided'}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>

          <Pressable
            style={styles.detailItem}
            onPress={() => openEditModal('date_of_birth')}
          >
            <Calendar size={20} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date of Birth</Text>
              <Text style={styles.detailValue}>
                {formatProfileDate(user?.profile?.date_of_birth || '')}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.detailItem}>
            <Shield size={20} color={colors.danger} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Role & Permissions</Text>
              <Text style={styles.detailValue}>
                {adminRole === 'admin' ? 'Full Admin Access' : 'Captain Access'}
              </Text>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Activity size={20} color={colors.success} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Account Status</Text>
              <Text style={[styles.detailValue, { color: colors.success }]}>
                Active
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <Pressable
          style={styles.actionCard}
          onPress={() => setIsPasswordModalVisible(true)}
        >
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Lock size={20} color={colors.danger} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionDescription}>
                Update your account password
              </Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </View>
        </Pressable>

        {/* Hidden sections - No functionality yet
        <Pressable style={styles.actionCard}>
          <View style={styles.actionContent}>
            <View style={styles.actionIconContainer}>
              <Bell size={20} color={colors.warning} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Notifications</Text>
              <Text style={styles.actionDescription}>
                Manage alerts and notifications
              </Text>
            </View>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </Pressable>
        */}
      </View>

      {/* System Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Information</Text>
        <View style={styles.systemCard}>
          <View style={styles.systemItem}>
            <Text style={styles.systemLabel}>App Version</Text>
            <Text style={styles.systemValue}>1.0.0</Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemLabel}>Last Login</Text>
            <Text style={styles.systemValue}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemLabel}>Database Status</Text>
            <Text style={[styles.systemValue, { color: colors.success }]}>
              Connected
            </Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <Button
          title='Logout'
          variant='danger'
          icon={<LogOut size={20} color='white' />}
          onPress={handleLogout}
          fullWidth
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
                <X size={24} color={colors.text} />
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
                variant='secondary'
                onPress={closeEditModal}
                disabled={isSaving}
              />
              <Button
                title={isSaving ? 'Saving...' : 'Save'}
                variant='primary'
                onPress={handleSaveEdit}
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
                <X size={24} color={colors.text} />
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
                variant='secondary'
                onPress={closePasswordModal}
                disabled={isSaving}
              />
              <Button
                title={isSaving ? 'Updating...' : 'Update Password'}
                variant='primary'
                onPress={handlePasswordChange}
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
    backgroundColor: colors.backgroundSecondary,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.card,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  systemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  systemItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  systemLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  systemValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  logoutContainer: {
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  inputSpacing: {
    height: 16,
  },
  passwordHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
