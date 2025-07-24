import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Stack, router } from 'expo-router';
import {
    Users,
    Plus,
    Search,
    Filter,
    Crown,
    Shield,
    User,
    ArrowRight,
    Activity,
    Calendar,
} from 'lucide-react-native';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { colors } from '@/constants/adminColors';
import { AdminUser } from '@/types/permissions';
import SearchBar from '@/components/admin/SearchBar';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/admin/Dropdown';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import EmptyState from '@/components/admin/EmptyState';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminUserItem from '@/components/admin/AdminUserItem';

type FilterType = 'all' | 'active' | 'inactive' | 'super_admin' | 'admin';

export default function UsersScreen() {
    const {
        users: admins,
        stats,
        loading,
        error,
        fetchUsers,
    } = usePermissionStore();

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');

    // Fetch data on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchUsers();
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [fetchUsers]);

    // Handle admin selection - navigate to user permissions page
    const handleAdminPress = (adminId: string) => {
        router.push(`/user/${adminId}/permissions`);
    };

    // Handle create new admin
    const handleCreateAdmin = () => {
        // TODO: Navigate to create admin page when available
        console.log('Create admin pressed');
    };

    // Filter and search admins
    const filteredAdmins = useMemo(() => {
        let filtered = admins;

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(admin =>
                admin.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                admin.email.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply status filter
        switch (filter) {
            case 'active':
                filtered = filtered.filter(admin => admin.is_active);
                break;
            case 'inactive':
                filtered = filtered.filter(admin => !admin.is_active);
                break;
            case 'super_admin':
                filtered = filtered.filter(admin => admin.is_super_admin);
                break;
            case 'admin':
                filtered = filtered.filter(admin => !admin.is_super_admin);
                break;
            default:
                break;
        }

        return filtered;
    }, [admins, searchQuery, filter]);

    // Get stats for display
    const totalAdmins = stats?.total_users || admins.length;
    const activeAdmins = admins.filter(a => a.is_active).length;
    const superAdminCount = stats?.security_metrics?.super_admin_count || admins.filter(a => a.is_super_admin).length;

    if (loading.users && admins.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading admin users...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Admin Users',
                    headerRight: () => (
                        <TouchableOpacity onPress={handleCreateAdmin}>
                            <Plus size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView
                style={styles.contentContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <StatCard
                        title="Total Admins"
                        value={totalAdmins.toString()}
                        icon={<Users size={20} color={colors.primary} />}
                        color={colors.primary}
                        trend="+2 this month"
                    />
                    <StatCard
                        title="Active Admins"
                        value={activeAdmins.toString()}
                        icon={<User size={20} color={colors.success} />}
                        color={colors.success}
                        trend="+1 this month"
                    />
                    <StatCard
                        title="Super Admins"
                        value={superAdminCount.toString()}
                        icon={<Crown size={20} color={colors.danger} />}
                        color={colors.danger}
                        trend="+1 this month"
                    />
                </View>

                {/* Search and Filter */}
                <View style={styles.searchFilterContainer}>
                    <SearchBar
                        placeholder="Search admins..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchBar}
                    />
                    <Dropdown
                        label="Filter"
                        value={filter}
                        onValueChange={(value) => setFilter(value as FilterType)}
                        options={[
                            { label: 'All Users', value: 'all' },
                            { label: 'Active Users', value: 'active' },
                            { label: 'Inactive Users', value: 'inactive' },
                            { label: 'Super Admins', value: 'super_admin' },
                            { label: 'Regular Admins', value: 'admin' },
                        ]}
                    />
                </View>

                {/* Admin Users List */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLeft}>
                            <Users size={20} color={colors.text} />
                            <Text style={styles.sectionTitle}>Admin Users</Text>
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionBadgeText}>{filteredAdmins.length}</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={handleCreateAdmin}
                        >
                            <Plus size={16} color="white" />
                            <Text style={styles.createButtonText}>Add Admin</Text>
                        </TouchableOpacity>
                    </View>

                    {filteredAdmins.length === 0 ? (
                        <EmptyState
                            icon={<Users size={48} color={colors.textSecondary} />}
                            title={searchQuery ? "No matching admins" : "No Admin Users"}
                            message={
                                searchQuery
                                    ? "Try adjusting your search terms or filters."
                                    : "Create the first admin user to get started."
                            }
                            action={
                                <Button
                                    title="Create Admin"
                                    onPress={handleCreateAdmin}
                                    variant="primary"
                                />
                            }
                        />
                    ) : (
                        <View style={styles.adminList}>
                            {filteredAdmins.map((admin) => (
                                <AdminUserItem
                                    key={admin.id}
                                    admin={admin}
                                    onPress={handleAdminPress}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Error Display */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}
            </ScrollView>
        </View>
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
        marginTop: 16,
        fontSize: 16,
        color: colors.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 12,
    },
    searchFilterContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 12,
    },
    searchBar: {
        flex: 1,
    },
    filterDropdown: {
        width: 150,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    sectionBadge: {
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    sectionBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    createButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'white',
    },
    adminList: {
        gap: 12,
    },
    errorContainer: {
        backgroundColor: colors.dangerLight,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.danger + '20',
    },
    errorText: {
        fontSize: 14,
        color: colors.danger,
        textAlign: 'center',
    },
}); 