import React, { useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import {
    CreditCard,
    Plus,
    TrendingUp,
    Clock,
    CheckCircle,
    Users
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import BookingItem from "@/components/admin/BookingItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";

export default function BookingsScreen() {
    const {
        bookings,
        refreshData,
    } = useAdminStore();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    };

    const filteredBookings = bookings?.filter((booking) =>
        (booking?.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (booking?.routeName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (booking?.id || "").includes(searchQuery)
    ) || [];

    // Calculate stats
    const todayBookings = bookings?.filter(b => {
        const today = new Date().toISOString().split('T')[0];
        return b?.date === today;
    }) || [];

    const totalRevenue = bookings?.reduce((sum, b) => sum + (b?.totalAmount || 0), 0) || 0;
    const completedBookings = bookings?.filter(b => b?.status === "confirmed").length || 0;
    const pendingBookings = bookings?.filter(b => b?.status === "pending").length || 0;

    return (
        <ScrollView
            style={styles.container}
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
            <Stack.Screen
                options={{
                    title: "Bookings",
                    headerRight: () => (
                        <Button
                            title="New"
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color="#FFFFFF" />}
                            onPress={() => router.push("../booking/new")}
                        />
                    ),
                }}
            />

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
                <StatCard
                    title="Today's Bookings"
                    value={todayBookings.length.toString()}
                    icon={<CreditCard size={24} color={colors.primary} />}
                    subtitle="+12%"
                />
                <StatCard
                    title="Total Revenue"
                    value={`$${totalRevenue.toLocaleString()}`}
                    icon={<TrendingUp size={24} color={colors.success} />}
                    subtitle="+15%"
                />
                <StatCard
                    title="Confirmed"
                    value={completedBookings.toString()}
                    icon={<CheckCircle size={24} color={colors.success} />}
                    subtitle="+8%"
                />
                <StatCard
                    title="Pending"
                    value={pendingBookings.toString()}
                    icon={<Clock size={24} color={colors.warning} />}
                    subtitle={pendingBookings > 0 ? "+3" : "0"}
                />
            </View>

            {/* Search Bar */}
            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search bookings..."
            />

            {/* Bookings List */}
            <View style={styles.section}>
                <SectionHeader
                    title={`All Bookings (${filteredBookings.length})`}
                    onSeeAll={() => {/* Open filter modal */ }}
                />

                {filteredBookings.length === 0 ? (
                    <EmptyState
                        title="No bookings found"
                        message={searchQuery ? "No bookings match your search criteria" : "No bookings available"}
                        icon={<CreditCard size={48} color={colors.textSecondary} />}
                    />
                ) : (
                    filteredBookings.map((booking) => (
                        <BookingItem
                            key={booking.id}
                            booking={booking}
                            onPress={() => router.push(`../booking/${booking.id}`)}
                        />
                    ))
                )}

                <View style={styles.actionButton}>
                    <Button
                        title="Create New Booking"
                        variant="outline"
                        icon={<Plus size={18} color={colors.primary} />}
                        onPress={() => router.push("../booking/new")}
                        fullWidth
                    />
                </View>
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
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    actionButton: {
        marginTop: 16,
    },
}); 