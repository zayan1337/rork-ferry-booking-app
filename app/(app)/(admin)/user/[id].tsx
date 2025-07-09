import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, FlatList } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import {
    User,
    Mail,
    Calendar,
    Shield,
    Edit3,
    Trash2,
    Ban,
    CheckCircle,
    CreditCard,
    Clock
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import BookingItem from "@/components/admin/BookingItem";
import SectionHeader from "@/components/admin/SectionHeader";

export default function UserDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { users, bookings, updateUser, deleteUser } = useAdminStore();
    const [loading, setLoading] = useState(false);

    const user = users.find(u => u.id === id);
    const userBookings = bookings.filter(b => b.customerId === id);

    if (!user) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>User not found</Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: typeof user.status) => {
        setLoading(true);
        try {
            updateUser(user.id, { status: newStatus });
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        router.push(`../user/${user.id}/edit` as any);
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete User",
            "Are you sure you want to delete this user? This action cannot be undone and will also delete all associated bookings.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        deleteUser(user.id);
                        router.back();
                    },
                },
            ]
        );
    };

    const handleBookingPress = (bookingId: string) => {
        router.push(`../booking/${bookingId}` as any);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return colors.success;
            case "inactive": return colors.textSecondary;
            case "suspended": return colors.danger;
            default: return colors.textSecondary;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin": return colors.danger;
            case "agent": return colors.warning;
            case "customer": return colors.primary;
            default: return colors.textSecondary;
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: user.name,
                    headerRight: () => (
                        <Button
                            title="Edit"
                            variant="outline"
                            size="small"
                            icon={<Edit3 size={16} color={colors.primary} />}
                            onPress={handleEdit}
                        />
                    ),
                }}
            />

            {/* User Status Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>User Status</Text>
                    <StatusBadge status={user.status} />
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Activate"
                        variant="primary"
                        size="small"
                        disabled={user.status === "active" || loading}
                        loading={loading}
                        onPress={() => handleStatusUpdate("active")}
                    />
                    <Button
                        title="Suspend"
                        variant="danger"
                        size="small"
                        disabled={user.status === "suspended" || loading}
                        icon={<Ban size={16} color="#FFFFFF" />}
                        onPress={() => handleStatusUpdate("suspended")}
                    />
                </View>
            </View>

            {/* Personal Information Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Personal Information</Text>

                <View style={styles.detailRow}>
                    <User size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Full Name</Text>
                        <Text style={styles.detailValue}>{user.name}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Mail size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email Address</Text>
                        <Text style={styles.detailValue}>{user.email}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Shield size={20} color={getRoleColor(user.role)} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Role</Text>
                        <View style={styles.roleContainer}>
                            <Text style={[styles.roleText, { color: getRoleColor(user.role) }]}>
                                {user.role.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Created At</Text>
                        <Text style={styles.detailValue}>
                            {new Date(user.createdAt).toLocaleDateString()} {new Date(user.createdAt).toLocaleTimeString()}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Statistics Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Booking Statistics</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <CreditCard size={24} color={colors.primary} />
                        <Text style={styles.statValue}>{userBookings.length}</Text>
                        <Text style={styles.statLabel}>Total Bookings</Text>
                    </View>

                    <View style={styles.statItem}>
                        <CheckCircle size={24} color={colors.success} />
                        <Text style={styles.statValue}>
                            {userBookings.filter(b => b.status === "confirmed").length}
                        </Text>
                        <Text style={styles.statLabel}>Confirmed</Text>
                    </View>

                    <View style={styles.statItem}>
                        <Clock size={24} color={colors.warning} />
                        <Text style={styles.statValue}>
                            {userBookings.filter(b => b.status === "pending").length}
                        </Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                </View>
            </View>

            {/* Booking History */}
            <View style={styles.card}>
                <SectionHeader
                    title="Booking History"
                    subtitle={userBookings.length > 0 ? `${userBookings.length} bookings` : undefined}
                />

                {userBookings.length > 0 ? (
                    <FlatList
                        data={userBookings}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <BookingItem
                                booking={item}
                                onPress={() => handleBookingPress(item.id)}
                            />
                        )}
                        scrollEnabled={false}
                        showsVerticalScrollIndicator={false}
                    />
                ) : (
                    <View style={styles.emptyState}>
                        <CreditCard size={32} color={colors.textSecondary} />
                        <Text style={styles.emptyStateText}>No bookings found</Text>
                    </View>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>

                <View style={styles.actionGrid}>
                    <Button
                        title="Create Booking"
                        variant="primary"
                        icon={<CreditCard size={18} color="#FFFFFF" />}
                        onPress={() => router.push("../booking/new" as any)}
                        fullWidth
                    />

                    {user.role === "customer" && (
                        <Button
                            title="Upgrade to Agent"
                            variant="secondary"
                            icon={<Shield size={18} color="#FFFFFF" />}
                            onPress={() => handleStatusUpdate("active")}
                            fullWidth
                        />
                    )}
                </View>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerCard}>
                <Text style={styles.dangerTitle}>Danger Zone</Text>
                <Text style={styles.dangerDescription}>
                    These actions cannot be undone. Please proceed with caution.
                </Text>

                <Button
                    title="Delete User"
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
    dangerCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.danger,
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
    dangerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.danger,
        marginBottom: 8,
    },
    dangerDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
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
    roleContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    roleText: {
        fontSize: 14,
        fontWeight: "600",
    },
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-around",
    },
    statItem: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.primary,
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: "center",
    },
    emptyState: {
        alignItems: "center",
        padding: 24,
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
    },
    actionGrid: {
        gap: 12,
    },
}); 