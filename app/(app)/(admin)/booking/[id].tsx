import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
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
    RefreshCw
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";

export default function BookingDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { bookings, users, updateBooking, deleteBooking } = useAdminStore();
    const [loading, setLoading] = useState(false);

    const booking = bookings.find(b => b.id === id);
    const customer = users.find(u => u.id === booking?.customerId);

    if (!booking) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Booking not found</Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: typeof booking.status) => {
        setLoading(true);
        try {
            updateBooking(booking.id, { status: newStatus });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentStatusUpdate = async (newStatus: typeof booking.paymentStatus) => {
        setLoading(true);
        try {
            updateBooking(booking.id, { paymentStatus: newStatus });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setLoading(false);
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
                    onPress: () => {
                        deleteBooking(booking.id);
                        router.back();
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: `Booking #${booking.id}`,
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
                        <StatusBadge status={booking.paymentStatus} size="small" />
                    </View>
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Confirm"
                        variant="primary"
                        size="small"
                        disabled={booking.status === "confirmed" || loading}
                        loading={loading}
                        onPress={() => handleStatusUpdate("confirmed")}
                    />
                    <Button
                        title="Cancel"
                        variant="danger"
                        size="small"
                        disabled={booking.status === "cancelled" || loading}
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
                        <Text style={styles.detailValue}>{booking.routeName}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Date</Text>
                        <Text style={styles.detailValue}>{booking.date}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Clock size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Departure Time</Text>
                        <Text style={styles.detailValue}>{booking.departureTime}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Users size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Passengers</Text>
                        <Text style={styles.detailValue}>{booking.passengers}</Text>
                    </View>
                </View>
            </View>

            {/* Customer Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Customer Information</Text>

                <View style={styles.detailRow}>
                    <Users size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Name</Text>
                        <Text style={styles.detailValue}>{booking.customerName}</Text>
                    </View>
                </View>

                {customer && (
                    <>
                        <View style={styles.detailRow}>
                            <Mail size={20} color={colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Email</Text>
                                <Text style={styles.detailValue}>{customer.email}</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Customer Status</Text>
                                <StatusBadge status={customer.status} size="small" />
                            </View>
                        </View>
                    </>
                )}

                <Button
                    title="View Customer Profile"
                    variant="outline"
                    size="small"
                    onPress={() => router.push(`/(admin)/user/${booking.customerId}`)}
                />
            </View>

            {/* Payment Details Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Payment Information</Text>

                <View style={styles.detailRow}>
                    <CreditCard size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Total Amount</Text>
                        <Text style={styles.amountValue}>${booking.totalAmount}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Payment Status</Text>
                        <StatusBadge status={booking.paymentStatus} />
                    </View>
                </View>

                <View style={styles.paymentActions}>
                    <Button
                        title="Mark as Paid"
                        variant="primary"
                        size="small"
                        disabled={booking.paymentStatus === "paid" || loading}
                        icon={<CheckCircle size={16} color="#FFFFFF" />}
                        onPress={() => handlePaymentStatusUpdate("paid")}
                    />
                    <Button
                        title="Refund"
                        variant="outline"
                        size="small"
                        disabled={booking.paymentStatus === "refunded" || loading}
                        icon={<RefreshCw size={16} color={colors.primary} />}
                        onPress={() => handlePaymentStatusUpdate("refunded")}
                    />
                </View>
            </View>

            {/* Booking Metadata */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Booking Information</Text>

                <View style={styles.detailRow}>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Booking ID</Text>
                        <Text style={styles.detailValue}>#{booking.id}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Created At</Text>
                        <Text style={styles.detailValue}>
                            {new Date(booking.createdAt).toLocaleDateString()} {new Date(booking.createdAt).toLocaleTimeString()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsContainer}>
                <Button
                    title="Delete Booking"
                    variant="danger"
                    icon={<Trash2 size={18} color="#FFFFFF" />}
                    onPress={handleDelete}
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    errorText: {
        fontSize: 18,
        color: colors.textSecondary,
        marginBottom: 24,
        textAlign: "center",
    },
    headerActions: {
        marginRight: 16,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    statusContainer: {
        flexDirection: "row",
        gap: 8,
    },
    statusActions: {
        flexDirection: "row",
        gap: 12,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    detailContent: {
        marginLeft: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 16,
        color: colors.text,
        fontWeight: "500",
    },
    amountValue: {
        fontSize: 18,
        color: colors.primary,
        fontWeight: "700",
    },
    paymentActions: {
        flexDirection: "row",
        gap: 12,
        marginTop: 8,
    },
    actionsContainer: {
        marginTop: 16,
    },
}); 