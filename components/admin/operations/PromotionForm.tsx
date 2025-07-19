import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Platform } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Promotion, PromotionFormData } from '@/types/operations';
import { validatePromotionData } from '@/utils/operationsService';
import {
    Percent,
    Calendar,
    Settings,
    Users,
    Activity,
    DollarSign,
    Save,
    X,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Info,
    Star,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import TextInput from '@/components/admin/TextInput';
import Switch from '@/components/admin/Switch';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import DatePicker from '@/components/DatePicker';

interface PromotionFormProps {
    promotion?: Promotion;
    onSubmit: (formData: PromotionFormData) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

const PromotionForm: React.FC<PromotionFormProps> = ({
    promotion,
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [formData, setFormData] = useState<PromotionFormData>({
        name: '',
        description: '',
        discount_percentage: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        is_first_time_booking_only: false,
        is_active: true,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize form with existing promotion data
    useEffect(() => {
        if (promotion) {
            setFormData({
                name: promotion.name,
                description: promotion.description || '',
                discount_percentage: promotion.discount_percentage,
                start_date: promotion.start_date.split('T')[0],
                end_date: promotion.end_date.split('T')[0],
                is_first_time_booking_only: promotion.is_first_time_booking_only,
                is_active: promotion.is_active,
            });
        }
    }, [promotion]);

    const validateForm = () => {
        const validation = validatePromotionData({
            name: formData.name,
            discount_percentage: formData.discount_percentage,
            start_date: formData.start_date,
            end_date: formData.end_date,
            description: formData.description,
        });

        setErrors(validation.errors);
        return validation.isValid;
    };

    const updateField = (field: keyof PromotionFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear field error when user starts editing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        try {
            const submitData = {
                ...formData,
                name: formData.name.trim(),
                description: formData.description.trim(),
                start_date: formData.start_date + 'T00:00:00Z',
                end_date: formData.end_date + 'T23:59:59Z',
            };

            await onSubmit(submitData);

            Alert.alert(
                'Success',
                promotion ? 'Promotion updated successfully' : 'Promotion created successfully'
            );
        } catch (error: any) {
            console.error('Error submitting promotion:', error);
            const errorMessage = error?.message || 'Failed to save promotion';
            setErrors({ general: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        if (promotion) {
            setFormData({
                name: promotion.name,
                description: promotion.description || '',
                discount_percentage: promotion.discount_percentage,
                start_date: promotion.start_date.split('T')[0],
                end_date: promotion.end_date.split('T')[0],
                is_first_time_booking_only: promotion.is_first_time_booking_only,
                is_active: promotion.is_active,
            });
        } else {
            setFormData({
                name: '',
                description: '',
                discount_percentage: 0,
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                is_first_time_booking_only: false,
                is_active: true,
            });
        }
        setErrors({});
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>
                    {promotion ? 'Loading promotion...' : 'Preparing form...'}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Percent size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {promotion ? 'Edit Promotion' : 'Create New Promotion'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {promotion
                            ? 'Update promotion details and settings'
                            : 'Create a new promotional offer for customers'
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

                {/* Basic Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Info size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                    </View>

                    <View style={styles.field}>
                        <TextInput
                            label="Promotion Name"
                            value={formData.name}
                            onChangeText={(value) => updateField('name', value)}
                            placeholder="Enter promotion name"
                            error={errors.name}
                            maxLength={100}
                            required
                        />
                    </View>

                    <View style={styles.field}>
                        <TextInput
                            label="Description"
                            value={formData.description}
                            onChangeText={(value) => updateField('description', value)}
                            placeholder="Describe this promotion (optional)"
                            error={errors.description}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                        />
                    </View>

                    <View style={styles.field}>
                        <TextInput
                            label="Discount Percentage"
                            value={formData.discount_percentage.toString()}
                            onChangeText={(value) => updateField('discount_percentage', parseFloat(value) || 0)}
                            placeholder="Enter discount percentage (1-100)"
                            error={errors.discount_percentage}
                            keyboardType="numeric"
                            required
                        />
                    </View>
                </View>

                {/* Schedule */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Calendar size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Schedule</Text>
                    </View>

                    <View style={styles.dateRow}>
                        <View style={[styles.field, styles.dateField]}>
                            <DatePicker
                                label="Start Date"
                                value={formData.start_date}
                                onChange={(date) => updateField('start_date', date)}
                                minDate={new Date().toISOString().split('T')[0]}
                                placeholder="Select promotion start date"
                                error={errors.start_date}
                                required
                            />
                        </View>

                        <View style={[styles.field, styles.dateField]}>
                            <DatePicker
                                label="End Date"
                                value={formData.end_date}
                                onChange={(date) => updateField('end_date', date)}
                                minDate={formData.start_date || new Date().toISOString().split('T')[0]}
                                placeholder="Select promotion end date"
                                error={errors.end_date}
                                required
                            />
                        </View>
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Settings size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Settings</Text>
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="First Time Booking Only"
                            value={formData.is_first_time_booking_only}
                            onValueChange={(value) => updateField('is_first_time_booking_only', value)}
                            description={
                                formData.is_first_time_booking_only
                                    ? 'This promotion is only available for first-time customers'
                                    : 'This promotion is available for all customers'
                            }
                            icon={<Star size={16} color={formData.is_first_time_booking_only ? colors.warning : colors.textSecondary} />}
                        />
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="Active Status"
                            value={formData.is_active}
                            onValueChange={(value) => updateField('is_active', value)}
                            description={
                                formData.is_active
                                    ? 'This promotion is currently active and available'
                                    : 'This promotion is inactive and not available'
                            }
                            icon={<Activity size={16} color={formData.is_active ? colors.success : colors.textSecondary} />}
                        />
                    </View>

                    {formData.is_active && (
                        <View style={styles.statusContainer}>
                            <View style={styles.statusIcon}>
                                <CheckCircle size={16} color={colors.success} />
                            </View>
                            <Text style={styles.statusText}>
                                This promotion will be immediately available to customers when saved
                            </Text>
                        </View>
                    )}
                </View>

                {/* Info Section */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoIcon}>
                        <Info size={18} color={colors.info} />
                    </View>
                    <View style={styles.infoContent}>
                        <Text style={styles.infoTitle}>Promotion Guidelines</Text>
                        <Text style={styles.infoText}>
                            Ensure all promotion details are accurate. Once active, this promotion will be available to customers within the specified date range.
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <Button
                        title="Reset Changes"
                        variant="outline"
                        onPress={handleReset}
                        icon={<RotateCcw size={16} color={colors.textSecondary} />}
                    />

                    <Button
                        title={promotion ? 'Update Promotion' : 'Create Promotion'}
                        variant="primary"
                        onPress={handleSubmit}
                        loading={isSubmitting}
                        disabled={isSubmitting}
                        icon={<Save size={16} color={colors.white} />}
                    />

                    {onCancel && (
                        <Button
                            title="Cancel"
                            variant="ghost"
                            onPress={onCancel}
                            disabled={isSubmitting}
                            icon={<X size={16} color={colors.textSecondary} />}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 16,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    sectionHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    field: {
        marginBottom: 12,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    dateField: {
        flex: 1,
    },
    switchContainer: {
        marginBottom: 12,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: colors.success + '15',
    },
    statusIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.success,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '15',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.error + '20',
    },
    errorIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        flex: 1,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.info + '15',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginTop: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.info + '20',
    },
    infoIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.info,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
        marginLeft: 12,
    },
    infoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    infoText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: colors.textSecondary,
    },
});

export default PromotionForm; 