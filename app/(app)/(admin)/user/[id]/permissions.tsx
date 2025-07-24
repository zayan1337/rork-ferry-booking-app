import React, { useEffect, useState, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    FlatList,
    StyleSheet,
} from "react-native";
import { Stack, useLocalSearchParams, router } from "expo-router";
import {
    Users,
    Shield,
    Key,
    Plus,
    Edit,
    Trash2,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Calendar,
    Clock,
    AlertTriangle,
    Crown,
    User,
    Activity,
    Settings,
} from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { usePermissionStore } from "@/store/admin/permissionStore";
import {
    Permission,
    AdminUser,
    UserPermission,
    PermissionLevel,
    PermissionCategory,
} from "@/types/permissions";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import EmptyState from "@/components/admin/EmptyState";
import PermissionItem from "@/components/admin/PermissionItem";

export default function UserPermissionsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManagePermissions } = useAdminPermissions();

    const {
        users: admins,
        permissions,
        user_permissions,
        grantUserPermissions,
        revokeUserPermission,
        fetchUserPermissions,
        loading,
        error,
    } = usePermissionStore();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const currentUser = useMemo(() => admins.find(user => user.id === id), [admins, id]);
    const userPerms = useMemo(() => user_permissions.filter(up => up.user_id === id && up.is_active), [user_permissions, id]);
    const availablePerms = useMemo(() => permissions.filter(p => !userPerms.some(up => up.permission_id === p.id)), [permissions, userPerms]);

    // Filter permissions by category
    const filteredUserPerms = useMemo(() => {
        if (selectedCategory === 'all') return userPerms;
        return userPerms.filter(up => {
            const perm = permissions.find(p => p.id === up.permission_id);
            return perm?.category === selectedCategory;
        });
    }, [userPerms, selectedCategory, permissions]);

    const filteredAvailablePerms = useMemo(() => {
        if (selectedCategory === 'all') return availablePerms;
        return availablePerms.filter(p => p.category === selectedCategory);
    }, [availablePerms, selectedCategory]);

    useEffect(() => {
        if (id) fetchUserPermissions(id);
    }, [id]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await fetchUserPermissions(id!);
        } catch (error) {
            console.error('Error refreshing permissions:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleGrant = async (permissionId: string) => {
        try {
            await grantUserPermissions({ user_id: id!, permission_ids: [permissionId] });
            await fetchUserPermissions(id!);
        } catch (error) {
            Alert.alert('Error', 'Failed to grant permission');
        }
    };

    const handleRevoke = async (permissionId: string) => {
        Alert.alert(
            'Revoke Permission',
            'Are you sure you want to revoke this permission?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await revokeUserPermission(id!, permissionId);
                            await fetchUserPermissions(id!);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to revoke permission');
                        }
                    }
                }
            ]
        );
    };

    const getCategoryColor = (category: string) => {
        const categoryColors: Record<string, string> = {
            dashboard: '#6366F1',
            bookings: '#8B5CF6',
            operations: '#10B981',
            content: '#F59E0B',
            users: '#3B82F6',
            finance: '#EF4444',
            communications: '#06B6D4',
            reports: '#84CC16',
            settings: '#6B7280',
            system: '#1F2937',
        };
        return categoryColors[category] || colors.textSecondary;
    };

    const getCategoryIcon = (category: string) => {
        const categoryIcons: Record<string, any> = {
            dashboard: Shield,
            bookings: Calendar,
            operations: Activity,
            content: Edit,
            users: Users,
            finance: Key,
            communications: Activity,
            reports: Activity,
            settings: Settings,
            system: Shield,
        };
        return categoryIcons[category] || Shield;
    };

    const categories = useMemo(() => {
        const allCategories = ['all', ...new Set(permissions.map(p => p.category))];
        return allCategories;
    }, [permissions]);

    if (!currentUser) {
        return (
            <View style={styles.errorContainer}>
                <AlertTriangle size={48} color={colors.danger} />
                <Text style={styles.errorText}>User not found</Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    variant="primary"
                />
            </View>
        );
    }

    if (loading.user_permissions && userPerms.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading user permissions...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `${currentUser.full_name} - Permissions`,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.text} />
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
                {/* User Info Card */}
                <View style={styles.userInfoCard}>
                    <View style={styles.userInfoHeader}>
                        <View style={styles.userAvatar}>
                            {currentUser.is_super_admin ? (
                                <Crown size={24} color="white" />
                            ) : (
                                <User size={24} color="white" />
                            )}
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={styles.userNameLarge}>{currentUser.full_name}</Text>
                            <Text style={styles.userEmailLarge}>{currentUser.email}</Text>
                            <View style={styles.userBadges}>
                                <StatusBadge
                                    status={currentUser.is_active ? 'active' : 'inactive'}
                                    size="small"
                                />
                                <View style={[styles.roleBadge, { backgroundColor: currentUser.is_super_admin ? colors.danger + '15' : colors.primary + '15' }]}>
                                    {currentUser.is_super_admin ? (
                                        <Crown size={12} color={colors.danger} />
                                    ) : (
                                        <Shield size={12} color={colors.primary} />
                                    )}
                                    <Text style={[styles.roleText, { color: currentUser.is_super_admin ? colors.danger : colors.primary }]}>
                                        {currentUser.is_super_admin ? 'Super Admin' : 'Admin'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.userStats}>
                        <View style={styles.userStat}>
                            <Text style={styles.userStatValue}>{currentUser.total_permission_count}</Text>
                            <Text style={styles.userStatLabel}>Total Permissions</Text>
                        </View>
                        <View style={styles.userStat}>
                            <Text style={styles.userStatValue}>{currentUser.individual_permission_count}</Text>
                            <Text style={styles.userStatLabel}>Individual</Text>
                        </View>
                        <View style={styles.userStat}>
                            <Text style={styles.userStatValue}>{currentUser.role_permission_count}</Text>
                            <Text style={styles.userStatLabel}>Role-based</Text>
                        </View>
                    </View>
                </View>

                {/* Category Filter */}
                <View style={styles.categoryFilter}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {categories.map((category) => {
                            const Icon = getCategoryIcon(category);
                            const isActive = selectedCategory === category;
                            return (
                                <TouchableOpacity
                                    key={category}
                                    style={[
                                        styles.categoryFilterButton,
                                        isActive && styles.categoryFilterButtonActive
                                    ]}
                                    onPress={() => setSelectedCategory(category)}
                                >
                                    <Icon size={14} color={isActive ? 'white' : getCategoryColor(category)} />
                                    <Text style={[
                                        styles.categoryFilterText,
                                        isActive && styles.categoryFilterTextActive
                                    ]}>
                                        {category.charAt(0).toUpperCase() + category.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Current Permissions */}
                <View style={styles.section}>
                    <SectionHeader
                        title="Current Permissions"
                        subtitle={`${filteredUserPerms.length} permissions granted`}
                    />

                    {filteredUserPerms.length === 0 ? (
                        <EmptyState
                            icon={<Shield size={48} color={colors.textSecondary} />}
                            title="No Permissions"
                            message={`No ${selectedCategory === 'all' ? '' : selectedCategory + ' '}permissions granted to this user.`}
                        />
                    ) : (
                        <View style={styles.permissionList}>
                            {filteredUserPerms.map((userPerm) => {
                                const permission = permissions.find(p => p.id === userPerm.permission_id);
                                if (!permission) return null;

                                return (
                                    <PermissionItem
                                        key={permission.id}
                                        permission={permission}
                                        userPermission={userPerm}
                                        onRevoke={handleRevoke}
                                        showActions={true}
                                    />
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Available Permissions */}
                <View style={styles.section}>
                    <SectionHeader
                        title="Available Permissions"
                        subtitle={`${filteredAvailablePerms.length} permissions available`}
                    />

                    {filteredAvailablePerms.length === 0 ? (
                        <EmptyState
                            icon={<CheckCircle size={48} color={colors.success} />}
                            title="All Permissions Granted"
                            message={`All ${selectedCategory === 'all' ? '' : selectedCategory + ' '}permissions have been granted to this user.`}
                        />
                    ) : (
                        <View style={styles.permissionList}>
                            {filteredAvailablePerms.map((permission) => (
                                <PermissionItem
                                    key={permission.id}
                                    permission={permission}
                                    onGrant={handleGrant}
                                    showActions={true}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* Error Display */}
                {error && (
                    <View style={styles.errorBanner}>
                        <AlertTriangle size={16} color={colors.danger} />
                        <Text style={styles.errorBannerText}>{error}</Text>
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
        textAlign: 'center',
        marginVertical: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.danger + "10",
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    errorBannerText: {
        flex: 1,
        fontSize: 14,
        color: colors.danger,
        fontWeight: '500',
    },
    userInfoCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    userAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    userDetails: {
        flex: 1,
    },
    userNameLarge: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    userEmailLarge: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    userBadges: {
        flexDirection: 'row',
        gap: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    userStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
    },
    userStat: {
        alignItems: 'center',
    },
    userStatValue: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.primary,
        marginBottom: 4,
    },
    userStatLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    categoryFilter: {
        marginBottom: 24,
    },
    categoryFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
        gap: 6,
    },
    categoryFilterButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryFilterText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    categoryFilterTextActive: {
        color: 'white',
    },
    section: {
        marginBottom: 32,
    },
    permissionList: {
        gap: 12,
    },
}); 