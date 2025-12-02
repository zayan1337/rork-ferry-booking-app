import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/adminColors';
import { UserProfile } from '@/types/userManagement';
import { useUserForm } from '@/hooks/useUserForm';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import {
  User as UserIcon,
  Shield,
  Activity,
  Save,
  RotateCcw,
  AlertCircle,
  Info,
  Settings,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import TextInput from '@/components/admin/TextInput';
import Dropdown from '@/components/admin/Dropdown';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import Switch from '@/components/admin/Switch';

interface UserFormProps {
  userId?: string;
  onSave?: (updatedUser: UserProfile) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  mobile_number?: string;
  role?: string;
  status?: string;
  date_of_birth?: string;
  gender?: string;
  password?: string;
  confirm_password?: string;
  general?: string;
}

export default function UserForm({
  userId,
  onSave,
  onCancel,
  isModal = false,
}: UserFormProps) {
  const {
    formData,
    setFieldValue,
    isLoading,
    isSubmitting,
    errors,
    clearFieldError,
    handleSubmit,
    resetForm,
    canSubmit,
    isDirty,
  } = useUserForm(userId);
  const { isSuperAdmin: currentUserIsSuperAdmin } = useAdminPermissions();

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(!userId);
  const [originalRole, setOriginalRole] = useState<string | null>(null);
  const [creditCeiling, setCreditCeiling] = useState<string>('');
  const [freeTicketsAllocation, setFreeTicketsAllocation] =
    useState<string>('');
  const [originalCreditCeiling, setOriginalCreditCeiling] =
    useState<string>('');
  const [originalFreeTicketsAllocation, setOriginalFreeTicketsAllocation] =
    useState<string>('');
  const [originalIsSuperAdmin, setOriginalIsSuperAdmin] =
    useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [agentDiscount, setAgentDiscount] = useState<string>('');
  const [originalAgentDiscount, setOriginalAgentDiscount] =
    useState<string>('');

  // Fetch user data to get original role and agent fields
  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        try {
          const { supabase } = await import('@/utils/supabase');
          const { data, error } = await supabase
            .from('user_profiles')
            .select(
              'role, credit_ceiling, free_tickets_allocation, is_super_admin, agent_discount'
            )
            .eq('id', userId)
            .single();

          if (!error && data) {
            setOriginalRole(data.role);
            const superAdminValue = Boolean(data.is_super_admin);
            setIsSuperAdmin(superAdminValue);
            setOriginalIsSuperAdmin(superAdminValue);

            const creditCeilingValue = data.credit_ceiling?.toString() || '';
            const freeTicketsValue =
              data.free_tickets_allocation?.toString() || '';
            const discountValue = data.agent_discount?.toString() || '';

            setCreditCeiling(creditCeilingValue);
            setFreeTicketsAllocation(freeTicketsValue);
            setAgentDiscount(discountValue);
            setOriginalCreditCeiling(creditCeilingValue);
            setOriginalFreeTicketsAllocation(freeTicketsValue);
            setOriginalAgentDiscount(discountValue);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    };

    fetchUserData();
  }, [userId]);

  // Check if agent-specific fields have changed
  const hasAgentFieldsChanged = Boolean(
    formData.role === 'agent' &&
    userId &&
    (creditCeiling !== originalCreditCeiling ||
      freeTicketsAllocation !== originalFreeTicketsAllocation ||
      agentDiscount !== originalAgentDiscount ||
      isSuperAdmin !== originalIsSuperAdmin)
  );

  // Track form changes including agent-specific fields
  useEffect(() => {
    const hasFormChanges = isDirty || hasAgentFieldsChanged;
    setHasChanges(hasFormChanges);

    if (formData.role && !originalRole) {
      setOriginalRole(formData.role);
    }
  }, [isDirty, hasAgentFieldsChanged, formData.role, originalRole]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name?.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Full name must be less than 100 characters';
    }

    // Email validation
    if (!formData.email?.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Mobile number validation
    if (!formData.mobile_number?.trim()) {
      errors.mobile_number = 'Phone number is required';
    } else if (
      !/^[\+]?[1-9][\d]{0,15}$/.test(
        formData.mobile_number.trim().replace(/\s/g, '')
      )
    ) {
      errors.mobile_number = 'Please enter a valid phone number';
    }

    // Role validation (only required if role field is visible)
    if (
      currentUserIsSuperAdmin &&
      (originalRole === 'customer' || formData.role === 'customer') &&
      !formData.role
    ) {
      errors.role = 'User role is required';
    }

    // Status validation
    if (!formData.status) {
      errors.status = 'User status is required';
    }

    // Password validation for new users
    if (!userId) {
      if (!formData.password?.trim()) {
        errors.password = 'Password is required for new users';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password =
          'Password must contain uppercase, lowercase, and number';
      }

      if (!formData.confirm_password?.trim()) {
        errors.confirm_password = 'Please confirm your password';
      } else if (formData.password !== formData.confirm_password) {
        errors.confirm_password = 'Passwords do not match';
      }
    }

    // Date of birth validation (optional but if provided should be valid)
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 0 || age > 120) {
        errors.date_of_birth = 'Please enter a valid date of birth';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      // Update agent-specific fields if user is an agent
      if ((formData.role === 'agent' || originalRole === 'agent') && userId) {
        const { supabase } = await import('@/utils/supabase');
        const updateData: any = {};

        // If changing from customer to agent, also update role
        if (originalRole === 'customer' && formData.role === 'agent') {
          updateData.role = formData.role;
        }

        // Update credit ceiling if changed
        if (creditCeiling !== originalCreditCeiling) {
          updateData.credit_ceiling = parseFloat(creditCeiling) || 0;
        }

        // Update free tickets allocation if changed (only update the limit, not remaining)
        if (freeTicketsAllocation !== originalFreeTicketsAllocation) {
          const newAllocation = parseInt(freeTicketsAllocation, 10) || 0;
          updateData.free_tickets_allocation = newAllocation;

          // Only initialize remaining when changing from customer to agent
          if (originalRole === 'customer' && formData.role === 'agent') {
            updateData.free_tickets_remaining = newAllocation;
          }
          // For existing agents, only update the allocation limit, don't touch remaining
        }

        // Update agent discount if changed
        if (agentDiscount !== originalAgentDiscount) {
          updateData.agent_discount = parseFloat(agentDiscount) || 0;
        }

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update(updateData)
            .eq('id', userId);

          if (updateError) {
            throw updateError;
          }

          // Update original values after successful save
          if (creditCeiling !== originalCreditCeiling) {
            setOriginalCreditCeiling(creditCeiling);
          }
          if (freeTicketsAllocation !== originalFreeTicketsAllocation) {
            setOriginalFreeTicketsAllocation(freeTicketsAllocation);
          }
          if (agentDiscount !== originalAgentDiscount) {
            setOriginalAgentDiscount(agentDiscount);
          }
        }
      }

      // Update super admin status if user is admin and super admin is editing
      if (
        currentUserIsSuperAdmin &&
        ((formData.role as string) === 'admin' || originalRole === 'admin') &&
        userId &&
        isSuperAdmin !== originalIsSuperAdmin
      ) {
        const { supabase } = await import('@/utils/supabase');
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({ is_super_admin: isSuperAdmin })
          .eq('id', userId);

        if (updateError) {
          throw updateError;
        }

        // Update original value after successful save
        setOriginalIsSuperAdmin(isSuperAdmin);
      }

      const result = await handleSubmit();
      if (result) {
        setHasChanges(false);
        onSave?.(result);
      }
    } catch (error) {
      console.error('Error saving user:', error);
      let errorMessage =
        'Failed to save user. Please check your connection and try again.';

      if (error instanceof Error) {
        if (
          error.message.includes('duplicate key value') ||
          error.message.includes('unique constraint')
        ) {
          errorMessage = 'A user with this email address already exists.';
        } else {
          errorMessage = error.message;
        }
      }

      setValidationErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    resetForm();
    setValidationErrors({});
    setHasChanges(false);
    // Reset agent-specific fields to original values
    setCreditCeiling(originalCreditCeiling);
    setFreeTicketsAllocation(originalFreeTicketsAllocation);
    setAgentDiscount(originalAgentDiscount);
    setIsSuperAdmin(originalIsSuperAdmin);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'active':
        return 'User account is active and can access the system';
      case 'inactive':
        return 'User account is temporarily disabled';
      case 'suspended':
        return 'User account is suspended due to policy violations';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'inactive':
        return colors.textSecondary;
      case 'suspended':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  // Filter role options based on current role
  const getRoleOptions = () => {
    const allRoles = [
      { label: 'Admin', value: 'admin' },
      { label: 'Agent', value: 'agent' },
      { label: 'Customer', value: 'customer' },
      { label: 'Captain', value: 'captain' },
    ];

    // If current role is customer, only show agent, captain, and admin
    if (originalRole === 'customer' || formData.role === 'customer') {
      return allRoles.filter(role => role.value !== 'customer');
    }

    return allRoles;
  };

  const roleOptions = getRoleOptions();

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
    { label: 'Suspended', value: 'suspended' },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>
          {userId ? 'Loading user data...' : 'Preparing form...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <UserIcon size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {userId ? 'Edit User' : 'Create New User'}
          </Text>
          <Text style={styles.subtitle}>
            {userId
              ? 'Update user information and settings'
              : 'Add a new user to the system'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Info size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Full Name'
              value={formData.name || ''}
              onChangeText={text => {
                setFieldValue('name', text);
                clearFieldError('name');
              }}
              placeholder='Enter full name'
              error={validationErrors.name || getFieldError('name')}
              required
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Email Address'
              value={formData.email || ''}
              onChangeText={text => {
                setFieldValue('email', text);
                clearFieldError('email');
              }}
              placeholder='Enter email address'
              keyboardType='email-address'
              autoCapitalize='none'
              error={validationErrors.email || getFieldError('email')}
              required
              editable={!userId}
              description={
                userId ? 'Email cannot be changed after creation' : undefined
              }
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Phone Number'
              value={formData.mobile_number || ''}
              onChangeText={text => {
                setFieldValue('mobile_number', text);
                clearFieldError('mobile_number');
              }}
              placeholder='Enter phone number'
              keyboardType='phone-pad'
              error={
                validationErrors.mobile_number || getFieldError('mobile_number')
              }
              required
            />
          </View>

          <View style={styles.formGroup}>
            <CalendarDatePicker
              label='Date of Birth'
              value={formData.date_of_birth || null}
              onChange={date => {
                setFieldValue('date_of_birth', date);
                clearFieldError('date_of_birth');
              }}
              maxDate={new Date().toISOString().split('T')[0]}
              placeholder='Select date of birth'
              error={
                validationErrors.date_of_birth || getFieldError('date_of_birth')
              }
            />
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>

          {/* Only show role selection if super admin and user is customer */}
          {currentUserIsSuperAdmin &&
            (originalRole === 'customer' || formData.role === 'customer') && (
              <View style={styles.formGroup}>
                <Dropdown
                  label='User Role'
                  value={formData.role || ''}
                  onValueChange={value => {
                    setFieldValue('role', value);
                    clearFieldError('role');
                  }}
                  options={roleOptions}
                  placeholder='Select user role'
                  error={validationErrors.role || getFieldError('role')}
                  required
                />
                {originalRole && originalRole !== formData.role && (
                  <View style={styles.roleChangeWarning}>
                    <View style={styles.roleChangeIcon}>
                      <AlertCircle size={16} color={colors.warning} />
                    </View>
                    <Text style={styles.roleChangeText}>
                      Changing user role from {originalRole} to {formData.role}.
                      This action may affect user permissions and access.
                    </Text>
                  </View>
                )}
              </View>
            )}

          {/* Show current role as read-only if not super admin or user is not customer */}
          {(!currentUserIsSuperAdmin ||
            (originalRole !== 'customer' && formData.role !== 'customer')) && (
            <View style={styles.formGroup}>
              <TextInput
                label='User Role'
                value={
                  formData.role
                    ? formData.role.charAt(0).toUpperCase() +
                      formData.role.slice(1)
                    : ''
                }
                placeholder='User role'
                editable={false}
                description='Role cannot be changed'
              />
            </View>
          )}

          {/* Super Admin Toggle - Only visible when super admin is editing an admin user or changing customer to admin */}
          {currentUserIsSuperAdmin &&
            ((formData.role as string) === 'admin' ||
              originalRole === 'admin' ||
              (originalRole === 'customer' &&
                (formData.role as string) === 'admin')) && (
              <View style={styles.formGroup}>
                <Switch
                  label='Super Admin Access'
                  value={isSuperAdmin}
                  onValueChange={setIsSuperAdmin}
                  description='Grant full access to all admin portal features and permissions. Super admins can manage all system settings and user permissions.'
                  disabled={(formData.role as string) !== 'admin'}
                />
                {(formData.role as string) !== 'admin' && (
                  <Text style={styles.switchHelperText}>
                    User must be an admin to enable super admin access
                  </Text>
                )}
              </View>
            )}

          {/* Agent-specific fields when role is agent */}
          {formData.role === 'agent' && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderIcon}>
                  <Settings size={20} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Agent Settings</Text>
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  label='Credit Ceiling (MVR)'
                  value={creditCeiling}
                  onChangeText={text => {
                    const num = text.replace(/[^0-9.]/g, '');
                    setCreditCeiling(num);
                  }}
                  placeholder='Enter credit limit'
                  keyboardType='decimal-pad'
                  description='Maximum credit amount this agent can use'
                />
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  label='Free Tickets Allocation'
                  value={freeTicketsAllocation}
                  onChangeText={text => {
                    const num = text.replace(/[^0-9]/g, '');
                    setFreeTicketsAllocation(num);
                  }}
                  placeholder='Enter number of free tickets'
                  keyboardType='number-pad'
                  description='Number of free tickets allocated to this agent'
                />
              </View>

              <View style={styles.formGroup}>
                <TextInput
                  label='Agent Discount (%)'
                  value={agentDiscount}
                  onChangeText={text => {
                    const num = text.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = num.split('.');
                    if (parts.length > 2) {
                      return;
                    }
                    // Limit to 100
                    const value = parseFloat(num);
                    if (!isNaN(value) && value > 100) {
                      setAgentDiscount('100');
                    } else {
                      setAgentDiscount(num);
                    }
                  }}
                  placeholder='Enter discount percentage (0-100)'
                  keyboardType='decimal-pad'
                  description='Discount percentage for this agent (0-100%)'
                />
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Dropdown
              label='Account Status'
              value={formData.status || ''}
              onValueChange={value => {
                setFieldValue('status', value);
                clearFieldError('status');
              }}
              options={statusOptions}
              placeholder='Select account status'
              error={validationErrors.status || getFieldError('status')}
              required
            />
          </View>

          {/* Status Description */}
          {formData.status && (
            <View style={styles.statusDescription}>
              <View style={styles.statusDescriptionIcon}>
                <Activity size={16} color={getStatusColor(formData.status)} />
              </View>
              <Text
                style={[
                  styles.statusDescriptionText,
                  { color: getStatusColor(formData.status) },
                ]}
              >
                {getStatusDescription(formData.status)}
              </Text>
            </View>
          )}
        </View>

        {/* Password Section (for new users) */}
        {showPasswordFields && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Shield size={20} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Security</Text>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formHalf}>
                <TextInput
                  label='Password'
                  value={formData.password || ''}
                  onChangeText={text => {
                    setFieldValue('password', text);
                    clearFieldError('password');
                  }}
                  placeholder='Enter password'
                  secureTextEntry
                  error={validationErrors.password || getFieldError('password')}
                  required
                />
              </View>

              <View style={styles.formHalf}>
                <TextInput
                  label='Confirm Password'
                  value={formData.confirm_password || ''}
                  onChangeText={text => {
                    setFieldValue('confirm_password', text);
                    clearFieldError('confirm_password');
                  }}
                  placeholder='Confirm password'
                  secureTextEntry
                  error={
                    validationErrors.confirm_password ||
                    getFieldError('confirm_password')
                  }
                  required
                />
              </View>
            </View>
          </View>
        )}

        {/* Error Display */}
        {(validationErrors.general || errors.general) && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={16} color={colors.error} />
            </View>
            <Text style={styles.errorText}>
              {validationErrors.general || errors.general}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={userId ? 'Update User' : 'Create User'}
            onPress={handleFormSubmit}
            loading={loading || isSubmitting}
            disabled={
              loading || isSubmitting || (!canSubmit && !hasAgentFieldsChanged)
            }
            variant='primary'
            icon={
              <Save
                size={20}
                color={
                  canSubmit || hasAgentFieldsChanged
                    ? colors.white
                    : colors.textSecondary
                }
              />
            }
          />

          {hasChanges && (
            <Button
              title='Reset Changes'
              onPress={handleReset}
              variant='outline'
              disabled={loading || isSubmitting}
              icon={<RotateCcw size={20} color={colors.primary} />}
            />
          )}

          {onCancel && (
            <Button
              title='Cancel'
              onPress={onCancel}
              variant='outline'
              disabled={loading || isSubmitting}
            />
          )}
        </View>

        {/* Form Status */}
        {hasChanges && (
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <AlertCircle size={14} color={colors.warning} />
            </View>
            <Text style={styles.statusText}>You have unsaved changes</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  function getFieldError(fieldName: string) {
    return (errors as any)[fieldName] || '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formHalf: {
    flex: 1,
  },
  statusDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  statusDescriptionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDescriptionText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.errorLight,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.error}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  roleChangeWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${colors.warning}15`,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  roleChangeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  roleChangeText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  // switchContainer: {
  //   marginTop: 8,
  // },
  // switchLabelContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   gap: 6,
  //   marginBottom: 8,
  // },
  // switchLabel: {
  //   fontSize: 15,
  //   fontWeight: '600',
  //   color: colors.text,
  // },
  // infoIcon: {
  //   opacity: 0.6,
  // },
  // switchDescription: {
  //   fontSize: 13,
  //   color: colors.textSecondary,
  //   marginBottom: 12,
  //   lineHeight: 18,
  // },
  switchHelperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
