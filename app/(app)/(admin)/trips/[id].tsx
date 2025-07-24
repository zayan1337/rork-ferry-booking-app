import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { TripDetails, TripForm, TripAnalytics } from '@/components/admin/operations';
import { OperationsTrip } from '@/types/database';
import { Trip, TripFormData } from '@/types/operations';
import { useOperationsStore } from '@/store/admin/operationsStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import RoleGuard from '@/components/RoleGuard';
import { formatCurrency } from '@/utils/currencyUtils';
import { formatTripStatus, getTripOccupancy } from '@/utils/tripUtils';
import { BarChart3, Info, Edit, Trash, Users, MapPin, Clock, Share, ArrowLeft, MoreHorizontal, RefreshCw, Calendar, Ship } from 'lucide-react-native';

// Function to convert OperationsTrip to Trip type expected by components
const mapOperationsTripToTrip = (operationsTrip: OperationsTrip): Trip => {
    return {
        id: operationsTrip.id,
        route_id: operationsTrip.route_id,
        vessel_id: operationsTrip.vessel_id,
        travel_date: operationsTrip.travel_date,
        departure_time: operationsTrip.departure_time,
        arrival_time: operationsTrip.arrival_time || undefined,
        estimated_duration: "1h 30m", // Default estimate
        status: operationsTrip.status as any,
        available_seats: operationsTrip.available_seats,
        booked_seats: operationsTrip.booked_seats || operationsTrip.bookings || 0,
        fare_multiplier: 1.0, // Default multiplier
        created_at: operationsTrip.created_at,
        updated_at: operationsTrip.created_at, // Use created_at as fallback
        // Display fields
        routeName: operationsTrip.route_name || operationsTrip.routeName,
        vesselName: operationsTrip.vessel_name || operationsTrip.vesselName,
        bookings: operationsTrip.bookings || operationsTrip.booked_seats || 0,
        capacity: operationsTrip.seating_capacity || operationsTrip.capacity,
        is_active: operationsTrip.is_active,
    };
};

export default function TripDetailsPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { fetchTrip, updateTripData, removeTrip, routes, vessels } = useOperationsStore();
    const { canViewTrips, canManageTrips } = useAdminPermissions();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'analytics' | 'passengers' | 'bookings'>('details');
    const [actionMenuVisible, setActionMenuVisible] = useState(false);

    // Auto-refresh when page is focused
    useFocusEffect(
        useCallback(() => {
            if (!editMode) {
                loadTrip();
            }
        }, [editMode])
    );

    useEffect(() => {
        loadTrip();
    }, [id]);

    const loadTrip = async (showRefreshIndicator = false) => {
        if (!id) return;

        try {
            if (showRefreshIndicator) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const tripData = await fetchTrip(id);
            if (tripData) {
                setTrip(mapOperationsTripToTrip(tripData));
            }
        } catch (error) {
            Alert.alert(
                'Error',
                'Failed to load trip details. Please try again.',
                [
                    { text: 'Retry', onPress: () => loadTrip() },
                    { text: 'Go Back', onPress: () => router.back() }
                ]
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        loadTrip(true);
    };

    const handleEdit = () => {
        setEditMode(true);
        setActionMenuVisible(false);
    };

    const handleSave = async (tripData: TripFormData) => {
        if (!id) return;

        try {
            const success = await updateTripData(id, {
                route_id: tripData.route_id,
                vessel_id: tripData.vessel_id,
                travel_date: tripData.travel_date,
                departure_time: tripData.departure_time,
                available_seats: trip?.available_seats || 0, // Keep current available seats
                is_active: true,
            });

            if (success) {
                await loadTrip(); // Refresh the trip data
                setEditMode(false);
                Alert.alert('Success', 'Trip updated successfully!');
            } else {
                throw new Error('Failed to update trip');
            }
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

        const route = routes?.find(r => r.id === trip.route_id);
        const routeName = route ? `${route.origin || route.from_island_name} → ${route.destination || route.to_island_name}` : 'this trip';

        Alert.alert(
            'Cancel Trip',
            `Are you sure you want to cancel ${routeName} on ${new Date(trip.travel_date).toLocaleDateString()} at ${trip.departure_time}?\n\nThis action cannot be undone and will affect ${trip.booked_seats} booked passengers.`,
            [
                { text: 'Keep Trip', style: 'cancel' },
                {
                    text: 'Cancel Trip',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeTrip(id);
                            Alert.alert(
                                'Trip Cancelled',
                                'The trip has been cancelled successfully. Passengers will be notified.',
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
        router.push(`../passengers?tripId=${id}` as any);
    };

    const handleViewBookings = () => {
        if (!id) return;
        router.push(`../bookings?tripId=${id}` as any);
    };

    const handleShare = () => {
        if (!trip) return;

        Alert.alert(
            'Share Trip',
            'Choose how to share this trip information:',
            [
                { text: 'Copy Link', onPress: () => console.log('Copy link') },
                { text: 'Export PDF', onPress: () => console.log('Export PDF') },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const getTripStatusInfo = (trip: Trip) => {
        const status = formatTripStatus(trip.status);
        const occupancy = getTripOccupancy(trip);
        const route = routes?.find(r => r.id === trip.route_id);
        const vessel = vessels?.find(v => v.id === trip.vessel_id);

        return {
            status,
            occupancy,
            route,
            vessel,
            revenue: route ? trip.booked_seats * route.base_fare * trip.fare_multiplier : 0,
        };
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Stack.Screen
                    options={{
                        title: 'Loading...',
                        headerShown: true,
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading trip details...</Text>
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
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <Text style={styles.errorTitle}>Trip Not Found</Text>
                <Text style={styles.errorMessage}>
                    The requested trip could not be found. It may have been cancelled or moved.
                </Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => loadTrip()}
                >
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const tripInfo = getTripStatusInfo(trip);

    return (
        <RoleGuard allowedRoles={['admin', 'captain']}>
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: editMode ? 'Edit Trip' : 'Trip Details',
                        headerShown: true,
                        presentation: 'card',
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => editMode ? setEditMode(false) : router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                        headerRight: () => !editMode && canManageTrips() ? (
                            <TouchableOpacity
                                onPress={handleEdit}
                                style={styles.editButton}
                            >
                                <Edit size={20} color={colors.primary} />
                            </TouchableOpacity>
                        ) : null,
                    }}
                />

                {/* Action Menu Overlay */}
                {actionMenuVisible && (
                    <TouchableOpacity
                        style={styles.actionMenuOverlay}
                        onPress={() => setActionMenuVisible(false)}
                        activeOpacity={1}
                    >
                        <View style={styles.actionMenuContainer}>
                            {/* This section is removed as per the new_code, but the state variable remains */}
                        </View>
                    </TouchableOpacity>
                )}

                {editMode ? (
                    <TripForm
                        tripId={id}
                        onSave={handleSave}
                        onCancel={handleCancelEdit}
                    />
                ) : (
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentContainer}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[colors.primary]}
                                tintColor={colors.primary}
                            />
                        }
                    >
                        {/* Trip Overview Card */}
                        <View style={styles.overviewCard}>
                            {/* Header */}
                            <View style={styles.overviewHeader}>
                                <View style={styles.overviewHeaderLeft}>
                                    <Text style={styles.tripId}>Trip #{trip.id}</Text>
                                    <View style={styles.routeInfo}>
                                        <MapPin size={16} color={colors.primary} />
                                        <Text style={styles.routeName}>
                                            {tripInfo.route?.origin || 'Unknown'} → {tripInfo.route?.destination || 'Unknown'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: tripInfo.status.color + '20' }]}>
                                    <Text style={[styles.statusText, { color: tripInfo.status.color }]}>
                                        {tripInfo.status.label}
                                    </Text>
                                </View>
                            </View>

                            {/* Details Grid */}
                            <View style={styles.detailsGrid}>
                                <View style={styles.detailRow}>
                                    <View style={styles.detailItem}>
                                        <Calendar size={16} color={colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {new Date(trip.travel_date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Clock size={16} color={colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {trip.departure_time}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <View style={styles.detailItem}>
                                        <Ship size={16} color={colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {tripInfo.vessel?.name || 'Unknown Vessel'}
                                        </Text>
                                    </View>
                                    <View style={styles.detailItem}>
                                        <Users size={16} color={colors.textSecondary} />
                                        <Text style={styles.detailText}>
                                            {trip.booked_seats}/{tripInfo.vessel?.seating_capacity || 0}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Metrics */}
                            <View style={styles.metricsContainer}>
                                <View style={styles.metric}>
                                    <Text style={styles.metricValue}>{formatCurrency(tripInfo.revenue, 'MVR')}</Text>
                                    <Text style={styles.metricLabel}>Revenue</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricValue}>{tripInfo.occupancy}%</Text>
                                    <Text style={styles.metricLabel}>Occupancy</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricValue}>{trip.fare_multiplier}x</Text>
                                    <Text style={styles.metricLabel}>Fare</Text>
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        {canManageTrips() && (
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleViewPassengers}
                                >
                                    <Users size={18} color={colors.text} />
                                    <Text style={styles.actionButtonText}>Passengers</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionButton}
                                    onPress={handleViewBookings}
                                >
                                    <Info size={18} color={colors.text} />
                                    <Text style={styles.actionButtonText}>Bookings</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.dangerButton]}
                                    onPress={handleCancel}
                                >
                                    <Trash size={18} color={colors.danger} />
                                    <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Analytics Section */}
                        <View style={styles.analyticsCard}>
                            <Text style={styles.sectionTitle}>Trip Analytics</Text>
                            <View style={styles.analyticsGrid}>
                                <View style={styles.analyticsItem}>
                                    <Text style={styles.analyticsValue}>92%</Text>
                                    <Text style={styles.analyticsLabel}>On-time</Text>
                                </View>
                                <View style={styles.analyticsItem}>
                                    <Text style={styles.analyticsValue}>4.8</Text>
                                    <Text style={styles.analyticsLabel}>Rating</Text>
                                </View>
                                <View style={styles.analyticsItem}>
                                    <Text style={styles.analyticsValue}>2h 15m</Text>
                                    <Text style={styles.analyticsLabel}>Duration</Text>
                                </View>
                            </View>
                        </View>
                    </ScrollView>
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
        gap: 12,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        padding: 20,
        gap: 16,
    },
    backButton: {
        padding: 8,
    },
    editButton: {
        padding: 8,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        gap: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 16,
    },
    overviewCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    overviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    overviewHeaderLeft: {
        flex: 1,
    },
    tripId: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
        marginBottom: 4,
    },
    routeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    routeName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    detailsGrid: {
        gap: 12,
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        gap: 20,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border + '30',
    },
    metric: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    dangerButton: {
        backgroundColor: colors.danger + '10',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    dangerButtonText: {
        color: colors.danger,
    },
    analyticsCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
    },
    analyticsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    analyticsItem: {
        alignItems: 'center',
    },
    analyticsValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 4,
    },
    analyticsLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    actionMenu: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 15,
        margin: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 12,
    },
    actionMenuItemDanger: {
        backgroundColor: colors.danger + '20',
    },
    actionMenuText: {
        fontSize: 16,
        color: colors.text,
    },
    actionMenuTextDanger: {
        color: colors.danger,
    },
    actionMenuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionMenuContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 15,
        width: '80%',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    comingSoon: {
        alignItems: 'center',
        padding: 20,
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 15,
    },
    comingSoonText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 20,
    },
    viewButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    viewButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 