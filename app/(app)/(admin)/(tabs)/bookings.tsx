import React, { useState, useMemo } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Dimensions,
    TouchableOpacity,
    Alert,
    Modal
} from "react-native";
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    CreditCard,
    Plus,
    TrendingUp,
    Clock,
    CheckCircle,
    Users,
    Filter,
    Calendar,
    MapPin,
    ArrowUpDown,
    Download,
    Eye,
    Edit,
    Trash2,
    AlertTriangle,
    X,
    Check,
    MoreHorizontal
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import BookingItem from "@/components/admin/BookingItem";
import EmptyState from "@/components/admin/EmptyState";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import { Booking } from "@/types/admin";

const { width: screenWidth } = Dimensions.get('window');

type FilterStatus = "all" | "reserved" | "confirmed" | "cancelled" | "completed";
type SortOrder = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "customer_asc";

export default function BookingsScreen() {
    const {
        bookings,
        routes,
        vessels,
        dashboardStats,
        refreshData,
        updateBooking,
        addActivityLog
    } = useAdminStore();

    const {
        canViewBookings,
        canCreateBookings,
        canUpdateBookings,
        canExportReports
    } = useAdminPermissions();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    };

    // Enhanced filtering and sorting
    const filteredAndSortedBookings = useMemo(() => {
        let filtered = bookings.filter((booking) => {
            // Text search
            const searchMatch = searchQuery === "" ||
                (booking?.customerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (booking?.routeName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (booking?.id || "").includes(searchQuery) ||
                (booking?.customerEmail?.toLowerCase() || "").includes(searchQuery.toLowerCase());

            // Status filter
            const statusMatch = filterStatus === "all" || booking.status === filterStatus;

            return searchMatch && statusMatch;
        });

        // Sorting
        return filtered.sort((a, b) => {
            switch (sortOrder) {
                case "date_asc":
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                case "date_desc":
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case "amount_desc":
                    return (b.totalAmount || 0) - (a.totalAmount || 0);
                case "amount_asc":
                    return (a.totalAmount || 0) - (b.totalAmount || 0);
                case "customer_asc":
                    return (a.customerName || "").localeCompare(b.customerName || "");
                default:
                    return 0;
            }
        });
    }, [bookings, searchQuery, filterStatus, sortOrder]);

    // Enhanced statistics
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const todayBookings = bookings.filter(b => b.date === today);
        const yesterdayBookings = bookings.filter(b => b.date === yesterday);

        const todayRevenue = todayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const yesterdayRevenue = yesterdayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
        const confirmedCount = bookings.filter(b => b.status === "confirmed").length;
        const reservedCount = bookings.filter(b => b.status === "reserved").length;
        const cancelledCount = bookings.filter(b => b.status === "cancelled").length;

        return {
            todayBookings: todayBookings.length,
            todayBookingsChange: yesterdayBookings.length > 0
                ? ((todayBookings.length - yesterdayBookings.length) / yesterdayBookings.length * 100).toFixed(1)
                : "0",
            todayRevenue,
            todayRevenueChange: yesterdayRevenue > 0
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
                : "0",
            totalRevenue,
            confirmedCount,
            confirmedRate: bookings.length > 0 ? (confirmedCount / bookings.length * 100).toFixed(1) : "0",
            reservedCount,
            cancelledCount
        };
    }, [bookings]);

    const handleBookingPress = (booking: Booking) => {
        if (canViewBookings()) {
            router.push(`../booking/${booking.id}` as any);
        }
    };

    const handleNewBooking = () => {
        if (canCreateBookings()) {
            router.push("../booking/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create bookings.");
        }
    };

    const handleExport = async () => {
        if (canExportReports()) {
            try {
                // Mock export functionality
                await new Promise(resolve => setTimeout(resolve, 1000));
                addActivityLog({
                    user_id: "admin1",
                    user_name: "Admin User",
                    action: "Export Bookings",
                    details: `Exported ${filteredAndSortedBookings.length} bookings`
                });
                Alert.alert("Success", "Bookings report exported successfully.");
            } catch (error) {
                Alert.alert("Error", "Failed to export bookings report.");
            }
        } else {
            Alert.alert("Access Denied", "You don't have permission to export reports.");
        }
    };

    const handleBulkStatusUpdate = async (status: string) => {
        if (!canUpdateBookings()) {
            Alert.alert("Access Denied", "You don't have permission to update bookings.");
            return;
        }

        Alert.alert(
            "Bulk Update",
            `Update ${selectedBookings.length} booking(s) to ${status}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Update",
                    onPress: async () => {
                        try {
                            for (const bookingId of selectedBookings) {
                                await updateBooking(bookingId, { status: status as any });
                            }
                            setSelectedBookings([]);
                            setShowBulkActions(false);
                            addActivityLog({
                                user_id: "admin1",
                                user_name: "Admin User",
                                action: "Bulk Update Bookings",
                                details: `Updated ${selectedBookings.length} bookings to ${status}`
                            });
                            Alert.alert("Success", "Bookings updated successfully.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to update bookings.");
                        }
                    }
                }
            ]
        );
    };

    const toggleBookingSelection = (bookingId: string) => {
        setSelectedBookings(prev =>
            prev.includes(bookingId)
                ? prev.filter(id => id !== bookingId)
                : [...prev, bookingId]
        );
    };

    const getStatusCount = (status: FilterStatus) => {
        if (status === "all") return bookings.length;
        return bookings.filter(b => b.status === status).length;
    };

    const getResponsivePadding = () => ({
        paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
        paddingVertical: isTablet ? 20 : 16,
    });

    if (!canViewBookings()) {
        return (
            <View style={styles.noPermissionContainer}>
                <AlertTriangle size={48} color={colors.warning} />
                <Text style={styles.noPermissionText}>
                    You don't have permission to view bookings.
                </Text>
            </View>
        );
    }

    return (
        <>
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
                            <View style={styles.headerActions}>
                                {canExportReports() && (
                                    <Button
                                        title=""
                                        variant="ghost"
                                        size="small"
                                        icon={<Download size={16} color={colors.primary} />}
                                        onPress={handleExport}
                                    />
                                )}
                                {canCreateBookings() && (
                                    <Button
                                        title={isSmallScreen ? "New" : "New Booking"}
                                        variant="primary"
                                        size={isTablet ? "medium" : "small"}
                                        icon={<Plus size={isTablet ? 18 : 16} color="#FFFFFF" />}
                                        onPress={handleNewBooking}
                                    />
                                )}
                            </View>
                        ),
                    }}
                />

                {/* Enhanced Stats */}
                <View style={styles.statsContainer}>
                    <SectionHeader
                        title="Bookings Overview"
                        subtitle="Performance metrics and trends"
                        size={isTablet ? "large" : "medium"}
                    />
                    <View style={styles.statsGrid}>
                        <StatCard
                            title="Today's Bookings"
                            value={stats.todayBookings.toString()}
                            subtitle={`MVR ${stats.todayRevenue.toFixed(2)} revenue`}
                            icon={<CreditCard size={isTablet ? 20 : 18} color={colors.primary} />}
                            size={isTablet ? "large" : "medium"}
                            trend={Number(stats.todayBookingsChange) >= 0 ? "up" : "down"}
                            trendValue={`${Math.abs(Number(stats.todayBookingsChange))}%`}
                        />
                        <StatCard
                            title="Total Revenue"
                            value={`MVR ${stats.totalRevenue.toLocaleString()}`}
                            subtitle={`Today: MVR ${stats.todayRevenue.toFixed(2)}`}
                            icon={<TrendingUp size={isTablet ? 20 : 18} color={colors.success} />}
                            color={colors.success}
                            size={isTablet ? "large" : "medium"}
                            trend={Number(stats.todayRevenueChange) >= 0 ? "up" : "down"}
                            trendValue={`${Math.abs(Number(stats.todayRevenueChange))}%`}
                        />
                        <StatCard
                            title="Confirmed"
                            value={stats.confirmedCount.toString()}
                            subtitle={`${stats.confirmedRate}% success rate`}
                            icon={<CheckCircle size={isTablet ? 20 : 18} color={colors.success} />}
                            color={colors.success}
                            size={isTablet ? "large" : "medium"}
                        />
                        <StatCard
                            title="Reserved"
                            value={stats.reservedCount.toString()}
                            subtitle={stats.reservedCount > 0 ? "Needs confirmation" : "All confirmed"}
                            icon={<Clock size={isTablet ? 20 : 18} color={colors.warning} />}
                            color={colors.warning}
                            size={isTablet ? "large" : "medium"}
                        />
                    </View>
                </View>

                {/* Enhanced Search and Filter */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchWrapper}>
                        <SearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search by customer, route, booking ID, or email..."
                        />
                    </View>
                    <Button
                        title=""
                        variant="outline"
                        size={isTablet ? "large" : "medium"}
                        icon={<Filter size={isTablet ? 20 : 18} color={colors.primary} />}
                        onPress={() => setShowFilterModal(true)}
                    />
                    <Button
                        title=""
                        variant="outline"
                        size={isTablet ? "large" : "medium"}
                        icon={<ArrowUpDown size={isTablet ? 20 : 18} color={colors.primary} />}
                        onPress={() => {
                            const sortOptions: SortOrder[] = ["date_desc", "date_asc", "amount_desc", "amount_asc", "customer_asc"];
                            const currentIndex = sortOptions.indexOf(sortOrder);
                            const nextIndex = (currentIndex + 1) % sortOptions.length;
                            setSortOrder(sortOptions[nextIndex]);
                        }}
                    />
                </View>

                {/* Status Filter Tabs */}
                <View style={styles.statusTabs}>
                    {(["all", "reserved", "confirmed", "cancelled", "completed"] as FilterStatus[]).map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.statusTab,
                                filterStatus === status && styles.statusTabActive
                            ]}
                            onPress={() => setFilterStatus(status)}
                        >
                            <Text style={[
                                styles.statusTabText,
                                filterStatus === status && styles.statusTabTextActive
                            ]}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                            <Text style={[
                                styles.statusTabCount,
                                filterStatus === status && styles.statusTabCountActive
                            ]}>
                                {getStatusCount(status)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Bulk Actions Bar */}
                {selectedBookings.length > 0 && (
                    <View style={styles.bulkActionsBar}>
                        <Text style={styles.bulkActionsText}>
                            {selectedBookings.length} booking(s) selected
                        </Text>
                        <View style={styles.bulkActionsButtons}>
                            {canUpdateBookings() && (
                                <>
                                    <Button
                                        title="Confirm"
                                        variant="primary"
                                        size="small"
                                        onPress={() => handleBulkStatusUpdate("confirmed")}
                                    />
                                    <Button
                                        title="Cancel"
                                        variant="danger"
                                        size="small"
                                        onPress={() => handleBulkStatusUpdate("cancelled")}
                                    />
                                </>
                            )}
                            <Button
                                title="Clear"
                                variant="ghost"
                                size="small"
                                onPress={() => setSelectedBookings([])}
                            />
                        </View>
                    </View>
                )}

                {/* Bookings List */}
                <View style={styles.section}>
                    <SectionHeader
                        title={searchQuery ? "Search Results" : "All Bookings"}
                        subtitle={`${filteredAndSortedBookings.length} ${filteredAndSortedBookings.length === 1 ? 'booking' : 'bookings'} found`}
                        size={isTablet ? "large" : "medium"}
                    />

                    {filteredAndSortedBookings.length === 0 ? (
                        <EmptyState
                            icon={<CreditCard size={48} color={colors.textSecondary} />}
                            title="No bookings found"
                            message={searchQuery ? "Try adjusting your search criteria" : "No bookings match the current filters"}
                        />
                    ) : (
                        <View style={styles.bookingsList}>
                            {filteredAndSortedBookings.map((booking) => (
                                <View key={booking.id} style={styles.bookingItemWrapper}>
                                    {canUpdateBookings() && (
                                        <TouchableOpacity
                                            style={styles.selectionCheckbox}
                                            onPress={() => toggleBookingSelection(booking.id)}
                                        >
                                            <View style={[
                                                styles.checkbox,
                                                selectedBookings.includes(booking.id) && styles.checkboxSelected
                                            ]}>
                                                {selectedBookings.includes(booking.id) && (
                                                    <Check size={14} color="white" />
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    <View style={styles.bookingItemContent}>
                                        <BookingItem
                                            booking={booking}
                                            onPress={() => handleBookingPress(booking)}
                                            compact={!isTablet}
                                        />
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Filter Modal */}
            <Modal
                visible={showFilterModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.filterModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter & Sort</Text>
                            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort by</Text>
                            {[
                                { key: "date_desc", label: "Date (Newest)" },
                                { key: "date_asc", label: "Date (Oldest)" },
                                { key: "amount_desc", label: "Amount (High to Low)" },
                                { key: "amount_asc", label: "Amount (Low to High)" },
                                { key: "customer_asc", label: "Customer Name" }
                            ].map((option) => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[
                                        styles.filterOption,
                                        sortOrder === option.key && styles.filterOptionSelected
                                    ]}
                                    onPress={() => setSortOrder(option.key as SortOrder)}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        sortOrder === option.key && styles.filterOptionTextSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {sortOrder === option.key && (
                                        <Check size={16} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <Button
                                title="Clear All"
                                variant="ghost"
                                onPress={() => {
                                    setFilterStatus("all");
                                    setSortOrder("date_desc");
                                    setSearchQuery("");
                                }}
                            />
                            <Button
                                title="Apply"
                                variant="primary"
                                onPress={() => setShowFilterModal(false)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    contentContainer: {
        flexGrow: 1,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
    },
    statsContainer: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 16,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    searchWrapper: {
        flex: 1,
    },
    statusTabs: {
        flexDirection: "row",
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statusTab: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    statusTabActive: {
        backgroundColor: colors.primary,
    },
    statusTabText: {
        fontSize: 12,
        fontWeight: "500",
        color: colors.textSecondary,
        marginBottom: 2,
    },
    statusTabTextActive: {
        color: "white",
    },
    statusTabCount: {
        fontSize: 10,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    statusTabCountActive: {
        color: "white",
    },
    bulkActionsBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.primary + "10",
        borderWidth: 1,
        borderColor: colors.primary + "30",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    bulkActionsText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.primary,
    },
    bulkActionsButtons: {
        flexDirection: "row",
        gap: 8,
    },
    section: {
        marginBottom: 24,
    },
    bookingsList: {
        gap: 12,
        marginTop: 16,
    },
    bookingItemWrapper: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    selectionCheckbox: {
        padding: 4,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: "center",
        justifyContent: "center",
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    bookingItemContent: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    filterModal: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 12,
    },
    filterOption: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    filterOptionSelected: {
        backgroundColor: colors.primary + "10",
    },
    filterOptionText: {
        fontSize: 14,
        color: colors.text,
    },
    filterOptionTextSelected: {
        color: colors.primary,
        fontWeight: "500",
    },
    modalActions: {
        flexDirection: "row",
        gap: 12,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 64,
        gap: 16,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 250,
    },
}); 