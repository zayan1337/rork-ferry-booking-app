import React, { useState, useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View, FlatList } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminUsers, useAdminBookings } from "@/hooks/admin";
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
    Clock,
    Phone
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import StatusBadge from "@/components/admin/StatusBadge";
import BookingItem from "@/components/admin/BookingItem";
import SectionHeader from "@/components/admin/SectionHeader";
import { AdminUser, AdminBooking } from "@/types/admin";

export default function UserDetailsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { 
        getUserDetails, 
        updateUser: updateUserStatus, 
        deleteUser,
        loading: userLoading,
        error: userError 
    } = useAdminUsers();
    
    const { 
        fetchBookings: fetchUserBookings,
        bookings: allBookings
    } = useAdminBookings();
    
    const [user, setUser] = useState<AdminUser | null>(null);
    const [userBookings, setUserBookings] = useState<AdminBooking[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    // Load user details and bookings
    useEffect(() => {
        if (id) {
            loadUserDetails();
            loadUserBookings();
        }
    }, [id]);

    const loadUserDetails = async () => {
        try {
            const userData = await getUserDetails(id!);
            setUser(userData);
        } catch (err) {
            console.error('Error loading user details:', err);
        }
    };

    const loadUserBookings = async () => {
        try {
            // Filter bookings for this user
            const userSpecificBookings = allBookings.filter(b => b.user_id === id);
            setUserBookings(userSpecificBookings);
        } catch (err) {
            console.error('Error loading user bookings:', err);
        }
    };

    // Refresh bookings when allBookings changes
    useEffect(() => {
        if (id && allBookings.length > 0) {
            const userSpecificBookings = allBookings.filter(b => b.user_id === id);
            setUserBookings(userSpecificBookings);
        }
    }, [allBookings, id]);

    if (userLoading && !user) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading user details...</Text>
            </View>
        );
    }

    if (userError || !user) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {userError || "User not found"}
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    const handleStatusUpdate = async (newStatus: boolean) => {
        setActionLoading(true);
        try {
            const success = await updateUserStatus(user.id, { is_active: newStatus });
            if (success) {
                setUser(prev => prev ? { ...prev, is_active: newStatus } : null);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update user status');
        } finally {
            setActionLoading(false);
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
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const success = await deleteUser(user.id);
                            if (success) {
                                router.back();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete user');
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleBookingPress = (bookingId: string) => {
        router.push(`../booking/${bookingId}` as any);
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case "admin": return colors.danger;
            case "agent": return colors.warning;
            case "customer": return colors.primary;
            default: return colors.textSecondary;
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        } catch {
            return dateString;
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Stack.Screen
                options={{
                    title: user.full_name,
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
                    <StatusBadge status={user.is_active ? "active" : "inactive"} />
                </View>

                <View style={styles.statusActions}>
                    <Button
                        title="Activate"
                        variant="primary"
                        size="small"
                        disabled={user.is_active || actionLoading}
                        loading={actionLoading}
                        onPress={() => handleStatusUpdate(true)}
                    />
                    <Button
                        title="Deactivate"
                        variant="danger"
                        size="small"
                        disabled={!user.is_active || actionLoading}
                        icon={<Ban size={16} color="#FFFFFF" />}
                        onPress={() => handleStatusUpdate(false)}
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
                        <Text style={styles.detailValue}>{user.full_name}</Text>
                    </View>
                </View>

                <View style={styles.detailRow}>
                    <Mail size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email Address</Text>
                        <Text style={styles.detailValue}>{user.email}</Text>
                    </View>
                </View>

                {user.mobile_number && (
                    <View style={styles.detailRow}>
                        <Phone size={20} color={colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Mobile Number</Text>
                            <Text style={styles.detailValue}>{user.mobile_number}</Text>
                        </View>
                    </View>
                )}

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

                {user.date_of_birth && (
                    <View style={styles.detailRow}>
                        <Calendar size={20} color={colors.secondary} />
                        <View style={styles.detailContent}>
                            <Text style={styles.detailLabel}>Date of Birth</Text>
                            <Text style={styles.detailValue}>
                                {new Date(user.date_of_birth).toLocaleDateString()}
                            </Text>
                        </View>
                    </View>
                )}

                <View style={styles.detailRow}>
                    <Calendar size={20} color={colors.primary} />
                    <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Created At</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(user.created_at)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Agent Information (if user is agent) */}
            {user.role === 'agent' && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Agent Information</Text>

                    {user.agent_discount && (
                        <View style={styles.detailRow}>
                            <CreditCard size={20} color={colors.warning} />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Agent Discount</Text>
                                <Text style={styles.detailValue}>{user.agent_discount}%</Text>
                            </View>
                        </View>
                    )}

                    {user.credit_ceiling && (
                        <View style={styles.detailRow}>
                            <CreditCard size={20} color={colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Credit Ceiling</Text>
                                <Text style={styles.detailValue}>MVR {user.credit_ceiling}</Text>
                            </View>
                        </View>
                    )}

                    {user.credit_balance !== undefined && (
                        <View style={styles.detailRow}>
                            <CreditCard size={20} color={user.credit_balance < 0 ? colors.danger : colors.success} />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Credit Balance</Text>
                                <Text style={[styles.detailValue, { 
                                    color: user.credit_balance < 0 ? colors.danger : colors.success 
                                }]}>
                                    MVR {user.credit_balance}
                                </Text>
                            </View>
                        </View>
                    )}

                    {user.free_tickets_allocation && (
                        <View style={styles.detailRow}>
                            <CheckCircle size={20} color={colors.secondary} />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Free Tickets</Text>
                                <Text style={styles.detailValue}>
                                    {user.free_tickets_remaining || 0} / {user.free_tickets_allocation}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            )}

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
                            {userBookings.filter(b => b.status === "pending_payment").length}
                        </Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>

                    <View style={styles.statItem}>
                        <CreditCard size={24} color={colors.secondary} />
                        <Text style={styles.statValue}>
                            MVR {userBookings.reduce((sum, b) => sum + (b.total_fare || 0), 0)}
                        </Text>
                        <Text style={styles.statLabel}>Total Spent</Text>
                    </View>
                </View>
            </View>

            {/* Recent Bookings */}
            {userBookings.length > 0 && (
                <View style={styles.card}>
                    <SectionHeader
                        title={`Recent Bookings (${userBookings.length})`}
                        onSeeAll={() => {/* Navigate to bookings with user filter */}}
                    />

                    <FlatList
                        data={userBookings.slice(0, 5)} // Show only 5 most recent
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <BookingItem
                                booking={item}
                                onPress={() => handleBookingPress(item.id)}
                            />
                        )}
                        scrollEnabled={false}
                    />

                    {userBookings.length > 5 && (
                        <Button
                            title={`View All ${userBookings.length} Bookings`}
                            variant="outline"
                            onPress={() => {/* Navigate to bookings page with user filter */}}
                            fullWidth
                        />
                    )}
                </View>
            )}

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
    roleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: colors.backgroundSecondary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
        width: '48%',
        marginBottom: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
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