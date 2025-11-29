import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { Shield, X, CheckCircle, AlertCircle, Ban } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import { UserProfile } from '@/types/userManagement';
import Button from '@/components/admin/Button';

interface UserStatusManagerProps {
  user: UserProfile;
  visible: boolean;
  onClose: () => void;
  onStatusUpdate: (
    status: 'active' | 'inactive' | 'suspended'
  ) => Promise<void>;
}

export default function UserStatusManager({
  user,
  visible,
  onClose,
  onStatusUpdate,
}: UserStatusManagerProps) {
  const { showError } = useAlertContext();
  const [updating, setUpdating] = useState(false);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={24} color={colors.success} />;
      case 'suspended':
        return <AlertCircle size={24} color={colors.warning} />;
      case 'inactive':
        return <Ban size={24} color={colors.error} />;
      default:
        return <Shield size={24} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'suspended':
        return colors.warning;
      case 'inactive':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const handleStatusChange = async (
    newStatus: 'active' | 'inactive' | 'suspended'
  ) => {
    if (newStatus === user.status) {
      handleClose();
      return;
    }

    setUpdating(true);
    try {
      await onStatusUpdate(newStatus);
      handleClose();
    } catch (error) {
      showError('Error', 'Failed to update user status');
    } finally {
      setUpdating(false);
    }
  };

  const statusOptions = [
    {
      status: 'active' as const,
      title: 'Activate User',
      description: 'User can access all features',
      icon: <CheckCircle size={20} color={colors.success} />,
      color: colors.success,
    },
    {
      status: 'suspended' as const,
      title: 'Suspend User',
      description: 'Temporarily restrict access',
      icon: <AlertCircle size={20} color={colors.warning} />,
      color: colors.warning,
    },
    {
      status: 'inactive' as const,
      title: 'Deactivate User',
      description: 'Permanently block access',
      icon: <Ban size={20} color={colors.error} />,
      color: colors.error,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Shield size={24} color={colors.primary} />
              <Text style={styles.title}>Manage User Status</Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <View style={styles.currentStatus}>
              <Text style={styles.statusLabel}>Current Status:</Text>
              <View style={styles.statusBadge}>
                {getStatusIcon(user.status)}
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(user.status) },
                  ]}
                >
                  {user.status?.charAt(0).toUpperCase() + user.status?.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.options}>
            {statusOptions.map(option => (
              <Pressable
                key={option.status}
                style={[
                  styles.option,
                  user.status === option.status && styles.selectedOption,
                ]}
                onPress={() => handleStatusChange(option.status)}
                disabled={updating}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionIcon}>{option.icon}</View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                </View>
                {user.status === option.status && (
                  <CheckCircle size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Button
              title='Cancel'
              variant='outline'
              onPress={handleClose}
              disabled={updating}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  userInfo: {
    marginBottom: 24,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  options: {
    gap: 12,
    marginBottom: 24,
  },
  option: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
  },
  selectedOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
});
