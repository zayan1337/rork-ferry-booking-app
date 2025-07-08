import React, { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminBookings } from "@/hooks/admin";
import {
    Calendar,
    Clock,
    Users,
    MapPin,
    CreditCard,
    Phone,
    Mail,
    Edit3,
    Trash2,
    CheckCircle,
    XCircle,
    RefreshCw,
    Ship
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import { AdminBooking } from "@/types/admin";

export default function BookingDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const {
        getBookingDetails,
        updateBookingStatus,
        deleteBooking,
        loading,
        error
    } = useAdminBookings();

    const [booking, setBooking] = useState<AdminBooking | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Load booking details
    useEffect(() => {
        if (id) {
            loadBookingDetails();
        }
    }, [id]);

    const loadBookingDetails = async () => {
        try {
            const bookingData = await getBookingDetails(id!);
            setBooking(bookingData);
        } catch (err) {
            console.error('Error loading booking details:', err);
        }
    };

    if (loading && !booking) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading booking details...</Text>
            </View>
        );
    }

    if (error || !booking) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {error || "Booking not found"}
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: AdminBooking['status']) => {
        setActionLoading(true);
        try {
            const success = await updateBookingStatus(booking.id, newStatus);
            if (success) {
                setBooking(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update booking status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = () => {
        router.push(`/(admin)/booking/${booking.id}/edit`);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete Booking",
            "Are you sure you want to delete this booking? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const success = await deleteBooking(booking.id);
                            if (success) {
                                router.back();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete booking');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: `Booking #${booking.booking_number}`,
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            <Button
                                title="Edit"
                                variant="outline"
                                size="small"
                                icon={<Edit3 size={16} color={colors.primary} />}
                                onPress={handleEdit}
                            />
                        </View>
                    ),
                }}
            />

            {/* Booking Status Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Booking Status</Text>
                    <View style={styles.statusContainer}>
                        <StatusBadge status={booking.status} />
                        {booking.payment_method_type && (
                            <Text style={styles.paymentMethod}>
                                {booking.payment_method_type.replace('_', ' ').toUpperCase()}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Confirm"
                        variant="primary"
                        size="small"
                        disabled={booking.status === "confirmed" || actionLoading}
                        loading={actionLoading}
                        onPress={() => handleStatusUpdate("confirmed")}
                    />
                    <Button
                        title="Cancel"
                        variant="danger"
                        size="small"
                        disabled={booking.status === "cancelled" || actionLoading}
                        onPress={() => handleStatusUpdate("cancelled")}
                    />
                </View>
            </View>

            {/* Trip Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Trip Details</Text>

                <View style={styles.detailRow}>
                    <MapPin size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Route</Text>
                        <Text style={styles.detailValue}>
                            {booking.trip_route_name || `${booking.from_island_name} to ${booking.to_island_name}`}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>
                            {new Date(booking.trip_travel_date || '').toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Clock size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Departure Time</Text>
                        <Text style={styles.detailValue}>{booking.trip_departure_time}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Users size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Passengers</Text>
                        <Text style={styles.detailValue}>{booking.passenger_count || 1}</Text>
                    </View>
                </View>

                {booking.vessel_name && (
                    <View style={styles.detailRow}>
                        <Ship size={20} color={colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Vessel</Text>
                            <Text style={styles.detailValue}>{booking.vessel_name}</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Customer Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Customer Information</Text>

                <View style={styles.detailRow}>
                    <Users size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Name</Text>
                        <Text style={styles.detailValue}>{booking.user_name}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Mail size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{booking.user_email}</Text>
                    </View>
                </View>

                {booking.user_mobile && (
                    <View style={styles.detailRow}>
                        <Phone size={20} color={colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Mobile</Text>
                            <Text style={styles.detailValue}>{booking.user_mobile}</Text>
                        </View>
                    </View>
                )}

                {booking.agent_name && (
                    <View style={styles.detailRow}>
                        <Users size={20} color={colors.secondary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Booked by Agent</Text>
                            <Text style={styles.detailValue}>{booking.agent_name}</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Payment Information */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment Information</Text>

                <View style={styles.detailRow}>
                    <CreditCard size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Total Fare</Text>
                        <Text style={styles.detailValue}>MVR {booking.total_fare}</Text>
                    </View>
                </View>

                {booking.payment_method_type && (
                    <View style={styles.detailRow}>
                        <CreditCard size={20} color={colors.secondary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Payment Method</Text>
                            <Text style={styles.detailValue}>
                                {booking.payment_method_type.replace('_', ' ').toUpperCase()}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.detailRow}>
                    <CheckCircle size={20} color={booking.check_in_status ? colors.success : colors.textSecondary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Check-in Status</Text>
                        <Text style={styles.detailValue}>
                            {booking.check_in_status ? "Checked In" : "Not Checked In"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Booking Metadata */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Booking Information</Text>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Created At</Text>
                        <Text style={styles.detailValue}>
                            {new Date(booking.created_at).toLocaleDateString()} {new Date(booking.created_at).toLocaleTimeString()}
                        </Text>
                    </View>
                </View>

                {booking.is_round_trip && (
                    <View style={styles.detailRow}>
                        <RefreshCw size={20} color={colors.secondary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Round Trip</Text>
                            <Text style={styles.detailValue}>Yes</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <Text style={styles.dangerDescription}>
                    These actions cannot be undone. Please proceed with caution.
                </Text>

                <Button
                    title="Delete Booking"
                    variant="danger"
                    icon={<Trash2 size={18} color="#FFFFFF" />}
                    onPress={handleDelete}
                    loading={actionLoading}
                    fullWidth
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        padding: 16,
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
        textAlign: 'center',
        marginBottom: 24,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    card: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    paymentMethod: {
        fontSize: 12,
        color: colors.textSecondary,
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusActions: {
        flexDirection: 'row',
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailContent: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    dangerCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: colors.danger,
    },
    dangerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.danger,
        marginBottom: 8,
    },
    dangerDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
    },
}); 