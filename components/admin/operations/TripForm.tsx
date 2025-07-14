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
    Save,
    X,
    DollarSign
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
        updateFormData,
        resetForm,
        selectedRoute,
        selectedVessel,
        routeOptions,
        vesselOptions,
        getFieldError,
        validateField,
        isFormValid,
        hasChanges: formHasChanges,
    } = useTripForm(hookOptions);

    const handleSave = async () => {
        if (!isFormValid()) {
            Alert.alert('Validation Error', 'Please fix the form errors before saving.');
            return;
        }

        try {
            if (onSave) {
                await onSave(formData);
            }
        } catch (error) {
            console.error('Error saving trip:', error);
        }
    };

    const handleCancel = () => {
        if (isEditMode && formHasChanges()) {
            Alert.alert(
                'Discard Changes?',
                'You have unsaved changes. Are you sure you want to cancel?',
                [
                    { text: 'Keep Editing', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: onCancel },
                ]
            );
        } else {
            onCancel?.();
        }
    };

    if (loadingInitialData) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading trip data...</Text>
            </View>
        );
    }

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
                {/* Route & Vessel Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MapPin size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Route & Vessel</Text>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Dropdown
                            label="Route"
                            value={formData.route_id || ''}
                            onChange={(value) => updateFormData({ route_id: value })}
                            items={routeOptions}
                            placeholder="Select a route"
                            error={getFieldError('route_id')}
                            required
                        />
                        {selectedRoute && (
                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>
                                    {selectedRoute.origin} → {selectedRoute.destination} •
                                    {selectedRoute.distance} • Duration: {selectedRoute.duration} •
                                    Base Fare: MVR {selectedRoute.base_fare}
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Dropdown
                            label="Vessel"
                            value={formData.vessel_id || ''}
                            onChange={(value) => updateFormData({ vessel_id: value })}
                            items={vesselOptions}
                            placeholder="Select a vessel"
                            error={getFieldError('vessel_id')}
                            required
                        />
                        {selectedVessel && (
                            <View style={styles.infoBox}>
                                <Text style={styles.infoText}>
                                    Type: {selectedVessel.vessel_type} •
                                    Capacity: {selectedVessel.seating_capacity} passengers
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Schedule Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Calendar size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Schedule</Text>
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                            <Input
                                label="Travel Date"
                                value={formData.travel_date || ''}
                                onChangeText={(date) => updateFormData({ travel_date: date })}
                                placeholder="YYYY-MM-DD"
                                error={getFieldError('travel_date')}
                                required
                            />
                        </View>
                        <View style={styles.fieldHalf}>
                            <Input
                                label="Departure Time"
                                value={formData.departure_time || ''}
                                onChangeText={(time) => updateFormData({ departure_time: time })}
                                placeholder="HH:MM"
                                error={getFieldError('departure_time')}
                                required
                            />
                        </View>
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                            <Input
                                label="Arrival Time"
                                value={formData.arrival_time || ''}
                                onChangeText={(time) => updateFormData({ arrival_time: time })}
                                placeholder="HH:MM"
                                error={getFieldError('arrival_time')}
                            />
                        </View>
                        <View style={styles.fieldHalf}>
                            <Input
                                label="Estimated Duration"
                                value={formData.estimated_duration?.toString() || ''}
                                onChangeText={(duration) => updateFormData({ estimated_duration: parseInt(duration) || 0 })}
                                placeholder="Minutes"
                                keyboardType="numeric"
                                error={getFieldError('estimated_duration')}
                            />
                        </View>
                    </View>
                </View>

                {/* Pricing & Capacity Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <DollarSign size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Pricing & Capacity</Text>
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldHalf}>
                            <Input
                                label="Fare Multiplier"
                                value={formData.fare_multiplier?.toString() || '1'}
                                onChangeText={(multiplier) => updateFormData({ fare_multiplier: parseFloat(multiplier) || 1 })}
                                placeholder="1.0"
                                keyboardType="decimal-pad"
                                error={getFieldError('fare_multiplier')}
                                required
                            />
                        </View>
                        <View style={styles.fieldHalf}>
                            <Input
                                label="Available Seats"
                                value={formData.available_seats?.toString() || ''}
                                onChangeText={(seats) => updateFormData({ available_seats: parseInt(seats) || undefined })}
                                placeholder="Auto"
                                keyboardType="numeric"
                                error={getFieldError('available_seats')}
                            />
                        </View>
                    </View>

                    {selectedRoute && formData.fare_multiplier && (
                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                Trip Fare: MVR {(selectedRoute.base_fare * formData.fare_multiplier).toFixed(2)} per passenger
                            </Text>
                        </View>
                    )}
                </View>

                {/* Additional Information */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Additional Information</Text>
                    </View>

                    <Input
                        label="Special Notes"
                        value={formData.special_notes || ''}
                        onChangeText={(notes) => updateFormData({ special_notes: notes })}
                        placeholder="Any special instructions or notes for this trip"
                        multiline
                        numberOfLines={3}
                        error={getFieldError('special_notes')}
                    />
                </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
                <Button
                    title="Cancel"
                    onPress={handleCancel}
                    variant="outline"
                    size="large"
                    style={styles.cancelButton}
                />
                <Button
                    title={isEditMode ? "Update Trip" : "Create Trip"}
                    onPress={handleSave}
                    variant="primary"
                    size="large"
                    loading={isLoading}
                    disabled={!isFormValid()}
                    icon={<Save size={18} color="#FFFFFF" />}
                    style={styles.saveButton}
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 20,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    fieldRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    fieldHalf: {
        flex: 1,
    },
    infoBox: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
    },
    infoText: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border + '30',
    },
    cancelButton: {
        flex: 1,
    },
    saveButton: {
        flex: 2,
    },
}); 