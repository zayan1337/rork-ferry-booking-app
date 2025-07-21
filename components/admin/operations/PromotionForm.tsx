import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors } from "@/constants/adminColors";
import { Promotion } from "@/types/content";
import { useContentManagement } from "@/hooks/useContentManagement";
import {
    Percent,
    CheckCircle,
    AlertCircle,
    Save,
    RotateCcw,
    Info,
    Settings,
    Calendar,
    Users,
    Target,
} from "lucide-react-native";

// Components
import TextInput from "@/components/admin/TextInput";
import Button from "@/components/admin/Button";
import Switch from "@/components/admin/Switch";
import DatePicker from "@/components/DatePicker";

export interface PromotionFormData {
    name: string;
    description: string;
    discount_percentage: number;
    start_date: string;
    end_date: string;
    is_first_time_booking_only: boolean;
    is_active: boolean;
}

interface PromotionFormProps {
    promotion?: Promotion;
    onSubmit: (formData: PromotionFormData) => Promise<void>;
    onCancel?: () => void;
    isLoading?: boolean;
}

interface ValidationErrors {
    name?: string;
    description?: string;
    discount_percentage?: string;
    start_date?: string;
    end_date?: string;
    general?: string;
}

const PromotionForm: React.FC<PromotionFormProps> = ({
    promotion,
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const { validatePromotionData } = useContentManagement();

    const [formData, setFormData] = useState<PromotionFormData>({
        name: promotion?.name || '',
        description: promotion?.description || '',
        discount_percentage: promotion?.discount_percentage || 0,
        start_date: promotion?.start_date ? promotion.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        end_date: promotion?.end_date ? promotion.end_date.split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_first_time_booking_only: promotion?.is_first_time_booking_only || false,
        is_active: promotion?.is_active ?? true,
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Track form changes
    useEffect(() => {
        if (promotion && promotion.start_date && promotion.end_date) {
            const hasFormChanges =
                formData.name !== promotion.name ||
                formData.description !== (promotion.description || '') ||
                formData.discount_percentage !== promotion.discount_percentage ||
                formData.start_date !== promotion.start_date.split('T')[0] ||
                formData.end_date !== promotion.end_date.split('T')[0] ||
                formData.is_first_time_booking_only !== promotion.is_first_time_booking_only ||
                formData.is_active !== promotion.is_active;
            setHasChanges(hasFormChanges);
        } else {
            const hasFormChanges =
                formData.name.trim() !== '' ||
                formData.description.trim() !== '' ||
                formData.discount_percentage !== 0 ||
                formData.start_date !== new Date().toISOString().split('T')[0] ||
                formData.end_date !== new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ||
                formData.is_first_time_booking_only !== false ||
                formData.is_active !== true;
            setHasChanges(hasFormChanges);
        }
    }, [formData, promotion]);

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            errors.name = 'Promotion name is required';
        } else if (formData.name.trim().length < 3) {
            errors.name = 'Promotion name must be at least 3 characters';
        }

        // Description validation
        if (!formData.description.trim()) {
            errors.description = 'Description is required';
        } else if (formData.description.trim().length < 10) {
            errors.description = 'Description must be at least 10 characters';
        }

        // Discount validation
        if (formData.discount_percentage <= 0) {
            errors.discount_percentage = 'Discount percentage must be greater than 0';
        } else if (formData.discount_percentage > 100) {
            errors.discount_percentage = 'Discount percentage cannot exceed 100%';
        }

        // Date validation
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);

        if (startDate >= endDate) {
            errors.end_date = 'End date must be after start date';
        }

        // Additional validation using content management
        if (validatePromotionData) {
            const validation = validatePromotionData(formData);
            if (!validation.isValid) {
                Object.assign(errors, validation.errors);
            }
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setValidationErrors({});

        try {
            await onSubmit(formData);

            // Reset form if creating new promotion
            if (!promotion) {
                setFormData({
                    name: '',
                    description: '',
                    discount_percentage: 0,
                    start_date: new Date().toISOString().split('T')[0],
                    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    is_first_time_booking_only: false,
                    is_active: true,
                });
                setHasChanges(false);
            }
        } catch (error) {
            console.error('Error saving promotion:', error);
            const errorMessage = error instanceof Error ? error.message :
                (promotion
                    ? "Failed to update promotion. Please check your connection and try again."
                    : "Failed to create promotion. Please check your connection and try again.");
            setValidationErrors({ general: errorMessage });
        }
    };

    const handleReset = () => {
        if (promotion && promotion.start_date && promotion.end_date) {
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
                end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                is_first_time_booking_only: false,
                is_active: true,
            });
        }
        setValidationErrors({});
        setHasChanges(false);
    };

    const updateField = (field: keyof PromotionFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

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
                            ? 'Update promotion information and settings'
                            : 'Add a new promotion to offer discounts to customers'
                        }
                    </Text>
                </View>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Basic Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Info size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Promotion Name"
                            value={formData.name}
                            onChangeText={(text) => updateField('name', text)}
                            placeholder="Promotion name (e.g., Summer Special, Early Bird)"
                            error={validationErrors.name}
                            required
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Description"
                            value={formData.description}
                            onChangeText={(text) => updateField('description', text)}
                            placeholder="Describe this promotion and its benefits"
                            error={validationErrors.description}
                            multiline
                            required
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Discount Percentage"
                            value={formData.discount_percentage.toString()}
                            onChangeText={(text) => updateField('discount_percentage', parseFloat(text) || 0)}
                            placeholder="Enter discount percentage (e.g., 15)"
                            error={validationErrors.discount_percentage}
                            keyboardType="numeric"
                            required
                        />
                    </View>
                </View>

                {/* Schedule Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Calendar size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Schedule</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>Start Date</Text>
                        <DatePicker
                            value={formData.start_date}
                            onChange={(date) => updateField('start_date', date)}
                            placeholder="Select start date"
                            error={validationErrors.start_date}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.fieldLabel}>End Date</Text>
                        <DatePicker
                            value={formData.end_date}
                            onChange={(date) => updateField('end_date', date)}
                            placeholder="Select end date"
                            error={validationErrors.end_date}
                        />
                    </View>
                </View>

                {/* Target Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Target size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Target Audience</Text>
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="First-Time Customers Only"
                            value={formData.is_first_time_booking_only}
                            onValueChange={(value) => updateField('is_first_time_booking_only', value)}
                            description="Limit this promotion to customers making their first booking"
                        />
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[
                            styles.sectionHeaderIcon,
                            { backgroundColor: formData.is_active ? colors.successLight : colors.backgroundTertiary }
                        ]}>
                            <Settings size={20} color={formData.is_active ? colors.success : colors.textSecondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Settings</Text>
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="Active Status"
                            value={formData.is_active}
                            onValueChange={(value) => updateField('is_active', value)}
                            description="Enable this promotion for customer bookings"
                        />
                    </View>
                </View>

                {/* Error Display */}
                {validationErrors.general && (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorIcon}>
                            <AlertCircle size={16} color={colors.error} />
                        </View>
                        <Text style={styles.errorText}>{validationErrors.general}</Text>
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <Button
                        title={promotion ? 'Update Promotion' : 'Create Promotion'}
                        onPress={handleSubmit}
                        loading={isLoading}
                        disabled={isLoading || !hasChanges}
                        variant="primary"
                        icon={<Save size={20} color={hasChanges ? colors.white : colors.textSecondary} />}
                    />

                    {hasChanges && (
                        <Button
                            title="Reset Changes"
                            onPress={handleReset}
                            variant="outline"
                            disabled={isLoading}
                            icon={<RotateCcw size={20} color={colors.primary} />}
                        />
                    )}
                </View>

                {/* Form Status */}
                {hasChanges && (
                    <View style={styles.statusContainer}>
                        <View style={styles.statusIcon}>
                            <AlertCircle size={14} color={colors.warning} />
                        </View>
                        <Text style={styles.statusText}>
                            You have unsaved changes
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 24,
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
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 20,
        fontWeight: "500",
    },
    scrollView: {
        flex: 1,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        gap: 12,
    },
    sectionHeaderIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 24,
    },
    formGroup: {
        marginBottom: 20,
    },
    fieldLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 8,
    },
    switchContainer: {
        marginBottom: 8,
    },
    errorContainer: {
        flexDirection: "row",
        alignItems: "center",
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
        backgroundColor: colors.error + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    errorText: {
        fontSize: 14,
        color: colors.error,
        flex: 1,
        fontWeight: "600",
        lineHeight: 18,
    },
    buttonContainer: {
        gap: 16,
        marginBottom: 20,
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
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
        backgroundColor: colors.warning + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    statusText: {
        fontSize: 13,
        color: colors.warning,
        fontWeight: "600",
    },
});

export default PromotionForm; 