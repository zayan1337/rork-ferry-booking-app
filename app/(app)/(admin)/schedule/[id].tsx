import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripDetails, TripForm } from '@/components/admin/operations';
import { Trip, TripFormData } from '@/types/operations';
import { useAdminStore } from '@/store/admin/adminStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';

export default function TripDetailsPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { getTrip, updateTrip, deleteTrip } = useAdminStore();
    const { canViewTrips, canManageTrips } = useAdminPermissions();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        loadTrip();
    }, [id]);

    const loadTrip = async () => {
        if (!id) return;

        try {
            setLoading(true);
            const tripData = await getTrip(id);
            setTrip(tripData);
        } catch (error) {
            Alert.alert(
                'Error',
                'Failed to load trip details'
            );
            router.back();
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setEditMode(true);
    };

    const handleSave = async (tripData: TripFormData) => {
        if (!id) return;

        try {
            await updateTrip(id, tripData);
            await loadTrip(); // Refresh the trip data
            setEditMode(false);
            Alert.alert('Success', 'Trip updated successfully!');
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to update trip'
            );
        }
    };

    const handleCancelEdit = () => {
        setEditMode(false);
    };

    const handleCancel = async () => {
        if (!id || !trip) return;

        Alert.alert(
            'Cancel Trip',
            `Are you sure you want to cancel "${trip.routeName}"? This action cannot be undone.`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTrip(id);
                            Alert.alert(
                                'Success',
                                'Trip cancelled successfully!',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => router.back(),
                                    },
                                ]
                            );
                        } catch (error) {
                            Alert.alert(
                                'Error',
                                error instanceof Error ? error.message : 'Failed to cancel trip'
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleViewPassengers = () => {
        if (!id) return;
        // Navigate to passengers list for this trip
        router.push(`../passengers?tripId=${id}` as any);
    };

    const handleViewBookings = () => {
        if (!id) return;
        // Navigate to bookings for this trip
        router.push(`../booking?tripId=${id}` as any);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen
                    options={{
                        title: 'Trip Details',
                        headerShown: true,
                    }}
                />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={styles.errorContainer}>
                <Stack.Screen
                    options={{
                        title: 'Trip Not Found',
                        headerShown: true,
                    }}
                />
            </View>
        );
    }

    return (
        <RoleGuard
            allowedRoles={['admin', 'captain']}
        >
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: editMode ? 'Edit Trip' : `${trip.routeName} - ${trip.departure_time}`,
                        headerShown: true,
                        presentation: 'card',
                    }}
                />

                {editMode ? (
                    <TripForm
                        tripId={id}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                    />
                ) : (
                    <TripDetails
                        trip={trip}
                        onEdit={canManageTrips() ? handleEdit : undefined}
                        onCancel={canManageTrips() ? handleCancel : undefined}
                        onViewPassengers={handleViewPassengers}
                        onViewBookings={handleViewBookings}
                        showActions={canManageTrips()}
                    />
                )}
            </View>
        </RoleGuard>
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
        backgroundColor: colors.backgroundSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
}); 