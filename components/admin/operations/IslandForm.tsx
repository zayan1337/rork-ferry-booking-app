import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { colors } from "@/constants/adminColors";
import { DatabaseIsland } from "@/types/database";
import { useOperationsStore } from "@/store/admin/operationsStore";
import {
    MapPin,
    Activity,
    CheckCircle,
    AlertCircle,
    Save,
    RotateCcw,
    Info,
    Zap,
} from "lucide-react-native";

// Components
import TextInput from "@/components/admin/TextInput";
import Button from "@/components/admin/Button";
import Dropdown from "@/components/admin/Dropdown";
import Switch from "@/components/admin/Switch";

interface IslandFormProps {
    initialData?: DatabaseIsland;
    onSuccess?: (island: DatabaseIsland) => void;
    onError?: (error: string) => void;
}

interface FormData {
    name: string;
    zone: "A" | "B";
    is_active: boolean;
}

interface ValidationErrors {
    name?: string;
    zone?: string;
    general?: string;
}

const ZONE_OPTIONS = [
    { label: 'Zone A', value: 'A' },
    { label: 'Zone B', value: 'B' },
];

export default function IslandForm({ initialData, onSuccess, onError }: IslandFormProps) {
    const { addIsland, updateIslandData } = useOperationsStore();

    const [formData, setFormData] = useState<FormData>({
        name: initialData?.name || '',
        zone: (initialData?.zone as "A" | "B") || 'A',
        is_active: initialData?.is_active ?? true,
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Track form changes
    useEffect(() => {
        if (initialData) {
            const hasFormChanges =
                formData.name !== initialData.name ||
                formData.zone !== (initialData.zone as "A" | "B") ||
                formData.is_active !== initialData.is_active;
            setHasChanges(hasFormChanges);
        } else {
            const hasFormChanges =
                formData.name.trim() !== '' ||
                formData.zone !== 'A' ||
                formData.is_active !== true;
            setHasChanges(hasFormChanges);
        }
    }, [formData, initialData]);

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            errors.name = 'Island name is required';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Island name must be at least 2 characters long';
        } else if (formData.name.trim().length > 100) {
            errors.name = 'Island name must be less than 100 characters';
        } else if (!/^[a-zA-Z0-9\s.-]+$/.test(formData.name.trim())) {
            errors.name = 'Island name can only contain letters, numbers, spaces, dots, and dashes';
        }

        // Zone validation
        if (!formData.zone) {
            errors.zone = 'Zone is required';
        } else if (!ZONE_OPTIONS.find(option => option.value === formData.zone)) {
            errors.zone = 'Please select a valid zone';
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
                // Update existing island
                success = await updateIslandData(initialData.id, {
                    name: formData.name.trim(),
                    zone: formData.zone as any,
                    is_active: formData.is_active,
                });
            } else {
                // Create new island
                success = await addIsland({
                    name: formData.name.trim(),
                    zone: formData.zone as any,
                    is_active: formData.is_active,
                });
            }

            if (success) {
                Alert.alert(
                    "Success",
                    initialData ? "Island updated successfully" : "Island created successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                if (onSuccess) {
                                    onSuccess(formData as any);
                                }
                            }
                        }
                    ]
                );

                // Reset form if creating new island
                if (!initialData) {
                    setFormData({
                        name: '',
                        zone: 'A',
                        is_active: true,
                    });
                    setHasChanges(false);
                }
            } else {
                const errorMessage = initialData
                    ? "Failed to update island"
                    : "Failed to create island";
                setValidationErrors({ general: errorMessage });
                if (onError) {
                    onError(errorMessage);
                }
            }
        } catch (error) {
            console.error('Error saving island:', error);
            const errorMessage = initialData
                ? "Failed to update island. Please check your connection and try again."
                : "Failed to create island. Please check your connection and try again.";
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
                zone: initialData.zone as "A" | "B",
                is_active: initialData.is_active,
            });
        } else {
            setFormData({
                name: '',
                zone: 'A',
                is_active: true,
            });
        }
        setValidationErrors({});
        setHasChanges(false);
    };

    const getZoneDescription = (zone: string) => {
        switch (zone) {
            case 'A':
                return 'Zone A - Primary ferry routes and main destinations';
            case 'B':
                return 'Zone B - Secondary routes and outer islands';
            default:
                return '';
        }
    };

    const getZoneColor = (zone: string) => {
        switch (zone) {
            case 'A':
                return colors.primary;
            case 'B':
                return colors.info;
            default:
                return colors.textSecondary;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MapPin size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {initialData ? 'Edit Island' : 'Create New Island'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {initialData
                            ? 'Update island information and settings'
                            : 'Add a new island to the ferry network'
                        }
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
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Island Name"
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            placeholder="Enter island name (e.g., Malé, Hulhumalé)"
                            error={validationErrors.name}
                            required
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Dropdown
                            label="Zone"
                            value={formData.zone}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, zone: value as "A" | "B" }))}
                            options={ZONE_OPTIONS}
                            placeholder="Select zone"
                            error={validationErrors.zone}
                            required
                        />
                        {formData.zone && (
                            <View style={[
                                styles.zoneDescription,
                                { backgroundColor: getZoneColor(formData.zone) + '10' }
                            ]}>
                                <View style={[
                                    styles.zoneDescriptionIcon,
                                    { backgroundColor: getZoneColor(formData.zone) + '20' }
                                ]}>
                                    <Info size={14} color={getZoneColor(formData.zone)} />
                                </View>
                                <Text style={[
                                    styles.zoneDescriptionText,
                                    { color: getZoneColor(formData.zone) }
                                ]}>
                                    {getZoneDescription(formData.zone)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[
                            styles.sectionHeaderIcon,
                            { backgroundColor: formData.is_active ? colors.successLight : colors.backgroundTertiary }
                        ]}>
                            <Zap size={20} color={formData.is_active ? colors.success : colors.textSecondary} />
                        </View>
                        <Text style={styles.sectionTitle}>Settings</Text>
                    </View>

                    <View style={styles.switchContainer}>
                        <Switch
                            label="Active Status"
                            value={formData.is_active}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, is_active: value }))}
                            description="Enable this island for route creation and booking operations"
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
                        title={initialData ? 'Update Island' : 'Create Island'}
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
    zoneDescription: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
    },
    zoneDescriptionIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    zoneDescriptionText: {
        fontSize: 13,
        flex: 1,
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