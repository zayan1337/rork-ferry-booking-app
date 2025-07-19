import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TouchableOpacity,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Promotion, PromotionFormData } from '@/types/content';
import { validatePromotionData } from '@/utils/contentUtils';
import {
    Percent,
    Calendar,
    Users,
    Check,
    X,
    Info,
} from 'lucide-react-native';

// Components
import TextInput from '@/components/admin/TextInput';
import Button from '@/components/admin/Button';
import Switch from '@/components/admin/Switch';

interface PromotionFormProps {
    promotion?: Promotion;
    onSubmit: (data: PromotionFormData) => Promise<void>;
    onCancel: () => void;
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

    const handleSubmit = async () => {
        if (!validateForm()) {
            Alert.alert('Validation Error', 'Please fix the errors before submitting.');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting promotion:', error);
            Alert.alert('Error', 'Failed to save promotion. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = <K extends keyof PromotionFormData>(
        field: K,
        value: PromotionFormData[K]
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const getStatusColor = () => {
        if (!formData.is_active) return colors.textSecondary;

        const now = new Date();
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);

        if (start > now) return colors.warning; // Upcoming
        if (end < now) return colors.error; // Expired
        return colors.success; // Current
    };

    const getStatusText = () => {
        if (!formData.is_active) return 'Inactive';

        const now = new Date();
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);

        if (start > now) return 'Upcoming';
        if (end < now) return 'Expired';
        return 'Active';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Percent size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>
                            {promotion ? 'Edit Promotion' : 'Create New Promotion'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {promotion ? 'Update promotion details' : 'Set up a new promotional offer'}
                        </Text>
                    </View>
                </View>

                {/* Status Indicator */}
                <View style={styles.statusContainer}>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() + '15' }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                        <Text style={[styles.statusText, { color: getStatusColor() }]}>
                            {getStatusText()}
                        </Text>
                    </View>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                    {/* Promotion Name */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Promotion Name *</Text>
                        <TextInput
                            value={formData.name}
                            onChangeText={(value) => updateField('name', value)}
                            placeholder="Enter promotion name"
                            error={errors.name}
                            maxLength={100}
                            autoCapitalize="words"
                        />
                        <Text style={styles.fieldHelp}>
                            Choose a clear and attractive name for your promotion
                        </Text>
                    </View>

                    {/* Description */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            value={formData.description}
                            onChangeText={(value) => updateField('description', value)}
                            placeholder="Enter promotion description"
                            error={errors.description}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                            style={styles.textArea}
                        />
                        <Text style={styles.fieldHelp}>
                            Optional description to explain the promotion details
                        </Text>
                    </View>

                    {/* Discount Percentage */}
                    <View style={styles.field}>
                        <Text style={styles.label}>Discount Percentage *</Text>
                        <TextInput
                            value={formData.discount_percentage.toString()}
                            onChangeText={(value) => {
                                const numValue = parseFloat(value) || 0;
                                updateField('discount_percentage', Math.min(100, Math.max(0, numValue)));
                            }}
                            placeholder="Enter discount percentage"
                            error={errors.discount_percentage}
                            keyboardType="numeric"
                            maxLength={5}
                        />
                        <Text style={styles.fieldHelp}>
                            Discount percentage (0-100%)
                        </Text>
                    </View>

                    {/* Date Range */}
                    <View style={styles.dateRow}>
                        <View style={[styles.field, styles.dateField]}>
                            <Text style={styles.label}>Start Date *</Text>
                            <TextInput
                                value={formData.start_date}
                                onChangeText={(value) => updateField('start_date', value)}
                                placeholder="YYYY-MM-DD"
                                error={errors.start_date}
                                keyboardType="default"
                            />
                        </View>

                        <View style={[styles.field, styles.dateField]}>
                            <Text style={styles.label}>End Date *</Text>
                            <TextInput
                                value={formData.end_date}
                                onChangeText={(value) => updateField('end_date', value)}
                                placeholder="YYYY-MM-DD"
                                error={errors.end_date}
                                keyboardType="default"
                            />
                        </View>
                    </View>

                    {/* First Time Booking Only */}
                    <View style={styles.field}>
                        <View style={styles.switchRow}>
                            <View style={styles.switchLabel}>
                                <Users size={20} color={colors.textSecondary} />
                                <View style={styles.switchText}>
                                    <Text style={styles.label}>First-time Bookings Only</Text>
                                    <Text style={styles.fieldHelp}>
                                        Restrict this promotion to first-time customers only
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={formData.is_first_time_booking_only}
                                onValueChange={(value) => updateField('is_first_time_booking_only', value)}
                            />
                        </View>
                    </View>

                    {/* Active Status */}
                    <View style={styles.field}>
                        <View style={styles.switchRow}>
                            <View style={styles.switchLabel}>
                                <View style={styles.switchText}>
                                    <Text style={styles.label}>Active Status</Text>
                                    <Text style={styles.fieldHelp}>
                                        Enable or disable this promotion
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={formData.is_active}
                                onValueChange={(value) => updateField('is_active', value)}
                            />
                        </View>
                    </View>

                    {/* Preview */}
                    <View style={styles.previewContainer}>
                        <Text style={styles.previewTitle}>Preview</Text>
                        <View style={styles.previewCard}>
                            <View style={styles.previewHeader}>
                                <View style={styles.previewIcon}>
                                    <Percent size={20} color={colors.primary} />
                                </View>
                                <View style={styles.previewText}>
                                    <Text style={styles.previewName}>
                                        {formData.name || 'Promotion Name'}
                                    </Text>
                                    <Text style={styles.previewDiscount}>
                                        {formData.discount_percentage}% OFF
                                    </Text>
                                </View>
                            </View>
                            {formData.description && (
                                <Text style={styles.previewDescription}>
                                    {formData.description}
                                </Text>
                            )}
                            <View style={styles.previewFooter}>
                                <Calendar size={14} color={colors.textSecondary} />
                                <Text style={styles.previewDates}>
                                    {formData.start_date} - {formData.end_date}
                                </Text>
                                {formData.is_first_time_booking_only && (
                                    <View style={styles.previewBadge}>
                                        <Users size={12} color={colors.secondary} />
                                        <Text style={styles.previewBadgeText}>First-time only</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Button
                        title="Cancel"
                        variant="ghost"
                        onPress={onCancel}
                        disabled={isSubmitting || isLoading}
                        icon={<X size={16} color={colors.textSecondary} />}
                    />
                    <Button
                        title={promotion ? 'Update Promotion' : 'Create Promotion'}
                        variant="primary"
                        onPress={handleSubmit}
                        disabled={isSubmitting || isLoading}
                        loading={isSubmitting || isLoading}
                        icon={<Check size={16} color={colors.white} />}
                    />
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
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
    headerText: {
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
    statusContainer: {
        marginBottom: 24,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    form: {
        gap: 20,
    },
    field: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    fieldHelp: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
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
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    switchLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    switchText: {
        flex: 1,
        gap: 4,
    },
    previewContainer: {
        marginTop: 12,
        gap: 12,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    previewCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    previewIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewText: {
        flex: 1,
    },
    previewName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    previewDiscount: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.success,
    },
    previewDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    previewFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    previewDates: {
        fontSize: 12,
        color: colors.textSecondary,
        flex: 1,
    },
    previewBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.secondary + '15',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    previewBadgeText: {
        fontSize: 10,
        fontWeight: '500',
        color: colors.secondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
        paddingBottom: 20,
    },
});

export default PromotionForm; 