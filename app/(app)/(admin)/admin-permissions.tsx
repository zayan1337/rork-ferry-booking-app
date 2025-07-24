import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
    Users,
    Crown,
    Activity,
    Key,
    Filter,
    Search,
    SortAsc,
    SortDesc,
    Shield,
    ArrowLeft,
    TrendingUp,
    UserCheck,
    UserX,
} from 'lucide-react-native';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { colors as adminColors } from '@/constants/adminColors';
import SearchBar from '@/components/admin/SearchBar';
import Button from '@/components/admin/Button';
import AdminUserItem from '@/components/admin/AdminUserItem';
import EmptyState from '@/components/admin/EmptyState';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function AdminPermissionsList() {
    const {
        users: admins,
        stats,
        loading,
        fetchUsers,
        permissions,
    } = usePermissionStore();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'super_admin'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'permissions' | 'lastLogin'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchUsers();
        } finally {
            setRefreshing(false);
        }
    }, [fetchUsers]);

    // Only admins who are super admin or have permissions:manage
    const permissionManagers = useMemo(() => {
        return admins.filter(admin => {
            if (admin.is_super_admin) return true;
            // Check if user has permissions:manage
            return admin.all_permissions?.some(
                p => p.resource === 'permissions' && p.action === 'manage'
            );
        });
    }, [admins]);

    // Search and filter
    const filteredAdmins = useMemo(() => {
        let filtered = permissionManagers;
        if (searchQuery) {
            filtered = filtered.filter(admin =>
                admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                admin.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        if (filter === 'active') filtered = filtered.filter(a => a.is_active);
        if (filter === 'inactive') filtered = filtered.filter(a => !a.is_active);
        if (filter === 'super_admin') filtered = filtered.filter(a => a.is_super_admin);
        // Sort
        filtered = [...filtered].sort((a, b) => {
            let aValue: any, bValue: any;
            switch (sortBy) {
                case 'name':
                    aValue = a.full_name.toLowerCase();
                    bValue = b.full_name.toLowerCase();
                    break;
                case 'role':
                    aValue = a.is_super_admin ? 'super_admin' : a.role;
                    bValue = b.is_super_admin ? 'super_admin' : b.role;
                    break;
                case 'permissions':
                    aValue = a.total_permission_count;
                    bValue = b.total_permission_count;
                    break;
                case 'lastLogin':
                    aValue = a.last_login ? new Date(a.last_login).getTime() : 0;
                    bValue = b.last_login ? new Date(b.last_login).getTime() : 0;
                    break;
                default:
                    return 0;
            }
            if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
            else return aValue < bValue ? 1 : -1;
        });
        return filtered;
    }, [permissionManagers, searchQuery, filter, sortBy, sortOrder]);

    // Stats
    const total = permissionManagers.length;
    const active = permissionManagers.filter(a => a.is_active).length;
    const superAdmins = permissionManagers.filter(a => a.is_super_admin).length;
    const inactive = total - active;

    const handleAdminPress = (adminId: string) => {
        router.push(`/user/${adminId}/permissions` as any);
    };

    const toggleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const renderAdminItem = ({ item }: { item: any }) => (
        <AdminUserItem admin={item} onPress={handleAdminPress} />
    );

    const renderListHeader = () => (
        <View style={styles.listHeader}>
            {/* Quick Stats Summary */}
            <View style={styles.quickStats}>
                <View style={styles.quickStatsRow}>
                    <View style={styles.quickStatItem}>
                        <View style={[styles.quickStatIcon, { backgroundColor: adminColors.primaryLight }]}>
                            <Shield size={16} color={adminColors.primary} />
                        </View>
                        <Text style={styles.quickStatValue}>{total}</Text>
                        <Text style={styles.quickStatLabel}>Total</Text>
                    </View>
                    <View style={styles.quickStatItem}>
                        <View style={[styles.quickStatIcon, { backgroundColor: adminColors.successLight }]}>
                            <UserCheck size={16} color={adminColors.success} />
                        </View>
                        <Text style={styles.quickStatValue}>{active}</Text>
                        <Text style={styles.quickStatLabel}>Active</Text>
                    </View>
                    <View style={styles.quickStatItem}>
                        <View style={[styles.quickStatIcon, { backgroundColor: adminColors.warningLight }]}>
                            <Crown size={16} color={adminColors.warning} />
                        </View>
                        <Text style={styles.quickStatValue}>{superAdmins}</Text>
                        <Text style={styles.quickStatLabel}>Super Admin</Text>
                    </View>
                    <View style={styles.quickStatItem}>
                        <View style={[styles.quickStatIcon, { backgroundColor: adminColors.backgroundTertiary }]}>
                            <UserX size={16} color={adminColors.textSecondary} />
                        </View>
                        <Text style={styles.quickStatValue}>{inactive}</Text>
                        <Text style={styles.quickStatLabel}>Inactive</Text>
                    </View>
                </View>
            </View>

            {/* Search Section */}
            <View style={styles.searchSection}>
                <SearchBar
                    placeholder="Search admins by name or email..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchBar}
                />
            </View>

            {/* Controls Row */}
            <View style={styles.controlsRow}>
                <View style={styles.controlsLeft}>
                    <TouchableOpacity
                        style={[styles.controlButton, showFilters && styles.controlButtonActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={16} color={showFilters ? adminColors.primary : adminColors.textSecondary} />
                        <Text style={[styles.controlButtonText, showFilters && styles.controlButtonTextActive]}>
                            Filters
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.sortControl}>
                        <Text style={styles.sortLabel}>Sort:</Text>
                        <TouchableOpacity
                            style={[styles.sortButton, sortBy === "name" && styles.sortButtonActive]}
                            onPress={() => toggleSort("name")}
                        >
                            <Text style={[styles.sortButtonText, sortBy === "name" && styles.sortButtonTextActive]}>
                                Name
                            </Text>
                            {sortBy === "name" && (
                                sortOrder === "asc" ?
                                    <SortAsc size={12} color={adminColors.primary} /> :
                                    <SortDesc size={12} color={adminColors.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.sortButton, sortBy === "role" && styles.sortButtonActive]}
                            onPress={() => toggleSort("role")}
                        >
                            <Text style={[styles.sortButtonText, sortBy === "role" && styles.sortButtonTextActive]}>
                                Role
                            </Text>
                            {sortBy === "role" && (
                                sortOrder === "asc" ?
                                    <SortAsc size={12} color={adminColors.primary} /> :
                                    <SortDesc size={12} color={adminColors.primary} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.sortButton, sortBy === "permissions" && styles.sortButtonActive]}
                            onPress={() => toggleSort("permissions")}
                        >
                            <Text style={[styles.sortButtonText, sortBy === "permissions" && styles.sortButtonTextActive]}>
                                Permissions
                            </Text>
                            {sortBy === "permissions" && (
                                sortOrder === "asc" ?
                                    <SortAsc size={12} color={adminColors.primary} /> :
                                    <SortDesc size={12} color={adminColors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.controlsRight}>
                    <Text style={styles.resultsCount}>
                        {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''}
                    </Text>
                </View>
            </View>

            {/* Filter Options (Collapsible) */}
            {showFilters && (
                <View style={styles.filtersSection}>
                    <Text style={styles.filterSectionTitle}>Filter by Status</Text>
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
                            onPress={() => setFilter('all')}
                        >
                            <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
                                All Admins
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
                            onPress={() => setFilter('active')}
                        >
                            <Text style={[styles.filterChipText, filter === 'active' && styles.filterChipTextActive]}>
                                Active Only
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, filter === 'inactive' && styles.filterChipActive]}
                            onPress={() => setFilter('inactive')}
                        >
                            <Text style={[styles.filterChipText, filter === 'inactive' && styles.filterChipTextActive]}>
                                Inactive Only
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterChip, filter === 'super_admin' && styles.filterChipActive]}
                            onPress={() => setFilter('super_admin')}
                        >
                            <Text style={[styles.filterChipText, filter === 'super_admin' && styles.filterChipTextActive]}>
                                Super Admin
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Section Divider */}
            {filteredAdmins.length > 0 && (
                <View style={styles.sectionDivider}>
                    <Text style={styles.listTitle}>Admin Permission Managers</Text>
                </View>
            )}
        </View>
    );

    if (loading.users && admins.length === 0) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Admin Permissions",
                        headerLeft: () => (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                style={styles.backButton}
                            >
                                <ArrowLeft size={24} color={adminColors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading admin users...</Text>
                </View>
            </View>
        );
    }

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
                <Shield size={64} color={adminColors.textTertiary} />
            </View>
            <Text style={styles.emptyStateTitle}>No admins found</Text>
            <Text style={styles.emptyStateText}>
                {searchQuery || filter !== 'all'
                    ? "Try adjusting your search or filter criteria"
                    : "No admin users with permission management found."}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Admin Permissions",
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={adminColors.primary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <FlatList
                data={filteredAdmins}
                renderItem={renderAdminItem}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyState}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[adminColors.primary]}
                        tintColor={adminColors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: adminColors.backgroundSecondary,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: adminColors.textSecondary,
        fontWeight: "500",
    },
    listContainer: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    listHeader: {
        paddingTop: 20,
        paddingBottom: 16,
    },
    quickStats: {
        marginBottom: 20,
    },
    quickStatsRow: {
        flexDirection: "row",
        backgroundColor: adminColors.card,
        borderRadius: 16,
        padding: 20,
        shadowColor: adminColors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    quickStatItem: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    quickStatIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    quickStatValue: {
        fontSize: 20,
        fontWeight: "700",
        color: adminColors.text,
        lineHeight: 24,
    },
    quickStatLabel: {
        fontSize: 12,
        color: adminColors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    searchSection: {
        marginBottom: 20,
    },
    searchBar: {
        backgroundColor: adminColors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: adminColors.borderLight,
    },
    controlsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        gap: 16,
    },
    controlsLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        flex: 1,
    },
    controlsRight: {
        alignItems: "flex-end",
    },
    controlButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: adminColors.card,
        borderWidth: 1,
        borderColor: adminColors.borderLight,
    },
    controlButtonActive: {
        backgroundColor: adminColors.primaryLight,
        borderColor: adminColors.primary,
    },
    controlButtonText: {
        fontSize: 14,
        color: adminColors.textSecondary,
        fontWeight: "600",
    },
    controlButtonTextActive: {
        color: adminColors.primary,
    },
    sortControl: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sortLabel: {
        fontSize: 14,
        color: adminColors.textSecondary,
        fontWeight: "600",
    },
    sortButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: adminColors.card,
        borderWidth: 1,
        borderColor: adminColors.borderLight,
    },
    sortButtonActive: {
        backgroundColor: adminColors.primaryLight,
        borderColor: adminColors.primary,
    },
    sortButtonText: {
        fontSize: 13,
        color: adminColors.textSecondary,
        fontWeight: "600",
    },
    sortButtonTextActive: {
        color: adminColors.primary,
    },
    resultsCount: {
        fontSize: 14,
        color: adminColors.textTertiary,
        fontWeight: "500",
    },
    filtersSection: {
        backgroundColor: adminColors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: adminColors.borderLight,
    },
    filterSectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: adminColors.text,
        marginBottom: 12,
    },
    filterRow: {
        flexDirection: "row",
        gap: 8,
        flexWrap: "wrap",
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: adminColors.backgroundTertiary,
        borderWidth: 1,
        borderColor: adminColors.borderLight,
    },
    filterChipActive: {
        backgroundColor: adminColors.primary,
        borderColor: adminColors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: "600",
        color: adminColors.textSecondary,
    },
    filterChipTextActive: {
        color: adminColors.white,
    },
    sectionDivider: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: adminColors.borderLight,
        marginBottom: 8,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: adminColors.text,
    },
    itemSeparator: {
        height: 8,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 80,
        paddingHorizontal: 20,
        gap: 20,
    },
    emptyStateIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: adminColors.backgroundTertiary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: adminColors.text,
        textAlign: "center",
    },
    emptyStateText: {
        fontSize: 16,
        color: adminColors.textSecondary,
        textAlign: "center",
        maxWidth: 320,
        lineHeight: 24,
    },
}); 