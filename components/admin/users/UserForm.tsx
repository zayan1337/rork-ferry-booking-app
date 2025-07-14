import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useUserForm } from '@/hooks/useUserForm';
import { UserFormData } from '@/types/userManagement';
import Input from '@/components/Input';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/Dropdown';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Shield,
    AlertCircle,
    Save,
    X,
    Eye,
    EyeOff,
    Crown,
    UserCheck,
    Contact,
    Home,
    Settings,
    Key
} from 'lucide-react-native';

interface UserFormProps {
    userId?: string;
    onSave?: (user: UserFormData) => void;
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
        errors,
        isLoading,
        isSubmitting,
        roles = [],
        setFieldValue,
        setFieldError,
        clearFieldError,
        handleSubmit,
        resetForm,
    } = useUserForm(userId);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const isEditMode = !!userId;

    // Ensure formData is available before rendering
    if (!formData) {
        return null;
    }

    const handleSave = async () => {
        try {
            const savedUser = await handleSubmit();
            if (savedUser) {
                // Convert UserProfile to UserFormData for the callback
                const userFormData: UserFormData = {
                    name: savedUser.name,
                    email: savedUser.email,
                    mobile_number: savedUser.mobile_number,
                    role: savedUser.role,
                    status: savedUser.status,
                    profile_picture: savedUser.profile_picture,
                    date_of_birth: savedUser.date_of_birth,
                    gender: savedUser.gender,
                    address: savedUser.address,
                    emergency_contact: savedUser.emergency_contact,
                    preferences: savedUser.preferences,
                    password: '',
                    confirm_password: '',
                    send_welcome_email: false,
                    send_credentials_sms: false
                };

                onSave?.(userFormData);
                if (!isEditMode) {
                    Alert.alert('Success', 'User created successfully!');
                } else {
                    Alert.alert('Success', 'User updated successfully!');
                }
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save user');
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            resetForm();
        }
        onCancel?.();
    };

    const roleOptions = (roles || []).map(role => ({
        label: role.label || role.name,
        value: role.value || role.id,
    }));

    const statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
    ];

    const getFieldError = (field: string) => {
        return errors && errors[field] ? errors[field] : undefined;
    };

    const hasChanges = () => {
        if (!formData || typeof formData !== 'object') return false;
        return Object.values(formData).some(value =>
            value !== null && value !== undefined && value !== ''
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>
                            {isEditMode ? 'Edit User' : 'New User'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isEditMode ? 'Update user information' : 'Create a new user account'}
                        </Text>
                    </View>
                    {isModal && (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={handleCancel}
                        >
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                    {/* Basic Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Basic Information</Text>

                        <View style={styles.field}>
                            <Input
                                label="Full Name"
                                value={formData.name || ''}
                                onChangeText={(text) => {
                                    setFieldValue('name', text);
                                    clearFieldError('name');
                                }}
                                placeholder="Enter full name"
                                error={getFieldError('name')}
                                leftIcon={<User size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

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

                        <View style={styles.field}>
                            <Input
                                label="Date of Birth"
                                value={formData.date_of_birth || ''}
                                onChangeText={(text) => {
                                    setFieldValue('date_of_birth', text);
                                    clearFieldError('date_of_birth');
                                }}
                                placeholder="YYYY-MM-DD"
                                error={getFieldError('date_of_birth')}
                                leftIcon={<Calendar size={20} color={colors.textSecondary} />}
                            />
                        </View>
                    </View>

                    {/* Account Settings */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Settings</Text>

                        <View style={styles.field}>
                            <Dropdown
                                label="Role"
                                value={formData.role || ''}
                                onChange={(value) => {
                                    setFieldValue('role', value);
                                    clearFieldError('role');
                                }}
                                items={roleOptions}
                                placeholder="Select user role"
                                error={getFieldError('role')}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Dropdown
                                label="Status"
                                value={formData.status || 'active'}
                                onChange={(value) => {
                                    setFieldValue('status', value);
                                    clearFieldError('status');
                                }}
                                items={statusOptions}
                                placeholder="Select status"
                                error={getFieldError('status')}
                                required
                            />
                        </View>

                        {!isEditMode && (
                            <>
                                <View style={styles.field}>
                                    <Input
                                        label="Password"
                                        value={formData.password || ''}
                                        onChangeText={(text) => {
                                            setFieldValue('password', text);
                                            clearFieldError('password');
                                        }}
                                        placeholder="Enter password"
                                        secureTextEntry={true}
                                        error={getFieldError('password')}
                                        leftIcon={<Key size={20} color={colors.textSecondary} />}
                                        required
                                    />
                                </View>

                                <View style={styles.field}>
                                    <Input
                                        label="Confirm Password"
                                        value={formData.confirm_password || ''}
                                        onChangeText={(text) => {
                                            setFieldValue('confirm_password', text);
                                            clearFieldError('confirm_password');
                                        }}
                                        placeholder="Confirm password"
                                        secureTextEntry={true}
                                        error={getFieldError('confirm_password')}
                                        leftIcon={<Key size={20} color={colors.textSecondary} />}
                                        required
                                    />
                                </View>
                            </>
                        )}
                    </View>

                    {/* Address Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Address Information</Text>

                        <View style={styles.field}>
                            <Input
                                label="Address Line 1"
                                value={formData.address?.street || ''}
                                onChangeText={(text) => {
                                    setFieldValue('address.street', text);
                                    clearFieldError('address.street');
                                }}
                                placeholder="Enter address"
                                error={getFieldError('address.street')}
                                leftIcon={<Home size={20} color={colors.textSecondary} />}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Island"
                                    value={formData.address?.island || ''}
                                    onChangeText={(text) => {
                                        setFieldValue('address.island', text);
                                        clearFieldError('address.island');
                                    }}
                                    placeholder="Enter island"
                                    error={getFieldError('address.island')}
                                    leftIcon={<MapPin size={20} color={colors.textSecondary} />}
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Atoll"
                                    value={formData.address?.atoll || ''}
                                    onChangeText={(text) => {
                                        setFieldValue('address.atoll', text);
                                        clearFieldError('address.atoll');
                                    }}
                                    placeholder="Enter atoll"
                                    error={getFieldError('address.atoll')}
                                    leftIcon={<MapPin size={20} color={colors.textSecondary} />}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Emergency Contact */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Emergency Contact</Text>

                        <View style={styles.field}>
                            <Input
                                label="Contact Name"
                                value={formData.emergency_contact?.name || ''}
                                onChangeText={(text) => {
                                    setFieldValue('emergency_contact.name', text);
                                    clearFieldError('emergency_contact.name');
                                }}
                                placeholder="Enter emergency contact name"
                                error={getFieldError('emergency_contact.name')}
                                leftIcon={<Contact size={20} color={colors.textSecondary} />}
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Contact Phone"
                                value={formData.emergency_contact?.phone || ''}
                                onChangeText={(text) => {
                                    setFieldValue('emergency_contact.phone', text);
                                    clearFieldError('emergency_contact.phone');
                                }}
                                placeholder="Enter emergency contact phone"
                                keyboardType="phone-pad"
                                error={getFieldError('emergency_contact.phone')}
                                leftIcon={<Phone size={20} color={colors.textSecondary} />}
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Relationship"
                                value={formData.emergency_contact?.relationship || ''}
                                onChangeText={(text) => {
                                    setFieldValue('emergency_contact.relationship', text);
                                    clearFieldError('emergency_contact.relationship');
                                }}
                                placeholder="Enter relationship"
                                error={getFieldError('emergency_contact.relationship')}
                                leftIcon={<Contact size={20} color={colors.textSecondary} />}
                            />
                        </View>
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>

                        <View style={styles.toggleRow}>
                            <View style={styles.toggleContent}>
                                <Text style={styles.toggleLabel}>Email Notifications</Text>
                                <Text style={styles.toggleDescription}>
                                    Receive email notifications for bookings and updates
                                </Text>
                            </View>
                            <Switch
                                value={formData.preferences?.email_notifications || false}
                                onValueChange={(value) => {
                                    setFieldValue('preferences.email_notifications', value);
                                }}
                                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                                thumbColor={formData.preferences?.email_notifications ? colors.primary : colors.textSecondary}
                            />
                        </View>

                        <View style={styles.toggleRow}>
                            <View style={styles.toggleContent}>
                                <Text style={styles.toggleLabel}>SMS Notifications</Text>
                                <Text style={styles.toggleDescription}>
                                    Receive SMS notifications for important updates
                                </Text>
                            </View>
                            <Switch
                                value={formData.preferences?.sms_notifications || false}
                                onValueChange={(value) => {
                                    setFieldValue('preferences.sms_notifications', value);
                                }}
                                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                                thumbColor={formData.preferences?.sms_notifications ? colors.primary : colors.textSecondary}
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Preferred Language"
                                value={formData.preferences?.language || ''}
                                onChangeText={(text) => {
                                    setFieldValue('preferences.language', text);
                                    clearFieldError('preferences.language');
                                }}
                                placeholder="Enter preferred language (e.g., English, Dhivehi)"
                                error={getFieldError('preferences.language')}
                                leftIcon={<Settings size={20} color={colors.textSecondary} />}
                            />
                        </View>
                    </View>

                    {/* Error Summary */}
                    {Object.keys(errors).length > 0 && (
                        <View style={styles.errorContainer}>
                            <View style={styles.errorHeader}>
                                <AlertCircle size={16} color={colors.danger} />
                                <Text style={styles.errorTitle}>Please fix the following errors:</Text>
                            </View>
                            {Object.entries(errors).map(([field, error]) => (
                                <Text key={field} style={styles.errorText}>
                                    • {error}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
                <Button
                    title="Cancel"
                    variant="ghost"
                    onPress={handleCancel}
                    disabled={isSubmitting}
                    style={styles.cancelButton}
                />
                <Button
                    title={isEditMode ? 'Update User' : 'Create User'}
                    variant="primary"
                    onPress={handleSave}
                    loading={isSubmitting}
                    disabled={!hasChanges()}
                    icon={<Save size={18} color="#FFFFFF" />}
                    style={styles.saveButton}
                />
            </View>
        </KeyboardAvoidingView>
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