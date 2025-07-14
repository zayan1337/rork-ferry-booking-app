import React, { useMemo, useState, useEffect } from 'react';
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
import { useVesselForm } from '@/hooks/useVesselForm';
import { VesselFormData, Vessel } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import Input from '@/components/Input';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/Dropdown';
import {
    Ship,
    Anchor,
    Users,
    Wrench,
    Calendar,
    Gauge,
    Ruler,
    Fuel,
    Settings,
    AlertCircle,
    Save,
    X,
} from 'lucide-react-native';

interface VesselFormProps {
    vesselId?: string;
    onSave?: (vessel: VesselFormData) => void;
    onCancel?: () => void;
    isModal?: boolean;
}

export default function VesselForm({
    vesselId,
    onSave,
    onCancel,
    isModal = false
}: VesselFormProps) {
    const { getVessel } = useAdminStore();
    const [initialVesselData, setInitialVesselData] = useState<Vessel | undefined>();
    const [loadingInitialData, setLoadingInitialData] = useState(false);

    const isEditMode = !!vesselId;

    // Load initial vessel data if in edit mode
    useEffect(() => {
        if (isEditMode && vesselId) {
            setLoadingInitialData(true);
            getVessel(vesselId)
                .then(vessel => {
                    setInitialVesselData(vessel);
                })
                .catch(error => {
                    Alert.alert('Error', 'Failed to load vessel data');
                    console.error('Error loading vessel:', error);
                })
                .finally(() => {
                    setLoadingInitialData(false);
                });
        }
    }, [isEditMode, vesselId, getVessel]);

    // Memoize the hook options to prevent re-initialization
    const hookOptions = useMemo(() => {
        return initialVesselData ? { initialData: initialVesselData } : {};
    }, [initialVesselData]);

    const {
        formData,
        errors,
        isLoading,
        isSubmitting,
        vesselTypes,
        updateFormData,
        updateSpecifications,
        handleSubmit,
        resetForm,
        getFieldError,
        getSpecificationError,
    } = useVesselForm(hookOptions);

    // Don't render the form until initial data is loaded in edit mode
    if (isEditMode && loadingInitialData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading vessel data...</Text>
            </View>
        );
    }

    const statusOptions = [
        { value: 'active', label: 'Active' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'inactive', label: 'Inactive' },
    ];

    const handleSave = async () => {
        try {
            const success = await handleSubmit();
            if (success) {
                onSave?.(formData);
                if (!isEditMode) {
                    Alert.alert('Success', 'Vessel created successfully!');
                } else {
                    Alert.alert('Success', 'Vessel updated successfully!');
                }
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save vessel');
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            resetForm();
        }
        onCancel?.();
    };

    const vesselTypeOptions = vesselTypes.map(type => ({
        label: type.label,
        value: type.value,
    }));

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
                            {isEditMode ? 'Edit Vessel' : 'New Vessel'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isEditMode ? 'Update vessel information' : 'Register a new vessel'}
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
                                label="Vessel Name"
                                value={formData.name || ''}
                                onChangeText={(text) => {
                                    updateFormData({ name: text });
                                }}
                                placeholder="Enter vessel name"
                                error={getFieldError('name')}
                                leftIcon={<Ship size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Registration Number"
                                value={formData.registration_number || ''}
                                onChangeText={(text) => {
                                    updateFormData({ registration_number: text });
                                }}
                                placeholder="Enter registration number"
                                error={getFieldError('registration_number')}
                                leftIcon={<Anchor size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>
                                Vessel Type <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.vesselTypeContainer}>
                                {vesselTypes.map((type) => (
                                    <TouchableOpacity
                                        key={type.value}
                                        style={[
                                            styles.vesselTypeOption,
                                            formData.vessel_type === type.value && styles.vesselTypeOptionSelected
                                        ]}
                                        onPress={() => updateFormData({ vessel_type: type.value as any })}
                                    >
                                        <Ship
                                            size={24}
                                            color={formData.vessel_type === type.value ? 'white' : colors.primary}
                                        />
                                        <Text style={[
                                            styles.vesselTypeLabel,
                                            formData.vessel_type === type.value && styles.vesselTypeLabelSelected
                                        ]}>
                                            {type.label}
                                        </Text>
                                        <Text style={[
                                            styles.vesselTypeDescription,
                                            formData.vessel_type === type.value && styles.vesselTypeDescriptionSelected
                                        ]}>
                                            {type.description}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {getFieldError('vessel_type') && (
                                <Text style={styles.errorText}>{getFieldError('vessel_type')}</Text>
                            )}
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Manufacturer"
                                value={formData.manufacturer || ''}
                                onChangeText={(text) => {
                                    updateFormData({ manufacturer: text });
                                }}
                                placeholder="Enter manufacturer name (optional)"
                                error={getFieldError('manufacturer')}
                                leftIcon={<Wrench size={20} color={colors.textSecondary} />}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>
                                Status <Text style={styles.required}>*</Text>
                            </Text>
                            <View style={styles.statusContainer}>
                                {statusOptions.map((status) => (
                                    <TouchableOpacity
                                        key={status.value}
                                        style={[
                                            styles.statusOption,
                                            formData.status === status.value && styles.statusOptionSelected
                                        ]}
                                        onPress={() => updateFormData({ status: status.value as any })}
                                    >
                                        <View style={[
                                            styles.statusIndicator,
                                            {
                                                backgroundColor:
                                                    status.value === 'active' ? colors.success :
                                                        status.value === 'maintenance' ? colors.warning :
                                                            colors.textSecondary
                                            }
                                        ]} />
                                        <Text style={[
                                            styles.statusLabel,
                                            formData.status === status.value && styles.statusLabelSelected
                                        ]}>
                                            {status.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {getFieldError('status') && (
                                <Text style={styles.errorText}>{getFieldError('status')}</Text>
                            )}
                        </View>
                    </View>

                    {/* Capacity Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Capacity</Text>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Total Capacity"
                                    value={formData.capacity?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseInt(text) || 0;
                                        updateFormData({ capacity: value });
                                    }}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    error={getFieldError('capacity')}
                                    leftIcon={<Users size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Seating Capacity"
                                    value={formData.seating_capacity?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseInt(text) || 0;
                                        updateFormData({ seating_capacity: value });
                                    }}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    error={getFieldError('seating_capacity')}
                                    leftIcon={<Users size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Crew Capacity"
                                    value={formData.crew_capacity?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseInt(text) || 0;
                                        updateFormData({ crew_capacity: value });
                                    }}
                                    placeholder="0"
                                    keyboardType="numeric"
                                    error={getFieldError('crew_capacity')}
                                    leftIcon={<Users size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Year Built"
                                    value={formData.year_built?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseInt(text) || undefined;
                                        updateFormData({ year_built: value });
                                    }}
                                    placeholder="YYYY"
                                    keyboardType="numeric"
                                    error={getFieldError('year_built')}
                                    leftIcon={<Calendar size={20} color={colors.textSecondary} />}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Technical Specifications */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Technical Specifications (Optional)</Text>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Length (meters)"
                                    value={formData.specifications?.length?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseFloat(text) || 0;
                                        updateSpecifications({ length: value });
                                    }}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    error={getSpecificationError('length') as string | undefined}
                                    leftIcon={<Ruler size={20} color={colors.textSecondary} />}
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Width (meters)"
                                    value={formData.specifications?.width?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseFloat(text) || 0;
                                        updateSpecifications({ width: value });
                                    }}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    error={getSpecificationError('width') as string | undefined}
                                    leftIcon={<Ruler size={20} color={colors.textSecondary} />}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Max Speed (knots)"
                                    value={formData.specifications?.max_speed?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseFloat(text) || 0;
                                        updateSpecifications({ max_speed: value });
                                    }}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    error={getSpecificationError('max_speed') as string | undefined}
                                    leftIcon={<Gauge size={20} color={colors.textSecondary} />}
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Fuel Capacity (liters)"
                                    value={formData.specifications?.fuel_capacity?.toString() || ''}
                                    onChangeText={(text) => {
                                        const value = parseFloat(text) || 0;
                                        updateSpecifications({ fuel_capacity: value });
                                    }}
                                    placeholder="0.0"
                                    keyboardType="numeric"
                                    error={getSpecificationError('fuel_capacity') as string | undefined}
                                    leftIcon={<Fuel size={20} color={colors.textSecondary} />}
                                />
                            </View>
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Engine Type"
                                value={formData.specifications?.engine_type || ''}
                                onChangeText={(text) => {
                                    updateSpecifications({ engine_type: text });
                                }}
                                placeholder="Engine type description"
                                error={getSpecificationError('engine_type') as string | undefined}
                                leftIcon={<Settings size={20} color={colors.textSecondary} />}
                            />
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
                    title={isEditMode ? 'Update Vessel' : 'Create Vessel'}
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
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    loadingText: {
        fontSize: 18,
        color: colors.textSecondary,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 8,
    },
    required: {
        color: colors.danger,
    },
    vesselTypeContainer: {
        gap: 12,
    },
    vesselTypeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.border,
        gap: 12,
    },
    vesselTypeOptionSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    vesselTypeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
    },
    vesselTypeLabelSelected: {
        color: 'white',
    },
    vesselTypeDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        flex: 2,
    },
    vesselTypeDescriptionSelected: {
        color: 'white',
        opacity: 0.8,
    },
    statusContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    statusOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 2,
        borderColor: colors.border,
        gap: 8,
    },
    statusOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    statusLabelSelected: {
        color: colors.primary,
    },
}); 