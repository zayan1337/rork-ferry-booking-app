import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useRouteForm } from '@/hooks/useRouteForm';
import { RouteFormData } from '@/types/operations';
import Input from '@/components/Input';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/Dropdown';
import { MapPin, Clock, DollarSign, AlertCircle, Save, X } from 'lucide-react-native';

interface RouteFormProps {
    routeId?: string;
    onSave?: (route: RouteFormData) => void;
    onCancel?: () => void;
    isModal?: boolean;
}

export default function RouteForm({
    routeId,
    onSave,
    onCancel,
    isModal = false
}: RouteFormProps) {
    // Memoize the hook options to prevent re-initialization
    const hookOptions = useMemo(() => {
        return routeId ? { initialData: { id: routeId } as any } : {};
    }, [routeId]);

    const {
        formData,
        errors,
        isLoading,
        isSubmitting,
        islands,
        updateFormData,
        handleSubmit,
        resetForm,
        getFieldError,
    } = useRouteForm(hookOptions);

    const isEditMode = !!routeId;

    const handleSave = async () => {
        try {
            const success = await handleSubmit();
            if (success) {
                onSave?.(formData);
                if (!isEditMode) {
                    Alert.alert('Success', 'Route created successfully!');
                } else {
                    Alert.alert('Success', 'Route updated successfully!');
                }
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save route');
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            resetForm();
        }
        onCancel?.();
    };

    const islandOptions = islands.map(island => ({
        label: island.name,
        value: island.id,
    }));

    const statusOptions = [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
    ];

    const hasChanges = () => {
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
                            {isEditMode ? 'Edit Route' : 'New Route'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isEditMode ? 'Update route information' : 'Create a new ferry route'}
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
                    {/* Route Name */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Route Information</Text>

                        <View style={styles.field}>
                            <Input
                                label="Route Name"
                                value={formData.name || ''}
                                onChangeText={(text) => {
                                    updateFormData({ name: text });
                                }}
                                placeholder="Enter route name (e.g., Male-Hulhumale)"
                                error={getFieldError('name')}
                                leftIcon={<MapPin size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Description"
                                value={formData.description || ''}
                                onChangeText={(text) => {
                                    updateFormData({ description: text });
                                }}
                                placeholder="Route description (optional)"
                                multiline
                                numberOfLines={3}
                                error={getFieldError('description')}
                            />
                        </View>
                    </View>

                    {/* Origin and Destination */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Route Points</Text>

                        <View style={styles.field}>
                            <Dropdown
                                label="Origin Island"
                                value={formData.from_island_id || ''}
                                onChange={(value) => {
                                    updateFormData({ from_island_id: value });
                                }}
                                items={islandOptions}
                                placeholder="Select origin island"
                                error={getFieldError('from_island_id')}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Dropdown
                                label="Destination Island"
                                value={formData.to_island_id || ''}
                                onChange={(value) => {
                                    updateFormData({ to_island_id: value });
                                }}
                                items={islandOptions}
                                placeholder="Select destination island"
                                error={getFieldError('to_island_id')}
                                required
                            />
                        </View>
                    </View>

                    {/* Route Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Route Details</Text>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Distance"
                                    value={formData.distance || ''}
                                    onChangeText={(text) => {
                                        updateFormData({ distance: text });
                                    }}
                                    placeholder="e.g., 45 km"
                                    error={getFieldError('distance')}
                                    leftIcon={<MapPin size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Duration"
                                    value={formData.duration || ''}
                                    onChangeText={(text) => {
                                        updateFormData({ duration: text });
                                    }}
                                    placeholder="e.g., 1h 30m"
                                    error={getFieldError('duration')}
                                    leftIcon={<Clock size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Base Fare (MVR)"
                                    value={formData.base_fare?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseFloat(text) || 0;
                                        updateFormData({ base_fare: value });
                                    }}
                                    placeholder="150"
                                    keyboardType="numeric"
                                    error={getFieldError('base_fare')}
                                    leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Dropdown
                                    label="Status"
                                    value={formData.status || ''}
                                    onChange={(value) => {
                                        updateFormData({ status: value as "active" | "inactive" });
                                    }}
                                    items={statusOptions}
                                    placeholder="Select status"
                                    error={getFieldError('status')}
                                    required
                                />
                            </View>
                        </View>
                    </View>

                    {/* Error Display */}
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
                />
                <Button
                    title={isEditMode ? 'Update Route' : 'Create Route'}
                    variant="primary"
                    onPress={handleSave}
                    loading={isSubmitting}
                    disabled={!hasChanges()}
                    icon={<Save size={18} color="#FFFFFF" />}
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
        fontSize: 24,
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
        borderRadius: 8,
        backgroundColor: colors.card,
    },
    formContainer: {
        gap: 24,
    },
    section: {
        gap: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    field: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    errorContainer: {
        backgroundColor: colors.danger + '10',
        borderWidth: 1,
        borderColor: colors.danger + '30',
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.danger,
    },
    errorText: {
        fontSize: 14,
        color: colors.danger,
        marginLeft: 24,
    },
    actionContainer: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
}); 