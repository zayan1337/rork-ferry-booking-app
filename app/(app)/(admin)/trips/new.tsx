import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripForm } from '@/components/admin/operations';
import { TripFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import {
    ArrowLeft,
    Save,
    Calendar,
    Clock,
    MapPin,
    Ship,
    Plus,
} from 'lucide-react-native';

export default function NewTripPage() {
    const { createTrip, routes, vessels } = useAdminStore();
    const { canManageTrips } = useAdminPermissions();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset state when page is focused
    useFocusEffect(
        useCallback(() => {
            setIsSubmitting(false);
        }, [])
    );

    const validateTripData = (tripData: TripFormData): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Basic validation
        if (!tripData.route_id) {
            errors.push('Please select a route');
        } else if (!routes?.some(r => r.id === tripData.route_id && r.status === 'active')) {
            errors.push('Selected route is not active');
        }

        if (!tripData.vessel_id) {
            errors.push('Please select a vessel');
        } else if (!vessels?.some(v => v.id === tripData.vessel_id && v.status === 'active')) {
            errors.push('Selected vessel is not available');
        }

        if (!tripData.travel_date) {
            errors.push('Please select travel date');
        }

        if (!tripData.departure_time) {
            errors.push('Please set departure time');
        }

        // Check if departure is in the future
        if (tripData.travel_date && tripData.departure_time) {
            const tripDateTime = new Date(`${tripData.travel_date}T${tripData.departure_time}`);
            if (tripDateTime <= new Date()) {
                errors.push('Departure must be in the future');
            }
        }

        if (tripData.fare_multiplier <= 0 || tripData.fare_multiplier > 5) {
            errors.push('Fare multiplier must be between 0.1 and 5.0');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    const handleSave = async (tripData: TripFormData) => {
        try {
            setIsSubmitting(true);

            // Validate trip data
            const validation = validateTripData(tripData);

            if (!validation.isValid) {
                Alert.alert(
                    'Validation Error',
                    validation.errors.join('\n'),
                    [{ text: 'OK' }]
                );
                return;
            }

            // Get route and vessel info for confirmation
            const route = routes?.find(r => r.id === tripData.route_id);
            const vessel = vessels?.find(v => v.id === tripData.vessel_id);

            // Create the trip
            await createTrip(tripData);

            Alert.alert(
                'Trip Created Successfully!',
                `${route?.origin || 'Trip'} → ${route?.destination || ''}\nScheduled for ${new Date(tripData.travel_date).toLocaleDateString()} at ${tripData.departure_time}`,
                [
                    {
                        text: 'View Trips',
                        onPress: () => {
                            router.back();
                        },
                    },
                    {
                        text: 'Create Another',
                        onPress: () => {
                            setIsSubmitting(false);
                        },
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                'Error Creating Trip',
                error instanceof Error ? error.message : 'Failed to create trip. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Discard Changes?',
            'Are you sure you want to cancel? Any unsaved changes will be lost.',
            [
                { text: 'Continue Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => router.back() },
            ]
        );
    };

    return (
        <RoleGuard allowedRoles={['admin', 'captain']}>
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: 'Schedule New Trip',
                        headerShown: true,
                        presentation: 'card',
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={handleCancel}
                                style={styles.headerButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Card */}
                    <View style={styles.headerCard}>
                        <View style={styles.headerIcon}>
                            <Plus size={24} color={colors.primary} />
                        </View>
                        <View style={styles.headerContent}>
                            <Text style={styles.headerTitle}>Schedule New Trip</Text>
                            <Text style={styles.headerSubtitle}>
                                Create a new ferry trip with route, vessel, and schedule details
                            </Text>
                        </View>
                    </View>

                    {/* Form Instructions */}
                    <View style={styles.instructionsCard}>
                        <Text style={styles.instructionsTitle}>Required Information</Text>
                        <View style={styles.instructionsList}>
                            <View style={styles.instructionItem}>
                                <MapPin size={16} color={colors.textSecondary} />
                                <Text style={styles.instructionText}>Select an active route</Text>
                            </View>
                            <View style={styles.instructionItem}>
                                <Ship size={16} color={colors.textSecondary} />
                                <Text style={styles.instructionText}>Choose an available vessel</Text>
                            </View>
                            <View style={styles.instructionItem}>
                                <Calendar size={16} color={colors.textSecondary} />
                                <Text style={styles.instructionText}>Set future date and time</Text>
                            </View>
                            <View style={styles.instructionItem}>
                                <Clock size={16} color={colors.textSecondary} />
                                <Text style={styles.instructionText}>Configure fare settings</Text>
                            </View>
                        </View>
                    </View>

                    {/* Trip Form */}
                    <View style={styles.formCard}>
                        <TripForm
                            onSave={handleSave}
                            onCancel={handleCancel}
                            isModal={false}
                        />
                    </View>
                </ScrollView>
            </View>
        </RoleGuard>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    headerButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 16,
    },
    headerCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    instructionsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    instructionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    instructionsList: {
        gap: 8,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    instructionText: {
        fontSize: 14,
        color: colors.textSecondary,
        flex: 1,
    },
    formCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
}); 