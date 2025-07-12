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
import { useTripForm } from '@/hooks/useTripForm';
import { TripFormData, Trip } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import Input from '@/components/Input';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import {
    MapPin,
    Clock,
    Calendar,
    Ship,
    Users,
    AlertCircle,
    Save,
    X,
    CheckCircle,
    AlertTriangle,
    Route,
    Navigation
} from 'lucide-react-native';

interface TripFormProps {
    tripId?: string;
    onSave?: (trip: TripFormData) => void;
    onCancel?: () => void;
    isModal?: boolean;
}

export default function TripForm({
    tripId,
    onSave,
    onCancel,
    isModal = false
}: TripFormProps) {
    const { getTrip } = useAdminStore();
    const [initialTripData, setInitialTripData] = useState<Trip | undefined>();
    const [loadingInitialData, setLoadingInitialData] = useState(false);

    const isEditMode = !!tripId;

    // Load initial trip data if in edit mode
    useEffect(() => {
        if (isEditMode && tripId) {
            setLoadingInitialData(true);
            getTrip(tripId)
                .then(trip => {
                    setInitialTripData(trip);
                })
                .catch(error => {
                    Alert.alert('Error', 'Failed to load trip data');
                    console.error('Error loading trip:', error);
                })
                .finally(() => {
                    setLoadingInitialData(false);
                });
        }
    }, [isEditMode, tripId, getTrip]);

    // Memoize the hook options to prevent re-initialization
    const hookOptions = useMemo(() => {
        return initialTripData ? { initialData: initialTripData } : {};
    }, [initialTripData]);

    const {
        formData,
        errors,
        isLoading,
        isSubmitting,
        availableRoutes,
        availableVessels,
        selectedRoute,
        selectedVessel,
        updateFormData,
        handleSubmit,
        resetForm,
        getFieldError,
    } = useTripForm(hookOptions);

    // Don't render the form until initial data is loaded in edit mode
    if (isEditMode && loadingInitialData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading trip data...</Text>
            </View>
        );
    }

    const handleSave = async () => {
        try {
            const savedTrip = await handleSubmit();
            if (savedTrip) {
                onSave?.(formData);
                if (!isEditMode) {
                    Alert.alert('Success', 'Trip scheduled successfully!');
                } else {
                    Alert.alert('Success', 'Trip updated successfully!');
                }
            }
        } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save trip');
        }
    };

    const handleCancel = () => {
        if (isEditMode) {
            resetForm();
        }
        onCancel?.();
    };

    const routeOptions = availableRoutes.map(route => ({
        label: `${route.name} (${route.origin} → ${route.destination})`,
        value: route.id,
    }));

    const vesselOptions = availableVessels.map(vessel => ({
        label: `${vessel.name} (${vessel.vessel_type} - ${vessel.seating_capacity} seats)`,
        value: vessel.id,
    }));

    const hasChanges = () => {
        return Object.values(formData).some(value =>
            value !== null && value !== undefined && value !== ''
        );
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
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
                            {isEditMode ? 'Edit Trip' : 'Schedule New Trip'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isEditMode ? 'Update trip details' : 'Create a new ferry trip'}
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
                    {/* Route and Vessel Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Route & Vessel</Text>

                        <View style={styles.field}>
                            <Dropdown
                                label="Select Route"
                                value={formData.route_id || ''}
                                onChange={(value) => {
                                    updateFormData({ route_id: value });
                                }}
                                items={routeOptions}
                                placeholder="Choose a route"
                                error={getFieldError('route_id')}
                                required
                            />
                            {selectedRoute && (
                                <View style={styles.routeInfo}>
                                    <Text style={styles.routeInfoText}>
                                        Distance: {selectedRoute.distance} •
                                        Duration: {selectedRoute.duration} •
                                        Fare: MVR {selectedRoute.base_fare}
                                    </Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.field}>
                            <Dropdown
                                label="Select Vessel"
                                value={formData.vessel_id || ''}
                                onChange={(value) => {
                                    updateFormData({ vessel_id: value });
                                }}
                                items={vesselOptions}
                                placeholder="Choose a vessel"
                                error={getFieldError('vessel_id')}
                                required
                            />
                            {selectedVessel && (
                                <View style={styles.vesselInfo}>
                                    <Text style={styles.vesselInfoText}>
                                        Type: {selectedVessel.vessel_type} •
                                        Capacity: {selectedVessel.seating_capacity} passengers
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Schedule Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Schedule</Text>

                        <View style={styles.field}>
                            <Input
                                label="Travel Date"
                                value={formData.travel_date || ''}
                                onChangeText={(date) => {
                                    updateFormData({ travel_date: date });
                                }}
                                placeholder="YYYY-MM-DD"
                                error={getFieldError('travel_date')}
                                leftIcon={<Calendar size={20} color={colors.textSecondary} />}
                                required
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Departure Time"
                                    value={formData.departure_time || ''}
                                    onChangeText={(time) => {
                                        updateFormData({ departure_time: time });
                                    }}
                                    placeholder="HH:MM"
                                    error={getFieldError('departure_time')}
                                    leftIcon={<Clock size={20} color={colors.textSecondary} />}
                                    required
                                />
                            </View>

                            <View style={[styles.field, styles.halfWidth]}>
                                <Input
                                    label="Arrival Time"
                                    value={formData.arrival_time || ''}
                                    onChangeText={(time) => {
                                        updateFormData({ arrival_time: time });
                                    }}
                                    placeholder="Auto-calculated"
                                    error={getFieldError('arrival_time')}
                                    leftIcon={<Clock size={20} color={colors.textSecondary} />}
                                />
                                {formData.arrival_time && (
                                    <Text style={styles.autoCalculatedText}>
                                        Based on route duration
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Pricing */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pricing</Text>

                        <View style={styles.field}>
                            <Input
                                label="Fare Multiplier"
                                value={formData.fare_multiplier?.toString() || '1'}
                                onChangeText={(text) => {
                                    const value = parseFloat(text) || 1;
                                    updateFormData({ fare_multiplier: value });
                                }}
                                placeholder="1.0"
                                keyboardType="numeric"
                                error={getFieldError('fare_multiplier')}
                                leftIcon={<MapPin size={20} color={colors.textSecondary} />}
                                required
                            />
                            <Text style={styles.fieldHint}>
                                Multiplier for base fare (1.0 = normal price, 1.5 = 50% increase)
                            </Text>
                        </View>
                    </View>

                    {/* Additional Information */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Additional Information</Text>

                        <View style={styles.field}>
                            <Input
                                label="Notes"
                                value={formData.notes || ''}
                                onChangeText={(text) => {
                                    updateFormData({ notes: text });
                                }}
                                placeholder="Any special instructions or notes (optional)"
                                multiline
                                numberOfLines={3}
                                error={getFieldError('notes')}
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Weather Conditions"
                                value={formData.weather_conditions || ''}
                                onChangeText={(text) => {
                                    updateFormData({ weather_conditions: text });
                                }}
                                placeholder="Weather conditions for this trip (optional)"
                                error={getFieldError('weather_conditions')}
                            />
                        </View>

                        <View style={styles.field}>
                            <Input
                                label="Captain ID"
                                value={formData.captain_id || ''}
                                onChangeText={(text) => {
                                    updateFormData({ captain_id: text });
                                }}
                                placeholder="Captain identifier (optional)"
                                error={getFieldError('captain_id')}
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

                    {/* Success Message */}
                    {selectedRoute && selectedVessel && formData.departure_time && Object.keys(errors).length === 0 && (
                        <View style={styles.successContainer}>
                            <CheckCircle size={16} color={colors.success} />
                            <Text style={styles.successText}>
                                Trip is ready to be scheduled.
                            </Text>
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
                    title={isEditMode ? 'Update Trip' : 'Schedule Trip'}
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
    fieldHint: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfWidth: {
        flex: 1,
    },
    routeInfo: {
        backgroundColor: colors.card,
        borderRadius: 6,
        padding: 8,
        marginTop: 4,
    },
    routeInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    vesselInfo: {
        backgroundColor: colors.card,
        borderRadius: 6,
        padding: 8,
        marginTop: 4,
    },
    vesselInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    autoCalculatedText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
        fontStyle: 'italic',
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
    successContainer: {
        backgroundColor: colors.success + '10',
        borderWidth: 1,
        borderColor: colors.success + '30',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    successText: {
        fontSize: 14,
        color: colors.success,
        flex: 1,
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
}); 