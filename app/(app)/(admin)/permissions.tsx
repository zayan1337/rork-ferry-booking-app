import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Switch,
    Modal,
    ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Search, UserCog, Shield, ArrowLeft, Save, X } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { usePermissions, usePermissionManagement } from '@/hooks/usePermissions';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import SearchBar from '@/components/admin/SearchBar';
import Button from '@/components/admin/Button';
import EmptyState from '@/components/admin/EmptyState';
import PermissionGroupCard from '@/components/admin/PermissionGroupCard';
import type { UserWithPermissions, Permission } from '@/types/permissions';
import type { AdminUser } from '@/types/admin';
import { supabase } from '@/utils/supabase';

export default function PermissionsScreen() {
    const { canManagePermissions, isSuperAdmin } = useRoleAccess();
    const {
        permissionGroups,
        loading: permissionsLoading,
        refreshPermissions
    } = usePermissions();
    const {
        loading: managementLoading,
        error: managementError,
        grantPermissions,
        revokePermissions,
        toggleSuperAdmin,
        getUserWithPermissions,
    } = usePermissionManagement();

    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<{
        grant: string[];
        revoke: string[];
    }>({ grant: [], revoke: [] });

    // Check access
    const [accessChecked, setAccessChecked] = useState(false);

    useEffect(() => {
        // Only check access once when permissions are loaded
        if (!accessChecked && typeof canManagePermissions === 'boolean' && typeof isSuperAdmin === 'boolean') {
            setAccessChecked(true);

            if (!canManagePermissions || !isSuperAdmin) {
                Alert.alert(
                    'Access Denied',
                    'You do not have permission to manage user permissions.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        }
    }, [canManagePermissions, isSuperAdmin, accessChecked]);

    // Load initial data
    useEffect(() => {
        if (canManagePermissions && isSuperAdmin) {
            loadAdminUsers();
        }
    }, [canManagePermissions, isSuperAdmin]);

    // Load admin users
    const loadAdminUsers = useCallback(async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('admin_users_view')
                .select('*')
                .in('role', ['admin', 'agent'])
                .eq('is_active', true)
                .order('full_name');

            if (error) throw error;

            setAdminUsers(data || []);
        } catch (err) {
            console.error('Error loading admin users:', err);
            Alert.alert('Error', 'Failed to load admin users');
        } finally {
            setLoading(false);
        }
    }, []);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                loadAdminUsers(),
                refreshPermissions()
            ]);
        } catch (err) {
            console.error('Error refreshing data:', err);
        } finally {
            setRefreshing(false);
        }
    }, [loadAdminUsers, refreshPermissions]);

    // Open permission management modal
    const handleManagePermissions = useCallback(async (user: AdminUser) => {
        try {
            const userWithPermissions = await getUserWithPermissions(user.id);
            if (userWithPermissions) {
                setSelectedUser(userWithPermissions);
                setPendingChanges({ grant: [], revoke: [] });
                setShowPermissionModal(true);
            }
        } catch (err) {
            console.error('Error loading user permissions:', err);
            Alert.alert('Error', 'Failed to load user permissions');
        }
    }, [getUserWithPermissions]);

    // Handle permission toggle
    const handlePermissionToggle = useCallback((permission: Permission) => {
        if (!selectedUser) return;

        const isCurrentlyGranted = selectedUser.all_permissions.some(p => p.id === permission.id);
        const isInPendingGrant = pendingChanges.grant.includes(permission.id);
        const isInPendingRevoke = pendingChanges.revoke.includes(permission.id);

        setPendingChanges(prev => {
            if (isCurrentlyGranted) {
                // Currently granted - toggle revoke
                if (isInPendingRevoke) {
                    // Remove from revoke list
                    return {
                        ...prev,
                        revoke: prev.revoke.filter(id => id !== permission.id)
                    };
                } else {
                    // Add to revoke list
                    return {
                        ...prev,
                        revoke: [...prev.revoke, permission.id],
                        grant: prev.grant.filter(id => id !== permission.id) // Remove from grant if present
                    };
                }
            } else {
                // Currently not granted - toggle grant
                if (isInPendingGrant) {
                    // Remove from grant list
                    return {
                        ...prev,
                        grant: prev.grant.filter(id => id !== permission.id)
                    };
                } else {
                    // Add to grant list
                    return {
                        ...prev,
                        grant: [...prev.grant, permission.id],
                        revoke: prev.revoke.filter(id => id !== permission.id) // Remove from revoke if present
                    };
                }
            }
        });
    }, [selectedUser, pendingChanges]);

    // Save permission changes
    const handleSavePermissions = useCallback(async () => {
        if (!selectedUser || (!pendingChanges.grant.length && !pendingChanges.revoke.length)) {
            setShowPermissionModal(false);
            return;
        }

        try {
            if (pendingChanges.grant.length > 0) {
                await grantPermissions(selectedUser.id, pendingChanges.grant);
            }

            if (pendingChanges.revoke.length > 0) {
                await revokePermissions(selectedUser.id, pendingChanges.revoke);
            }

            Alert.alert('Success', 'Permissions updated successfully');
            setShowPermissionModal(false);
            setPendingChanges({ grant: [], revoke: [] });
            setSelectedUser(null);
            await loadAdminUsers();
        } catch (err) {
            console.error('Error saving permissions:', err);
            Alert.alert('Error', 'Failed to update permissions');
        }
    }, [selectedUser, pendingChanges, grantPermissions, revokePermissions, loadAdminUsers]);

    // Toggle super admin status
    const handleToggleSuperAdmin = useCallback(async (user: AdminUser) => {
        Alert.alert(
            'Confirm Super Admin Change',
            `Are you sure you want to ${user.is_super_admin ? 'remove' : 'grant'} super admin privileges ${user.is_super_admin ? 'from' : 'to'} ${user.full_name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await toggleSuperAdmin(user.id, !user.is_super_admin);
                            Alert.alert('Success', 'Super admin status updated successfully');
                            await loadAdminUsers();
                        } catch (err) {
                            console.error('Error updating super admin status:', err);
                            Alert.alert('Error', 'Failed to update super admin status');
                        }
                    }
                }
            ]
        );
    }, [toggleSuperAdmin, loadAdminUsers]);

    // Filter users based on search
    const filteredUsers = adminUsers.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get effective permissions for display
    const getEffectivePermissions = useCallback(() => {
        if (!selectedUser) return [];

        return permissionGroups.map(group => ({
            ...group,
            permissions: group.permissions.map(permission => {
                const isCurrentlyGranted = selectedUser.all_permissions.some(p => p.id === permission.id);
                const isInPendingGrant = pendingChanges.grant.includes(permission.id);
                const isInPendingRevoke = pendingChanges.revoke.includes(permission.id);

                let effectiveGrant = isCurrentlyGranted;
                if (isInPendingGrant) effectiveGrant = true;
                if (isInPendingRevoke) effectiveGrant = false;

                return {
                    ...permission,
                    isGranted: effectiveGrant
                };
            })
        }));
    }, [selectedUser, permissionGroups, pendingChanges]);

    // Render user item
    const renderUserItem = ({ item: user }: { item: AdminUser }) => (
        <TouchableOpacity style={styles.userCard} activeOpacity={0.7}>
            <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                    <View style={[
                        styles.userAvatar,
                        user.is_super_admin && styles.superAdminAvatar
                    ]}>
                        <Text style={styles.userInitials}>
                            {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </Text>
                        {user.is_super_admin && (
                            <View style={styles.superAdminBadge}>
                                <Shield size={12} color="white" />
                            </View>
                        )}
                    </View>

                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>{user.full_name}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                        <View style={styles.userMeta}>
                            <View style={[styles.roleBadge,
                            user.is_super_admin && styles.superAdminRoleBadge,
                            user.role === 'agent' && styles.agentRoleBadge
                            ]}>
                                <Text style={[styles.roleText,
                                user.is_super_admin && styles.superAdminRoleText
                                ]}>
                                    {user.is_super_admin ? 'SUPER ADMIN' : user.role.toUpperCase()}
                                </Text>
                            </View>
                            {user.is_recently_active && (
                                <View style={styles.activeIndicator}>
                                    <Text style={styles.activeText}>Active</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.userActions}>
                    <TouchableOpacity
                        style={styles.superAdminToggle}
                        onPress={() => handleToggleSuperAdmin(user)}
                    >
                        <Shield
                            size={20}
                            color={user.is_super_admin ? colors.warning : colors.textSecondary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.manageButton}
                        onPress={() => handleManagePermissions(user)}
                    >
                        <UserCog size={20} color={colors.primary} />
                        <Text style={styles.manageButtonText}>Manage</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    // Load data on mount
    useEffect(() => {
        loadAdminUsers();
    }, [loadAdminUsers]);

    if (!canManagePermissions || !isSuperAdmin) {
        return null; // Access check handles redirect
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Permission Management',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <View style={styles.header}>
                <Text style={styles.title}>Admin Permissions</Text>
                <Text style={styles.subtitle}>
                    Manage permissions for admin and agent users
                </Text>
            </View>

            <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search admins..."
                style={styles.searchBar}
            />

            <FlatList
                data={filteredUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon={<UserCog size={48} color={colors.textSecondary} />}
                        title="No Admin Users"
                        subtitle={loading ? "Loading admin users..." : "No admin users found"}
                    />
                }
            />

            {/* Permission Management Modal */}
            <Modal
                visible={showPermissionModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowPermissionModal(false)}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            Manage Permissions - {selectedUser?.full_name}
                        </Text>
                        <TouchableOpacity onPress={handleSavePermissions}>
                            <Save size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {selectedUser && (
                        <ScrollView
                            style={styles.modalContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {pendingChanges.grant.length > 0 || pendingChanges.revoke.length > 0 ? (
                                <View style={styles.changesIndicator}>
                                    <Text style={styles.changesText}>
                                        {pendingChanges.grant.length} permissions to grant, {pendingChanges.revoke.length} to revoke
                                    </Text>
                                </View>
                            ) : null}

                            {getEffectivePermissions().map((group) => (
                                <PermissionGroupCard
                                    key={group.resource}
                                    group={group}
                                    grantedPermissions={group.permissions.filter(p => p.isGranted)}
                                    onPermissionToggle={handlePermissionToggle}
                                    isLoading={managementLoading}
                                />
                            ))}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    searchBar: {
        marginHorizontal: 20,
        marginBottom: 20,
    },
    list: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    userCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        position: 'relative',
    },
    superAdminAvatar: {
        backgroundColor: colors.warning,
    },
    userInitials: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    superAdminBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    userMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
    },
    superAdminRoleBadge: {
        backgroundColor: colors.warningLight,
    },
    agentRoleBadge: {
        backgroundColor: colors.infoLight,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    superAdminRoleText: {
        color: colors.warning,
    },
    activeIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    activeText: {
        fontSize: 0, // Hidden text for accessibility
    },
    userActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    superAdminToggle: {
        padding: 8,
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 6,
    },
    manageButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: 'white',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 20,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    changesIndicator: {
        backgroundColor: colors.warningLight,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    changesText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.warning,
        textAlign: 'center',
    },
}); 