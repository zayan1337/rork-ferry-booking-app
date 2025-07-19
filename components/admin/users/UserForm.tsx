import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { UserFormData, User } from '@/types/userManagement';
import { useUserForm } from '@/hooks/useUserForm';
import {
    User as UserIcon,
    Mail,
    Phone,
    Calendar,
    Shield,
    Activity,
    Save,
    X,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Info,
    Settings,
    Users,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import Input from '@/components/Input';
import Switch from '@/components/admin/Switch';
import Dropdown from '@/components/admin/Dropdown';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { DateSelector } from '@/components/DateSelector';

interface UserFormProps {
    userId?: string;
    onSave?: (userData: UserFormData) => void;
    onCancel?: () => void;
    isModal?: boolean;
}

export default function UserForm({
    userId,
    onSave,
    onCancel,
    isModal = false
}: UserFormProps) {
    const {
        formData,
        setFieldValue,
        loading,
        submitting,
        errors,
        clearFieldError,
        handleSubmit,
        handleReset,
        canSubmit,
        hasChanges,
    } = useUserForm({
        userId,
        onSave,
    });

    const [showPasswordFields, setShowPasswordFields] = useState(!userId);

    const getFieldError = (fieldName: string) => {
        return errors[fieldName] || '';
    };

    const roleOptions = [
        { label: 'User', value: 'user' },
        { label: 'Agent', value: 'agent' },
        { label: 'Admin', value: 'admin' },
    ];

    if (loading) {
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
                            : 'Add a new user to the system'
                        }
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* General Error */}
                {errors.general && (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorIcon}>
                            <AlertCircle size={20} color={colors.error} />
                        </View>
                        <Text style={styles.errorText}>{errors.general}</Text>
                    </View>
                )}

                {/* Personal Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Info size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>

                    <View style={styles.formRow}>
                        <View style={styles.field}>
                            <Input
                                label="First Name"
                                value={formData.first_name || ''}
                                onChangeText={(text) => {
                                    setFieldValue('first_name', text);
                                    clearFieldError('first_name');
                                }}
                                placeholder="Enter first name"
                                error={getFieldError('first_name')}
                                leftIcon={<UserIcon size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Last Name"
                                value={formData.last_name || ''}
                                onChangeText={(text) => {
                                    setFieldValue('last_name', text);
                                    clearFieldError('last_name');
                                }}
                                placeholder="Enter last name"
                                error={getFieldError('last_name')}
                                leftIcon={<UserIcon size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>
                    </View>

                    <View style={styles.formRow}>
                        <View style={styles.field}>
                            <Input
                                label="Email Address"
                                value={formData.email || ''}
                                onChangeText={(text) => {
                                    setFieldValue('email', text);
                                    clearFieldError('email');
                                }}
                                placeholder="Enter email address"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={getFieldError('email')}
                                leftIcon={<Mail size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Phone Number"
                                value={formData.mobile_number || ''}
                                onChangeText={(text) => {
                                    setFieldValue('mobile_number', text);
                                    clearFieldError('mobile_number');
                                }}
                                placeholder="Enter phone number"
                                keyboardType="phone-pad"
                                error={getFieldError('mobile_number')}
                                leftIcon={<Phone size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <DateSelector
                            label="Date of Birth"
                            value={formData.date_of_birth || null}
                            onChange={(date) => {
                                setFieldValue('date_of_birth', date);
                                clearFieldError('date_of_birth');
                            }}
                            isDateOfBirth={true}
                            maxDate={new Date().toISOString().split('T')[0]}
                            error={getFieldError('date_of_birth')}
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

                    <View style={styles.field}>
                        <Dropdown
                            label="Role"
                            value={formData.role || ''}
                            onValueChange={(value) => {
                                setFieldValue('role', value);
                                clearFieldError('role');
                            }}
                            options={roleOptions}
                            placeholder="Select user role"
                            error={getFieldError('role')}
                            required
                        />
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="Active Status"
                            value={formData.is_active ?? true}
                            onValueChange={(value) => setFieldValue('is_active', value)}
                            description={
                                formData.is_active
                                    ? 'User account is active and can access the system'
                                    : 'User account is inactive and cannot access the system'
                            }
                            icon={<Activity size={16} color={formData.is_active ? colors.success : colors.textSecondary} />}
                        />
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="Super Admin"
                            value={formData.is_super_admin ?? false}
                            onValueChange={(value) => setFieldValue('is_super_admin', value)}
                            description={
                                formData.is_super_admin
                                    ? 'User has super admin privileges'
                                    : 'User has standard role privileges'
                            }
                            icon={<Shield size={16} color={formData.is_super_admin ? colors.warning : colors.textSecondary} />}
                        />
                    </View>
                </View>

                {/* Password Section (for new users or password reset) */}
                {showPasswordFields && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeaderIcon}>
                                <Shield size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Password</Text>
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Password"
                                value={formData.password || ''}
                                onChangeText={(text) => {
                                    setFieldValue('password', text);
                                    clearFieldError('password');
                                }}
                                placeholder="Enter password"
                                secureTextEntry
                                error={getFieldError('password')}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Confirm Password"
                                value={formData.confirmPassword || ''}
                                onChangeText={(text) => {
                                    setFieldValue('confirmPassword', text);
                                    clearFieldError('confirmPassword');
                                }}
                                placeholder="Confirm password"
                                secureTextEntry
                                error={getFieldError('confirmPassword')}
                                required
                            />
                        </View>
                    </View>
                )}

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoIcon}>
                        <Info size={18} color={colors.info} />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>User Management</Text>
                        <Text style={styles.infoText}>
                            Ensure all user information is accurate. Active users will be able to access the system based on their assigned role.
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    {hasChanges && (
                        <Button
                            title="Reset Changes"
                            variant="outline"
                            onPress={handleReset}
                            icon={<RotateCcw size={16} color={colors.textSecondary} />}
                        />
                    )}

                    <Button
                        title={userId ? 'Update User' : 'Create User'}
                        variant="primary"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={!canSubmit || submitting}
                        icon={<Save size={16} color={colors.white} />}
                    />

                    {onCancel && (
                        <Button
                            title="Cancel"
                            variant="ghost"
                            onPress={onCancel}
                            disabled={submitting}
                            icon={<X size={16} color={colors.textSecondary} />}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    closeButton: {
        padding: 8,
    },
    formContainer: {
        gap: 24,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    field: {
        marginBottom: 16,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '30',
        marginBottom: 8,
    },
    toggleContent: {
        flex: 1,
        marginRight: 16,
    },
    toggleLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 4,
    },
    toggleDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    errorContainer: {
        backgroundColor: colors.danger + '10',
        borderWidth: 1,
        borderColor: colors.danger + '30',
        borderRadius: 8,
        padding: 16,
    },
    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
    },
    errorText: {
        fontSize: 14,
        color: colors.danger,
        marginBottom: 4,
    },
    actionContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    cancelButton: {
        flex: 1,
    },
    saveButton: {
        flex: 2,
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