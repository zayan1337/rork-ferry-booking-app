import React, { useState, useEffect } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Dimensions
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminBookings } from "@/hooks/admin";
import {
    CreditCard,
    Plus,
    TrendingUp,
    Clock,
    CheckCircle,
    Users,
    Filter
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import BookingItem from "@/components/admin/BookingItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";

const { width: screenWidth } = Dimensions.get('window');

export default function BookingsScreen() {
    const {
        bookings,
        loading,
        error,
        pagination,
        fetchBookings,
        refreshBookings
    } = useAdminBookings();
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    // Initialize data on component mount
    useEffect(() => {
        fetchBookings();
    }, []);

    // Handle search with debouncing
    useEffect(() => {
        const delayedSearch = setTimeout(() => {
            if (searchQuery.trim()) {
                fetchBookings({ search: searchQuery.trim() });
            } else {
                fetchBookings();
            }
        }, 300);

        return () => clearTimeout(delayedSearch);
    }, [searchQuery]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshBookings();
        } catch (error) {
            console.error('Error refreshing bookings:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Calculate stats from actual bookings data
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = bookings.filter(b =>
        b.created_at && b.created_at.startsWith(today)
    );
    const totalRevenue = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + (b.total_fare || 0), 0);
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending_payment').length;

    // Recent bookings (last 7 days) for when no search is active
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentBookings = searchQuery ? [] : bookings.filter(b => {
        if (!b.created_at) return false;
        const bookingDate = new Date(b.created_at);
        return bookingDate >= weekAgo;
    });

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    const handleFilterPress = () => {
        // TODO: Implement filter modal
        console.log("Filter modal");
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.contentContainer, getResponsivePadding()]}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.primary}
                />
            }
            showsVerticalScrollIndicator={false}
        >
            <Stack.Screen
                options={{
                    title: "Bookings",
                    headerRight: () => (
                        <Button
                            title={isSmallScreen ? "New" : "New Booking"}
                            variant="primary"
                            size={isTablet ? "medium" : "small"}
                            icon={<Plus size={isTablet ? 18 : 16} color="#FFFFFF" />}
                            onPress={() => router.push("../booking/new")}
                        />
                    ),
                }}
            />

            {/* Overview Stats */}
            <View style={styles.statsContainer}>
                <SectionHeader
                    title="Bookings Overview"
                    subtitle="Performance metrics"
                    size={isTablet ? "large" : "medium"}
                />
                <View style={styles.statsGrid}>
                    <StatCard
                        title="Today's Bookings"
                        value={todayBookings.length.toString()}
                        subtitle={`${pagination.total} total bookings`}
                        icon={<CreditCard size={isTablet ? 20 : 18} color={colors.primary} />}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Total Revenue"
                        value={`$${totalRevenue.toLocaleString()}`}
                        subtitle="From confirmed bookings"
                        icon={<TrendingUp size={isTablet ? 20 : 18} color={colors.success} />}
                        color={colors.success}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Confirmed"
                        value={confirmedBookings.toString()}
                        subtitle={`${bookings.length > 0 ? ((confirmedBookings / bookings.length) * 100).toFixed(1) : 0}% rate`}
                        icon={<CheckCircle size={isTablet ? 20 : 18} color={colors.success} />}
                        color={colors.success}
                        size={isTablet ? "large" : "medium"}
                    />
                    <StatCard
                        title="Pending"
                        value={pendingBookings.toString()}
                        subtitle={pendingBookings > 0 ? "Needs attention" : "All clear"}
                        icon={<Clock size={isTablet ? 20 : 18} color={colors.warning} />}
                        color={colors.warning}
                        size={isTablet ? "large" : "medium"}
                    />
                </View>
            </View>

            {/* Search and Filter */}
            <View style={styles.searchContainer}>
                <View style={styles.searchWrapper}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search by customer, route, or booking ID..."
                    />
                </View>
                <Button
                    title=""
                    variant="outline"
                    size={isTablet ? "large" : "medium"}
                    icon={<Filter size={isTablet ? 20 : 18} color={colors.primary} />}
                    onPress={handleFilterPress}
                />
            </View>

            {/* Recent Bookings Section */}
            {recentBookings.length > 0 && searchQuery === "" && (
                <View style={styles.section}>
                    <SectionHeader
                        title="Recent Bookings"
                        subtitle="Last 7 days"
                        size={isTablet ? "large" : "medium"}
                    />
                    {recentBookings.slice(0, 3).map((booking) => (
                        <BookingItem
                            key={`recent-${booking.id}`}
                            booking={booking}
                            onPress={() => router.push(`../booking/${booking.id}`)}
                            compact={!isTablet}
                        />
                    ))}
                </View>
            )}

            {/* All Bookings List */}
            <View style={styles.section}>
                <SectionHeader
                    title={searchQuery ? "Search Results" : "All Bookings"}
                    subtitle={`${pagination.total} ${pagination.total === 1 ? 'booking' : 'bookings'}`}
                    size={isTablet ? "large" : "medium"}
                    action={
                        <Button
                            title="Export"
                            variant="ghost"
                            size="small"
                            onPress={() => {/* TODO: Export functionality */ }}
                        />
                    }
                />

                {bookings.length === 0 && !loading ? (
                    <EmptyState
                        title="No bookings found"
                        message={searchQuery
                            ? "No bookings match your search criteria. Try adjusting your search terms."
                            : "No bookings available yet. Create your first booking to get started."
                        }
                        icon={<CreditCard size={isTablet ? 56 : 48} color={colors.textSecondary} />}
                        action={
                            !searchQuery ? (
                                <Button
                                    title="Create First Booking"
                                    variant="primary"
                                    size={isTablet ? "large" : "medium"}
                                    icon={<Plus size={isTablet ? 20 : 18} color="white" />}
                                    onPress={() => router.push("../booking/new")}
                                />
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        {bookings.map((booking) => (
                            <BookingItem
                                key={booking.id}
                                booking={booking}
                                onPress={() => router.push(`../booking/${booking.id}`)}
                                compact={!isTablet}
                            />
                        ))}

                        {/* Load More / Pagination */}
                        {pagination.page < pagination.total_pages && (
                            <View style={styles.loadMoreContainer}>
                                <Button
                                    title="Load More Bookings"
                                    variant="outline"
                                    size={isTablet ? "large" : "medium"}
                                    onPress={() => {
                                        fetchBookings({ search: searchQuery.trim() || undefined });
                                    }}
                                    fullWidth={isSmallScreen}
                                    disabled={loading}
                                />
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <SectionHeader
                    title="Quick Actions"
                    size={isTablet ? "large" : "medium"}
                />
                <View style={[styles.actionsGrid, { gap: isTablet ? 16 : 12 }]}>
                    <Button
                        title="Create New Booking"
                        variant="primary"
                        size={isTablet ? "large" : "medium"}
                        icon={<Plus size={isTablet ? 20 : 18} color="white" />}
                        onPress={() => router.push("../booking/new")}
                        fullWidth={isSmallScreen}
                    />
                    <Button
                        title="Bulk Actions"
                        variant="secondary"
                        size={isTablet ? "large" : "medium"}
                        icon={<Users size={isTablet ? 20 : 18} color="white" />}
                        onPress={() => {/* TODO: Bulk actions */ }}
                        fullWidth={isSmallScreen}
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
        paddingBottom: 32,
    },
    statsContainer: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 24,
    },
    searchWrapper: {
        flex: 1,
    },
    section: {
        marginBottom: 28,
    },
    loadMoreContainer: {
        marginTop: 16,
        alignItems: "center",
    },
    actionsGrid: {
        flexDirection: "column",
    },
}); 