import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { colors } from "@/constants/adminColors";
// UPDATED: Use AdminManagement types for consistency
import { AdminManagement } from "@/types";
// UPDATED: Replace old stores with new implementation
import { useIslandManagement } from "@/hooks/useIslandManagement";
import { useZoneStore } from "@/store/admin/zoneStore";
import {
    MapPin,
    Activity,
    CheckCircle,
    AlertCircle,
    Save,
    RotateCcw,
    Info,
    Zap,
    Globe,
    Hash,
} from "lucide-react-native";

// Components
import TextInput from "@/components/admin/TextInput";
import Button from "@/components/admin/Button";
import Dropdown from "@/components/admin/Dropdown";
import Switch from "@/components/admin/Switch";

type Island = AdminManagement.Island;
type Zone = AdminManagement.Zone;

interface IslandFormProps {
    initialData?: Island; // Use new Island type
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

interface FormData {
    name: string;
    zone_id: string;
    zone: string; // Keep for backward compatibility
    is_active: boolean;
}

interface ValidationErrors {
    name?: string;
    zone_id?: string;
    general?: string;
}

export default function IslandForm({ initialData, onSuccess, onError }: IslandFormProps) {
    // UPDATED: Use new island management and zone store
    const {
        create: addIsland,
        update: updateIslandData,
        validateData,
    } = useIslandManagement();

    const {
        data: zones,
        fetchAll: fetchZones
    } = useZoneStore();

    const [formData, setFormData] = useState<FormData>({
        name: initialData?.name || '',
        zone_id: initialData?.zone_id || '',
        zone: initialData?.zone || '', // Backward compatibility
        is_active: initialData?.is_active ?? true,
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch zones on component mount
    useEffect(() => {
        if (!zones || zones.length === 0) {
            fetchZones();
        }
    }, [zones, fetchZones]);

    // Track form changes
    useEffect(() => {
        if (initialData) {
            const hasFormChanges =
                formData.name !== initialData.name ||
                formData.zone_id !== (initialData.zone_id || '') ||
                formData.is_active !== initialData.is_active;
            setHasChanges(hasFormChanges);
        } else {
            const hasFormChanges =
                formData.name.trim() !== '' ||
                formData.zone_id !== '' ||
                formData.is_active !== true;
            setHasChanges(hasFormChanges);
        }
    }, [formData, initialData]);

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};

        // UPDATED: Use new validation method
        const validation = validateData({
            name: formData.name,
            zone_id: formData.zone_id,
        });

        if (!validation.isValid) {
            Object.assign(errors, validation.errors);
        }

        // Zone validation
        if (!formData.zone_id) {
            errors.zone_id = 'Zone is required';
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
            // Get selected zone for backward compatibility
            const selectedZone = zones?.find(z => z.id === formData.zone_id);
            const submitData = {
                name: formData.name.trim(),
                zone_id: formData.zone_id,
                zone: selectedZone?.name || formData.zone, // Backward compatibility
                is_active: formData.is_active,
            };

            if (initialData) {
                // UPDATED: Use new update method
                await updateIslandData(initialData.id, submitData);
            } else {
                // UPDATED: Use new create method
                await addIsland(submitData);
            }

            // Reset form if creating new island
            if (!initialData) {
                setFormData({
                    name: '',
                    zone_id: '',
                    zone: '',
                    is_active: true,
                });
                setHasChanges(false);
            }

            // Let parent handle success notification
            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error saving island:', error);
            const errorMessage = error instanceof Error ? error.message :
                (initialData
                    ? "Failed to update island. Please check your connection and try again."
                    : "Failed to create island. Please check your connection and try again.");
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
                zone_id: initialData.zone_id || '',
                zone: initialData.zone || '',
                is_active: initialData.is_active,
            });
        } else {
            setFormData({
                name: '',
                zone_id: '',
                zone: '',
                is_active: true,
            });
        }
        setValidationErrors({});
        setHasChanges(false);
    };

    const getZoneDescription = (zoneId: string) => {
        const zone = zones?.find(z => z.id === zoneId);
        if (!zone) return '';

        return zone.description || `${zone.name} - ${zone.code}`;
    };

    const getZoneColor = (zoneId: string) => {
        const zone = zones?.find(z => z.id === zoneId);
        if (!zone) return colors.textSecondary;

        // Generate color based on zone index for consistency
        const zoneIndex = zones?.findIndex(z => z.id === zoneId) || 0;
        const colorOptions = [colors.primary, colors.info, colors.success, colors.warning];
        return colorOptions[zoneIndex % colorOptions.length];
    };

    // Convert zones to dropdown options
    const zoneOptions = (zones || []).map(zone => ({
        label: `${zone.name} (${zone.code})`,
        value: zone.id,
    }));

    const selectedZone = zones?.find(z => z.id === formData.zone_id);

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
                            value={formData.zone_id}
                            onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                zone_id: value,
                                zone: zones?.find(z => z.id === value)?.name || ''
                            }))}
                            options={zoneOptions}
                            placeholder="Select zone"
                            error={validationErrors.zone_id}
                            required
                        />
                        {selectedZone && (
                            <View style={[
                                styles.zoneDescription,
                                { backgroundColor: getZoneColor(formData.zone_id) + '10' }
                            ]}>
                                <View style={[
                                    styles.zoneDescriptionIcon,
                                    { backgroundColor: getZoneColor(formData.zone_id) + '20' }
                                ]}>
                                    <Globe size={14} color={getZoneColor(formData.zone_id)} />
                                </View>
                                <View style={styles.zoneDescriptionContent}>
                                    <Text style={[
                                        styles.zoneDescriptionTitle,
                                        { color: getZoneColor(formData.zone_id) }
                                    ]}>
                                        {selectedZone.name} ({selectedZone.code})
                                    </Text>
                                    <Text style={[
                                        styles.zoneDescriptionText,
                                        { color: getZoneColor(formData.zone_id) }
                                    ]}>
                                        {selectedZone.description || 'Zone for ferry operations and island management'}
                                    </Text>
                                    {selectedZone.total_islands !== undefined && (
                                        <Text style={[
                                            styles.zoneDescriptionStats,
                                            { color: getZoneColor(formData.zone_id) }
                                        ]}>
                                            {selectedZone.total_islands} island(s) • {selectedZone.total_routes || 0} route(s)
                                        </Text>
                                    )}
                                </View>
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
    zoneDescription: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        borderLeftWidth: 3,
    },
    zoneDescriptionIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    zoneDescriptionContent: {
        flex: 1,
        gap: 4,
    },
    zoneDescriptionTitle: {
        fontSize: 14,
        fontWeight: "700",
        lineHeight: 18,
    },
    zoneDescriptionText: {
        fontSize: 13,
        fontWeight: "500",
        lineHeight: 18,
        opacity: 0.8,
    },
    zoneDescriptionStats: {
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 16,
        opacity: 0.7,
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