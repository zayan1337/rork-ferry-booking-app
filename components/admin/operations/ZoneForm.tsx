import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors } from "@/constants/adminColors";
import { AdminManagement } from "@/types";
import { useZoneManagement } from "@/hooks/useZoneManagement";

type Zone = AdminManagement.Zone;
type ZoneFormData = AdminManagement.ZoneFormData;
import {
    Globe,
    MapPin,
    CheckCircle,
    AlertCircle,
    Save,
    RotateCcw,
    Info,
    Hash,
    FileText,
    Settings,
    Activity,
} from "lucide-react-native";

// Components
import TextInput from "@/components/admin/TextInput";
import Button from "@/components/admin/Button";
import Switch from "@/components/admin/Switch";
import Dropdown from "@/components/admin/Dropdown";

interface ZoneFormProps {
    initialData?: Zone;
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

interface ValidationErrors {
    name?: string;
    code?: string;
    description?: string;
    order_index?: string;
    general?: string;
}

export default function ZoneForm({ initialData, onSuccess, onError }: ZoneFormProps) {
    const {
        zones,
        createZone,
        updateZone,
        getAvailableZoneOrderOptions,
        getSuggestedZoneOrder,
        validateZoneOrder
    } = useZoneManagement();

    const [formData, setFormData] = useState<ZoneFormData>({
        name: initialData?.name || '',
        code: initialData?.code || '',
        description: initialData?.description || '',
        is_active: initialData?.is_active ?? true,
        order_index: initialData?.order_index ?? getSuggestedZoneOrder(),
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const isEditing = !!initialData;

    // Track form changes
    useEffect(() => {
        if (initialData) {
            const hasFormChanges =
                formData.name !== initialData.name ||
                formData.code !== initialData.code ||
                formData.description !== initialData.description ||
                formData.is_active !== initialData.is_active ||
                formData.order_index !== initialData.order_index;
            setHasChanges(hasFormChanges);
        } else {
            const hasFormChanges =
                formData.name.trim() !== '' ||
                formData.code.trim() !== '' ||
                (formData.description && formData.description.trim() !== '') ||
                formData.is_active !== true ||
                formData.order_index !== getSuggestedZoneOrder();
            setHasChanges(hasFormChanges);
        }
    }, [formData, initialData, getSuggestedZoneOrder]);

    // Set suggested order for new zones
    useEffect(() => {
        if (!isEditing && formData.order_index === 0) {
            const suggestedOrder = getSuggestedZoneOrder();
            setFormData(prev => ({ ...prev, order_index: suggestedOrder }));
        }
    }, [isEditing, getSuggestedZoneOrder, formData.order_index]);

    // Get available order options
    const orderOptions = getAvailableZoneOrderOptions().map(option => ({
        label: option.label,
        value: option.value.toString()
    }));

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            errors.name = 'Zone name is required';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Zone name must be at least 2 characters long';
        } else if (formData.name.trim().length > 100) {
            errors.name = 'Zone name must be less than 100 characters';
        } else if (!/^[a-zA-Z0-9\s.-]+$/.test(formData.name.trim())) {
            errors.name = 'Zone name can only contain letters, numbers, spaces, dots, and dashes';
        }

        // Code validation
        if (!formData.code.trim()) {
            errors.code = 'Zone code is required';
        } else if (formData.code.trim().length < 2) {
            errors.code = 'Zone code must be at least 2 characters long';
        } else if (formData.code.trim().length > 10) {
            errors.code = 'Zone code must be less than 10 characters';
        } else if (!/^[A-Z0-9_-]+$/.test(formData.code.trim())) {
            errors.code = 'Zone code can only contain uppercase letters, numbers, underscores, and dashes';
        }

        // Check for duplicates
        if (zones) {
            const existingZoneWithSameName = zones.find(zone =>
                zone.name.toLowerCase() === formData.name.trim().toLowerCase() &&
                zone.id !== initialData?.id
            );
            if (existingZoneWithSameName) {
                errors.name = 'Zone name already exists';
            }

            const existingZoneWithSameCode = zones.find(zone =>
                zone.code.toLowerCase() === formData.code.trim().toLowerCase() &&
                zone.id !== initialData?.id
            );
            if (existingZoneWithSameCode) {
                errors.code = 'Zone code already exists';
            }
        }

        // Description validation (optional)
        if (formData.description && formData.description.trim().length > 500) {
            errors.description = 'Description must be less than 500 characters';
        }

        // Order index validation using the new validation function
        const orderValidation = validateZoneOrder(formData.order_index, initialData?.id);
        if (!orderValidation.isValid) {
            errors.order_index = orderValidation.error;
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setValidationErrors({});

        try {
            let success = false;

            if (initialData) {
                // Update existing zone
                await updateZone(initialData.id, {
                    name: formData.name.trim(),
                    code: formData.code.trim().toUpperCase(),
                    description: formData.description ? formData.description.trim() : '',
                    is_active: formData.is_active,
                    order_index: formData.order_index,
                });
                success = true;
            } else {
                // Create new zone
                await createZone({
                    name: formData.name.trim(),
                    code: formData.code.trim().toUpperCase(),
                    description: formData.description ? formData.description.trim() : '',
                    is_active: formData.is_active,
                    order_index: formData.order_index,
                });
                success = true;
            }

            if (success) {
                // Reset form if creating new zone
                if (!initialData) {
                    setFormData({
                        name: '',
                        code: '',
                        description: '',
                        is_active: true,
                        order_index: getSuggestedZoneOrder(),
                    });
                    setHasChanges(false);
                }

                // Let parent handle success notification
                if (onSuccess) {
                    onSuccess();
                }
            }
        } catch (error) {
            console.error('Error saving zone:', error);
            const errorMessage = initialData
                ? "Failed to update zone. Please check your connection and try again."
                : "Failed to create zone. Please check your connection and try again.";
            setValidationErrors({ general: errorMessage });
            if (onError) {
                onError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                code: initialData.code,
                description: initialData.description || '',
                is_active: initialData.is_active,
                order_index: initialData.order_index,
            });
        } else {
            setFormData({
                name: '',
                code: '',
                description: '',
                is_active: true,
                order_index: getSuggestedZoneOrder(),
            });
        }
        setValidationErrors({});
        setHasChanges(false);
    };

    const getZoneStatusDescription = (is_active: boolean) => {
        return is_active
            ? 'Zone is active and visible to users'
            : 'Zone is inactive and hidden from users';
    };

    const getZoneStatusColor = (is_active: boolean) => {
        return is_active ? colors.success : colors.textSecondary;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Globe size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {initialData ? 'Edit Zone' : 'Create New Zone'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {initialData
                            ? 'Update zone information and settings'
                            : 'Add a new zone to organize islands'
                        }
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
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
                            label="Zone Name"
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            placeholder="Enter zone name (e.g., North Zone, Male Zone)"
                            error={validationErrors.name}
                            required
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Zone Code"
                            value={formData.code}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, code: text.toUpperCase() }))}
                            placeholder="Enter zone code (e.g., NORTH, MALE)"
                            error={validationErrors.code}
                            required
                        />
                        <View style={styles.codeDescription}>
                            <View style={styles.codeDescriptionIcon}>
                                <Hash size={14} color={colors.info} />
                            </View>
                            <Text style={styles.codeDescriptionText}>
                                Unique code used to identify this zone (uppercase letters, numbers, underscores, and dashes only)
                            </Text>
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Description"
                            value={formData.description}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                            placeholder="Enter zone description (optional)"
                            error={validationErrors.description}
                            multiline
                            numberOfLines={3}
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Dropdown
                            label="Order Index"
                            value={formData.order_index.toString()}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, order_index: parseInt(value) || 0 }))}
                            options={orderOptions}
                            placeholder="Select order position"
                            error={validationErrors.order_index}
                        />
                        <View style={styles.orderDescription}>
                            <View style={styles.orderDescriptionIcon}>
                                <Activity size={14} color={colors.info} />
                            </View>
                            <Text style={styles.orderDescriptionText}>
                                Choose where this zone should appear in the list
                            </Text>
                        </View>
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
                            onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                            description={getZoneStatusDescription(formData.is_active)}
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
                        title={initialData ? 'Update Zone' : 'Create Zone'}
                        onPress={handleSubmit}
                        loading={loading}
                        disabled={loading || !hasChanges}
                        variant="primary"
                        icon={<Save size={20} color={hasChanges ? colors.white : colors.textSecondary} />}
                    />

                    {hasChanges && (
                        <Button
                            title="Reset Changes"
                            onPress={handleReset}
                            variant="outline"
                            disabled={loading}
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
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
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
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 6,
        lineHeight: 30,
    },
    subtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
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
        marginBottom: 24,
    },
    sectionHeaderIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
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
    codeDescription: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.infoLight,
        borderLeftWidth: 3,
        borderLeftColor: colors.info,
    },
    codeDescriptionIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    codeDescriptionText: {
        fontSize: 13,
        flex: 1,
        color: colors.info,
        fontWeight: "600",
        lineHeight: 18,
    },
    orderDescription: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.infoLight,
        borderLeftWidth: 3,
        borderLeftColor: colors.info,
    },
    orderDescriptionIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    orderDescriptionText: {
        fontSize: 13,
        flex: 1,
        color: colors.info,
        fontWeight: "600",
        lineHeight: 18,
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