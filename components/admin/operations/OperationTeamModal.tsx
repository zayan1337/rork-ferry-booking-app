import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { X, Mail, User, Shield, Bell } from 'lucide-react-native';
import { OperationTeamMember } from '@/hooks/useOperationTeamManagement';
import Button from '@/components/admin/Button';

interface OperationTeamModalProps {
  visible: boolean;
  member: OperationTeamMember | null;
  onClose: () => void;
  onSubmit: (data: Partial<OperationTeamMember>) => void;
  loading: boolean;
}

export default function OperationTeamModal({
  visible,
  member,
  onClose,
  onSubmit,
  loading,
}: OperationTeamModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'operations',
    is_active: true,
    receive_manifests: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when member changes
  useEffect(() => {
    if (member) {
      setFormData({
        email: member.email,
        full_name: member.full_name,
        role: member.role,
        is_active: member.is_active,
        receive_manifests: member.receive_manifests,
      });
    } else {
      setFormData({
        email: '',
        full_name: '',
        role: 'operations',
        is_active: true,
        receive_manifests: true,
      });
    }
    setErrors({});
  }, [member, visible]);

  // Validation
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const content = (
    <View style={styles.modalContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {member ? 'Edit Team Member' : 'Add Team Member'}
        </Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.modalContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <User size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder='Enter full name'
              value={formData.full_name}
              onChangeText={text => handleFieldChange('full_name', text)}
              editable={!loading}
            />
          </View>
          {errors.full_name && (
            <Text style={styles.errorText}>{errors.full_name}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email *</Text>
          <View style={styles.inputContainer}>
            <Mail size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder='Enter email address'
              value={formData.email}
              onChangeText={text =>
                handleFieldChange('email', text.toLowerCase())
              }
              keyboardType='email-address'
              autoCapitalize='none'
              editable={!loading}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        {/* Role */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Role *</Text>
          <View style={styles.inputContainer}>
            <Shield size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder='Enter role (e.g., operations, manager)'
              value={formData.role}
              onChangeText={text => handleFieldChange('role', text)}
              editable={!loading}
            />
          </View>
          {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
        </View>

        {/* Active Status */}
        <View style={styles.switchGroup}>
          <View style={styles.switchLabel}>
            <Text style={styles.switchLabelText}>Active</Text>
            <Text style={styles.switchDescription}>
              Member can receive emails and notifications
            </Text>
          </View>
          <Switch
            value={formData.is_active}
            onValueChange={value => handleFieldChange('is_active', value)}
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={
              formData.is_active ? colors.primary : colors.textSecondary
            }
          />
        </View>

        {/* Receive Manifests */}
        <View style={styles.switchGroup}>
          <View style={styles.switchLabel}>
            <View style={styles.switchLabelWithIcon}>
              <Bell size={20} color={colors.textSecondary} />
              <Text style={styles.switchLabelText}>Receive Manifests</Text>
            </View>
            <Text style={styles.switchDescription}>
              Member will receive passenger manifest emails
            </Text>
          </View>
          <Switch
            value={formData.receive_manifests}
            onValueChange={value =>
              handleFieldChange('receive_manifests', value)
            }
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.primaryLight }}
            thumbColor={
              formData.receive_manifests ? colors.primary : colors.textSecondary
            }
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.modalFooter}>
        <Button
          title='Cancel'
          onPress={onClose}
          variant='outline'
          disabled={loading}
          style={styles.footerButton}
        />
        <Button
          title={member ? 'Update' : 'Add Member'}
          onPress={handleSubmit}
          variant='primary'
          disabled={loading}
          loading={loading}
          style={styles.footerButton}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior='padding'
          keyboardVerticalOffset={80}
          style={styles.modalOverlay}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.modalOverlay}>{content}</View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
    paddingLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  switchLabelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  switchLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  switchDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
