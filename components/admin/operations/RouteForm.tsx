import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { colors } from "@/constants/adminColors";
import { RouteFormData } from "@/types/operations";
import { useOperationsStore } from "@/store/admin/operationsStore";
import {
    Route as RouteIcon,
    MapPin,
    DollarSign,
    AlertCircle,
    Save,
    RotateCcw,
    Info,
    Clock,
    Activity,
    Navigation,
    Settings,
} from "lucide-react-native";

// Components
import TextInput from "@/components/admin/TextInput";
import Button from "@/components/admin/Button";
import Dropdown from "@/components/admin/Dropdown";
import Switch from "@/components/admin/Switch";

interface RouteFormProps {
    routeId?: string;
    onSave?: (route: RouteFormData) => void;
    onCancel?: () => void;
}

interface FormData {
    name: string;
    from_island_id: string;
    to_island_id: string;
    base_fare: number;
    distance: string;
    duration: string;
    description: string;
    is_active: boolean;
}

interface ValidationErrors {
    name?: string;
    from_island_id?: string;
    to_island_id?: string;
    base_fare?: string;
    distance?: string;
    duration?: string;
    description?: string;
    general?: string;
}



export default function RouteForm({ routeId, onSave, onCancel }: RouteFormProps) {
    const { routes, islands, addRoute, updateRouteData, fetchIslands } = useOperationsStore();

    // Find current route data for editing
    const currentRoute = routeId ? routes?.find(r => r.id === routeId) : null;

    const [formData, setFormData] = useState<FormData>({
        name: currentRoute?.name || '',
        from_island_id: currentRoute?.from_island_id || '',
        to_island_id: currentRoute?.to_island_id || '',
        base_fare: currentRoute?.base_fare || 0,
        distance: currentRoute?.distance || '',
        duration: currentRoute?.duration || '',
        description: currentRoute?.description || '',
        is_active: currentRoute?.is_active ?? true,
    });

    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [loading, setLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Fetch islands on component mount
    useEffect(() => {
        if (!islands || islands.length === 0) {
            fetchIslands();
        }
    }, []);

    // Track form changes
    useEffect(() => {
        if (currentRoute) {
            const hasFormChanges =
                formData.name !== (currentRoute.name || '') ||
                formData.from_island_id !== (currentRoute.from_island_id || '') ||
                formData.to_island_id !== (currentRoute.to_island_id || '') ||
                formData.base_fare !== (currentRoute.base_fare || 0) ||
                formData.distance !== (currentRoute.distance || '') ||
                formData.duration !== (currentRoute.duration || '') ||
                formData.description !== (currentRoute.description || '') ||
                formData.is_active !== (currentRoute.is_active ?? true);
            setHasChanges(hasFormChanges);
        } else {
            const hasFormChanges =
                formData.name.trim() !== '' ||
                formData.from_island_id !== '' ||
                formData.to_island_id !== '' ||
                formData.base_fare !== 0 ||
                formData.distance.trim() !== '' ||
                formData.duration.trim() !== '' ||
                formData.description.trim() !== '' ||
                formData.is_active !== true;
            setHasChanges(hasFormChanges);
        }
    }, [formData, currentRoute]);

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};

        // Route name validation
        if (!formData.name.trim()) {
            errors.name = 'Route name is required';
        } else if (formData.name.trim().length < 3) {
            errors.name = 'Route name must be at least 3 characters long';
        } else if (formData.name.trim().length > 255) {
            errors.name = 'Route name must be less than 255 characters';
        }

        // Origin island validation
        if (!formData.from_island_id) {
            errors.from_island_id = 'Origin island is required';
        }

        // Destination island validation
        if (!formData.to_island_id) {
            errors.to_island_id = 'Destination island is required';
        }

        // Check for same origin and destination
        if (formData.from_island_id && formData.to_island_id && formData.from_island_id === formData.to_island_id) {
            errors.to_island_id = 'Origin and destination islands must be different';
        }

        // Base fare validation
        if (!formData.base_fare || formData.base_fare <= 0) {
            errors.base_fare = 'Base fare must be greater than 0';
        } else if (formData.base_fare > 10000) {
            errors.base_fare = 'Base fare seems too high (max: 10,000 MVR)';
        }

        // Distance validation (optional but if provided should be valid)
        if (formData.distance.trim() && !/^[\d.]+\s*(km|mi|miles|kilometers?)$/i.test(formData.distance.trim())) {
            errors.distance = 'Distance should be in format like "25 km" or "15 miles"';
        }

        // Duration validation (optional but if provided should be valid)
        if (formData.duration.trim() && !/^[\d.]+\s*(min|mins|minutes?|hr|hrs|hours?)$/i.test(formData.duration.trim())) {
            errors.duration = 'Duration should be in format like "30 min" or "2 hrs"';
        }

        // Description validation (optional but if provided should be reasonable length)
        if (formData.description.trim() && formData.description.trim().length > 1000) {
            errors.description = 'Description must be less than 1000 characters';
        }

        // Status validation is not needed for boolean switch

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

            if (currentRoute) {
                // Update existing route
                success = await updateRouteData(currentRoute.id, {
                    name: formData.name.trim(),
                    from_island_id: formData.from_island_id,
                    to_island_id: formData.to_island_id,
                    base_fare: formData.base_fare,
                    distance: formData.distance.trim(),
                    duration: formData.duration.trim(),
                    description: formData.description.trim(),
                    is_active: formData.is_active,
                });
            } else {
                // Create new route
                success = await addRoute({
                    name: formData.name.trim(),
                    from_island_id: formData.from_island_id,
                    to_island_id: formData.to_island_id,
                    base_fare: formData.base_fare,
                    distance: formData.distance.trim(),
                    duration: formData.duration.trim(),
                    description: formData.description.trim(),
                    is_active: formData.is_active,
                });
            }

            if (success) {
                Alert.alert(
                    "Success",
                    currentRoute ? "Route updated successfully" : "Route created successfully",
                    [
                        {
                            text: "OK",
                            onPress: () => {
                                if (onSave) {
                                    onSave(formData);
                                }
                            }
                        }
                    ]
                );

                // Reset form if creating new route
                if (!currentRoute) {
                    setFormData({
                        name: '',
                        from_island_id: '',
                        to_island_id: '',
                        base_fare: 0,
                        distance: '',
                        duration: '',
                        description: '',
                        is_active: true,
                    });
                    setHasChanges(false);
                }
            } else {
                const errorMessage = currentRoute
                    ? "Failed to update route"
                    : "Failed to create route";
                setValidationErrors({ general: errorMessage });
            }
        } catch (error) {
            console.error('Error saving route:', error);
            const errorMessage = currentRoute
                ? "Failed to update route. Please check your connection and try again."
                : "Failed to create route. Please check your connection and try again.";
            setValidationErrors({ general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (currentRoute) {
            setFormData({
                name: currentRoute.name || '',
                from_island_id: currentRoute.from_island_id || '',
                to_island_id: currentRoute.to_island_id || '',
                base_fare: currentRoute.base_fare || 0,
                distance: currentRoute.distance || '',
                duration: currentRoute.duration || '',
                description: currentRoute.description || '',
                is_active: currentRoute.is_active ?? true,
            });
        } else {
            setFormData({
                name: '',
                from_island_id: '',
                to_island_id: '',
                base_fare: 0,
                distance: '',
                duration: '',
                description: '',
                is_active: true,
            });
        }
        setValidationErrors({});
        setHasChanges(false);
    };

    const getStatusDescription = (status: string) => {
        switch (status) {
            case 'active':
                return 'Route is operational and available for trip scheduling';
            case 'inactive':
                return 'Route is temporarily disabled and not available for new trips';
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
            default:
                return colors.textSecondary;
        }
    };

    const islandOptions = (islands || []).map(island => ({
        label: island.name,
        value: island.id,
    }));

    const getSelectedIslandName = (islandId: string) => {
        const island = islands?.find(i => i.id === islandId);
        return island ? island.name : '';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <RouteIcon size={24} color={colors.primary} />
                </View>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {currentRoute ? 'Edit Route' : 'Create New Route'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {currentRoute
                            ? 'Update route information and settings'
                            : 'Add a new ferry route to the system'
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
                            label="Route Name"
                            value={formData.name}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                            placeholder="Enter route name (e.g., Malé to Hulhumalé)"
                            error={validationErrors.name}
                            required
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Description"
                            value={formData.description}
                            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                            placeholder="Enter route description (optional)"
                            multiline
                            numberOfLines={3}
                            error={validationErrors.description}
                        />
                    </View>
                </View>

                {/* Route Points */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <MapPin size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Route Points</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Dropdown
                            label="Origin Island"
                            value={formData.from_island_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, from_island_id: value }))}
                            options={islandOptions}
                            placeholder="Select origin island"
                            error={validationErrors.from_island_id}
                            required
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Dropdown
                            label="Destination Island"
                            value={formData.to_island_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, to_island_id: value }))}
                            options={islandOptions}
                            placeholder="Select destination island"
                            error={validationErrors.to_island_id}
                            required
                        />
                    </View>

                    {/* Route Preview */}
                    {formData.from_island_id && formData.to_island_id && (
                        <View style={styles.routePreview}>
                            <View style={styles.routePreviewIcon}>
                                <Navigation size={16} color={colors.primary} />
                            </View>
                            <Text style={styles.routePreviewText}>
                                {getSelectedIslandName(formData.from_island_id)} → {getSelectedIslandName(formData.to_island_id)}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Route Details */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderIcon}>
                            <Activity size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Route Details</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <TextInput
                            label="Base Fare (MVR)"
                            value={formData.base_fare.toString()}
                            onChangeText={(text) => {
                                const numericValue = parseFloat(text) || 0;
                                setFormData(prev => ({ ...prev, base_fare: numericValue }));
                            }}
                            placeholder="Enter base fare amount"
                            keyboardType="numeric"
                            error={validationErrors.base_fare}
                            required
                        />
                    </View>

                    <View style={styles.formRow}>
                        <View style={styles.formHalf}>
                            <TextInput
                                label="Distance"
                                value={formData.distance}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, distance: text }))}
                                placeholder="e.g., 25 km"
                                error={validationErrors.distance}
                            />
                        </View>

                        <View style={styles.formHalf}>
                            <TextInput
                                label="Duration"
                                value={formData.duration}
                                onChangeText={(text) => setFormData(prev => ({ ...prev, duration: text }))}
                                placeholder="e.g., 30 min"
                                error={validationErrors.duration}
                            />
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
                            description="Enable this route for trip scheduling and booking operations"
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
                        title={currentRoute ? 'Update Route' : 'Create Route'}
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

                    {onCancel && (
                        <Button
                            title="Cancel"
                            onPress={onCancel}
                            variant="outline"
                            disabled={loading}
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
    formRow: {
        flexDirection: "row",
        gap: 16,
    },
    formHalf: {
        flex: 1,
    },
    routePreview: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.primary + '10',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    routePreviewIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary + '20',
        alignItems: "center",
        justifyContent: "center",
    },
    routePreviewText: {
        fontSize: 14,
        flex: 1,
        fontWeight: "600",
        lineHeight: 18,
        color: colors.primary,
    },
    statusDescription: {
        flexDirection: "row",
        alignItems: "center",
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
        alignItems: "center",
        justifyContent: "center",
    },
    statusDescriptionText: {
        fontSize: 13,
        flex: 1,
        fontWeight: "600",
        lineHeight: 18,
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
    switchContainer: {
        marginBottom: 8,
    },
}); 