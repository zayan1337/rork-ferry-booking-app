import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
    Alert,
    Modal,
    Switch,
    ActivityIndicator,
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { usePermissionStore } from "@/store/admin/permissionStore";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/utils/supabase";
import {
    Shield,
    Users,
    Settings,
    Search,
    Filter,
    Save,
    X,
    CheckCircle,
    Circle,
    Eye,
    Edit,
    Trash2,
    Key,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Copy,
    RotateCcw,
    Plus,
    Minus,
    ArrowLeft,
    Crown,
    User,
    Clock,
    Calendar,
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import EmptyState from "@/components/admin/EmptyState";
import { AdminManagement } from "@/types";

const { width: screenWidth } = Dimensions.get('window');

// Types
type Permission = AdminManagement.Permission;
type PermissionCategory = AdminManagement.PermissionCategory;
type RoleTemplate = AdminManagement.RoleTemplate;
type AdminUser = AdminManagement.AdminUser;

interface PermissionGroup {
    category: PermissionCategory;
    permissions: Permission[];
}

export default function UserPermissionsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { canManagePermissions } = useAdminPermissions();
    const { user } = useAuthStore();

    // Permission store
    const {
        data: permissions,
        categories,
        roleTemplates,
        adminUsers,
        userPermissions,
        loading,
        error,
        fetchAll,
        fetchUserPermissions,
        grantPermission,
        revokePermission,
        updateUserPermissions,
        applyRoleTemplate,
        clearError,
        setError,
    } = usePermissionStore();

    // Local state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [showRoleTemplates, setShowRoleTemplates] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [filterLevel, setFilterLevel] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [localLoading, setLocalLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [togglingPermissions, setTogglingPermissions] = useState<Set<string>>(new Set());

    const isTablet = screenWidth >= 768;

    // Get current user data
    const currentUser = useMemo(() => {
        return adminUsers.find(user => user.id === id);
    }, [adminUsers, id]);

    // Get user's current permissions from userPermissions state (more reliable than adminUsers)
    const currentUserPermissions = useMemo(() => {
        if (currentUser?.is_super_admin) {
            // Super admins have all permissions
            return permissions.map(p => p.id);
        }

        // Try to get from userPermissions first (most up-to-date)
        if (userPermissions.length > 0) {
            return userPermissions.map(up => up.permission_id).filter(Boolean);
        }

        // Fallback to adminUsers data (handle null case)
        if (currentUser?.direct_permissions && Array.isArray(currentUser.direct_permissions)) {
            return currentUser.direct_permissions;
        }

        // Default to empty array
        return [];
    }, [currentUser, userPermissions, permissions]);

    // Initialize selected permissions when user data loads
    useEffect(() => {
        if (currentUserPermissions.length >= 0) { // Allow for empty arrays
            setSelectedPermissions(new Set(currentUserPermissions));
            if (categories.length > 0) {
                setExpandedCategories(new Set(categories.map(c => c.id)));
            }
        }
    }, [currentUserPermissions, categories]);

    // Load data on component mount
    useEffect(() => {
        if (id) {
            loadUserData();
        }
    }, [id]);

    const loadUserData = async () => {
        try {
            setLocalLoading(true);
            // First fetch all general data
            await fetchAll();
            // Then fetch user-specific permissions if we have an ID
            if (id) {
                await fetchUserPermissions(id);
            }
        } catch (error) {
            setError?.('Failed to load user data');
        } finally {
            setLocalLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadUserData();
        } finally {
            setRefreshing(false);
        }
    }, []);

    // Enhanced permission categories with filtering
    const filteredPermissionGroups = useMemo(() => {
        let filteredCategories = categories;
        let filteredPermissions = permissions;

        // Apply search filter
        if (searchQuery) {
            filteredPermissions = permissions.filter(perm =>
                perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                perm.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply category filter
        if (selectedCategory) {
            filteredCategories = categories.filter(cat => cat.id === selectedCategory);
        }

        // Apply level filter
        if (filterLevel) {
            filteredPermissions = filteredPermissions.filter(perm => perm.level === filterLevel);
        }

        // Group permissions by category
        return filteredCategories.map(category => ({
            category,
            permissions: filteredPermissions.filter(p => p.category_id === category.id)
        })).filter(group => group.permissions.length > 0);
    }, [categories, permissions, searchQuery, selectedCategory, filterLevel]);

    // Permission statistics
    const permissionStats = useMemo(() => {
        const totalPermissions = permissions.length;
        const userPermCount = currentUserPermissions.length;
        const criticalCount = permissions.filter(p => p.is_critical && currentUserPermissions.includes(p.id)).length;

        return {
            total: totalPermissions,
            selected: userPermCount,
            critical: criticalCount,
            percentage: totalPermissions > 0 ? Math.round((userPermCount / totalPermissions) * 100) : 0
        };
    }, [permissions, currentUserPermissions]);

    const handlePermissionToggle = useCallback(async (permissionId: string) => {
        if (!id || !user?.profile?.id) {
            Alert.alert("Error", "Missing user or admin ID.");
            return;
        }

        // For super admins, just show a message since they already have all permissions
        if (currentUser?.is_super_admin) {
            Alert.alert("Super Admin", "Super administrators have all permissions by default.");
            return;
        }

        // Add to toggling set for loading state
        setTogglingPermissions(prev => new Set(prev).add(permissionId));

        const permission = permissions.find(p => p.id === permissionId);
        const isCurrentlySelected = currentUserPermissions.includes(permissionId);

        try {
            if (isCurrentlySelected) {
                // Check for dependents before removing
                const dependents = permissions.filter(p => p.dependencies?.includes(permissionId));
                const conflictingDependents = dependents.filter(dep => currentUserPermissions.includes(dep.id));

                if (conflictingDependents.length > 0) {
                    Alert.alert(
                        "Cannot Remove Permission",
                        `This permission is required by: ${conflictingDependents.map(p => p.name).join(', ')}`,
                        [{ text: "OK" }]
                    );
                    return;
                }

                await revokePermission(id, permissionId);
            } else {
                // Add dependencies first
                if (permission?.dependencies) {
                    for (const dep of permission.dependencies) {
                        if (permissions.find(p => p.id === dep) && !currentUserPermissions.includes(dep)) {
                            await grantPermission(id, dep, user.profile.id);
                        }
                    }
                }

                await grantPermission(id, permissionId, user.profile.id);
            }

            // Refresh data immediately after operation
            if (id) {
                await fetchUserPermissions(id);
                await fetchAll(); // Also refresh admin users to see updated counts
            }

        } catch (error) {
            Alert.alert("Error", `Failed to ${isCurrentlySelected ? 'revoke' : 'grant'} permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            // Remove from toggling set
            setTogglingPermissions(prev => {
                const newSet = new Set(prev);
                newSet.delete(permissionId);
                return newSet;
            });
        }
    }, [currentUserPermissions, permissions, id, user?.profile?.id, currentUser?.is_super_admin, grantPermission, revokePermission, fetchUserPermissions, fetchAll]);

    const handleApplyRoleTemplate = useCallback(async (template: RoleTemplate) => {
        try {
            setLocalLoading(true);
            if (!id) throw new Error('User ID not found');
            if (!user?.profile?.id) throw new Error('Current admin ID not found');

            await applyRoleTemplate(id, template.id, user.profile.id);
            setSelectedPermissions(new Set(template.permission_ids || []));
            setHasUnsavedChanges(false);
            setShowRoleTemplates(false);

            Alert.alert("Success", `${template.name} permissions have been applied.`);
            await loadUserData(); // Refresh data
        } catch (error) {
            Alert.alert("Error", "Failed to apply role template.");
        } finally {
            setLocalLoading(false);
        }
    }, [id, applyRoleTemplate, user?.profile?.id]);

    const handleSave = useCallback(async () => {
        if (!canManagePermissions()) {
            Alert.alert("Access Denied", "You don't have permission to manage user permissions.");
            return;
        }

        if (!id) {
            Alert.alert("Error", "User ID not found.");
            return;
        }

        if (!user?.profile?.id) {
            Alert.alert("Error", "Current admin ID not found.");
            return;
        }

        try {
            setLocalLoading(true);
            await updateUserPermissions(id, Array.from(selectedPermissions), user.profile.id);
            setHasUnsavedChanges(false);
            Alert.alert("Success", "User permissions updated successfully.");
            await loadUserData(); // Refresh data
        } catch (error) {
            Alert.alert("Error", "Failed to update user permissions.");
        } finally {
            setLocalLoading(false);
        }
    }, [canManagePermissions, id, selectedPermissions, updateUserPermissions, user?.profile?.id]);

    const handleReset = useCallback(() => {
        Alert.alert(
            "Reset Permissions",
            "Are you sure you want to reset all changes? This will revert to the last saved state.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        setSelectedPermissions(new Set(currentUserPermissions));
                        setHasUnsavedChanges(false);
                    }
                }
            ]
        );
    }, [currentUserPermissions]);

    const handleBulkAction = useCallback(async (action: 'select_all' | 'deselect_all' | 'select_category') => {
        if (!id || !user?.profile?.id) {
            Alert.alert("Error", "Missing user or admin ID.");
            return;
        }

        if (currentUser?.is_super_admin) {
            Alert.alert("Super Admin", "Super administrators have all permissions by default.");
            setShowBulkActions(false);
            return;
        }

        let targetPermissions: string[] = [];

        switch (action) {
            case 'select_all':
                targetPermissions = permissions.map(perm => perm.id);
                break;
            case 'deselect_all':
                targetPermissions = [];
                break;
            case 'select_category':
                if (selectedCategory) {
                    targetPermissions = [...selectedPermissions];
                    const categoryPermissions = permissions.filter(p => p.category_id === selectedCategory);
                    categoryPermissions.forEach(perm => {
                        if (!targetPermissions.includes(perm.id)) {
                            targetPermissions.push(perm.id);
                        }
                    });
                }
                break;
        }

        try {
            setLocalLoading(true);
            await updateUserPermissions(id, targetPermissions, user.profile.id);
            setSelectedPermissions(new Set(targetPermissions));
            setHasUnsavedChanges(false);
            setShowBulkActions(false);
            await loadUserData(); // Refresh data
            Alert.alert("Success", "Bulk permissions updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update permissions.");
        } finally {
            setLocalLoading(false);
        }
    }, [selectedPermissions, permissions, selectedCategory, id, user?.profile?.id, currentUser?.is_super_admin, updateUserPermissions, loadUserData]);

    const getPermissionLevelColor = (level: string) => {
        switch (level) {
            case "read": return colors.success;
            case "write": return colors.primary;
            case "delete": return colors.warning;
            case "admin": return colors.danger;
            default: return colors.textSecondary;
        }
    };

    const getPermissionLevelIcon = (level: string) => {
        switch (level) {
            case "read": return <Eye size={12} color={getPermissionLevelColor(level)} />;
            case "write": return <Edit size={12} color={getPermissionLevelColor(level)} />;
            case "delete": return <Trash2 size={12} color={getPermissionLevelColor(level)} />;
            case "admin": return <Shield size={12} color={getPermissionLevelColor(level)} />;
            default: return <Eye size={12} color={getPermissionLevelColor(level)} />;
        }
    };

    const toggleCategoryExpansion = useCallback((categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    }, [expandedCategories]);

    // Loading states
    if (localLoading && !currentUser) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <LoadingSpinner />
                <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading user data...</Text>
            </View>
        );
    }

    // Error state
    if (error && !currentUser) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <AlertTriangle size={48} color={colors.danger} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' }}>
                    Error Loading User Data
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                    {error}
                </Text>
                <Button
                    title="Retry"
                    onPress={() => { clearError(); loadUserData(); }}
                    style={{ marginTop: 16 }}
                />
            </View>
        );
    }

    // User not found
    if (!currentUser) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <User size={48} color={colors.textSecondary} />
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 16, textAlign: 'center' }}>
                    User Not Found
                </Text>
                <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                    The requested user could not be found.
                </Text>
                <Button
                    title="Go Back"
                    onPress={() => router.back()}
                    style={{ marginTop: 16 }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `Permissions - ${currentUser.full_name}`,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => {
                                if (hasUnsavedChanges) {
                                    Alert.alert(
                                        "Unsaved Changes",
                                        "You have unsaved changes. Are you sure you want to go back?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            { text: "Discard Changes", style: "destructive", onPress: () => router.back() }
                                        ]
                                    );
                                } else {
                                    router.back();
                                }
                            }}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerActions}>
                            {hasUnsavedChanges ? (
                                <>
                                    <TouchableOpacity onPress={handleReset} style={styles.headerResetButton}>
                                        <RotateCcw size={12} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleSave}
                                        style={styles.headerSaveButton}
                                        disabled={localLoading}
                                    >
                                        {localLoading ? (
                                            <ActivityIndicator size={12} color="white" />
                                        ) : (
                                            <Save size={12} color="white" />
                                        )}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <TouchableOpacity style={styles.headerSavedButton} disabled>
                                    <Save size={12} color={colors.success} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                }}
            />

            <ScrollView
                style={styles.mainScrollView}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Enhanced User Info Header */}
                <View style={styles.modernUserInfoCard}>
                    <View style={styles.userInfoHeader}>
                        <View style={styles.userAvatarContainer}>
                            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                                <Text style={styles.userAvatarText}>
                                    {currentUser.full_name.split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase() || 'U'}
                                </Text>
                            </View>
                            {currentUser.is_super_admin && (
                                <View style={styles.superAdminIndicator}>
                                    <Crown size={12} color={colors.warning} />
                                </View>
                            )}
                        </View>
                        <View style={styles.userInfoContent}>
                            <Text style={styles.userInfoName}>{currentUser.full_name}</Text>
                            <Text style={styles.userInfoEmail}>{currentUser.email}</Text>
                            <View style={styles.userInfoMeta}>
                                <View style={styles.roleTag}>
                                    <Shield size={12} color={colors.primary} />
                                    <Text style={styles.roleTagText}>{currentUser.role}</Text>
                                </View>
                                <StatusBadge status={currentUser.is_active ? 'active' : 'inactive'} size="small" />
                            </View>
                        </View>
                    </View>

                    {currentUser.is_super_admin && (
                        <View style={styles.superAdminBanner}>
                            <Crown size={16} color={colors.warning} />
                            <Text style={styles.superAdminBannerText}>
                                Super Administrator • Full System Access
                            </Text>
                        </View>
                    )}
                </View>

                {/* Permission Statistics */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{permissionStats.selected}</Text>
                        <Text style={styles.statLabel}>Permissions</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{permissionStats.percentage}%</Text>
                        <Text style={styles.statLabel}>Coverage</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={[styles.statValue, { color: colors.danger }]}>{permissionStats.critical}</Text>
                        <Text style={styles.statLabel}>Critical</Text>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    <View style={styles.actionBarLeft}>
                        <TouchableOpacity
                            style={styles.outlineButton}
                            onPress={() => setShowRoleTemplates(true)}
                        >
                            <Copy size={16} color={colors.primary} />
                            <Text style={styles.outlineButtonText}>Templates</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.outlineButton}
                            onPress={() => setShowBulkActions(true)}
                        >
                            <Plus size={16} color={colors.primary} />
                            <Text style={styles.outlineButtonText}>Bulk Actions</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionBarRight}>
                        <TouchableOpacity
                            style={[styles.outlineButton, filterLevel && styles.outlineButtonActive]}
                            onPress={() => {
                                const levels = ['read', 'write', 'delete', 'admin'];
                                const currentIndex = levels.indexOf(filterLevel || '');
                                const nextLevel = currentIndex === levels.length - 1 ? null : levels[currentIndex + 1];
                                setFilterLevel(nextLevel);
                            }}
                        >
                            <Filter size={16} color={filterLevel ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.outlineButtonText, filterLevel && styles.outlineButtonTextActive]}>
                                {filterLevel ? filterLevel.toUpperCase() : 'All Levels'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search permissions..."
                    />
                </View>

                {/* Category Tabs */}
                <View style={styles.categoryTabContainer}>
                    <ScrollView horizontal style={styles.categorySelector} showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
                            onPress={() => setSelectedCategory(null)}
                        >
                            <Settings size={16} color={!selectedCategory ? colors.primary : colors.textSecondary} />
                            <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
                                All
                            </Text>
                        </TouchableOpacity>
                        {categories.map(category => (
                            <TouchableOpacity
                                key={category.id}
                                style={[styles.categoryTab, selectedCategory === category.id && styles.categoryTabActive]}
                                onPress={() => setSelectedCategory(category.id === selectedCategory ? null : category.id)}
                            >
                                <Settings size={16} color={selectedCategory === category.id ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.categoryTabText, selectedCategory === category.id && styles.categoryTabTextActive]}>
                                    {category.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Permissions List */}
                {filteredPermissionGroups.length === 0 ? (
                    <EmptyState
                        icon={<Key size={48} color={colors.textSecondary} />}
                        title="No Permissions Found"
                        message="Try adjusting your search or filters."
                    />
                ) : (
                    <View style={styles.permissionsContainer}>
                        {filteredPermissionGroups.map(({ category, permissions: categoryPermissions }) => (
                            <View key={category.id} style={styles.categorySection}>
                                <TouchableOpacity
                                    style={styles.categoryHeader}
                                    onPress={() => toggleCategoryExpansion(category.id)}
                                >
                                    <View style={styles.categoryHeaderLeft}>
                                        <View style={styles.categoryIcon}>
                                            <Settings size={20} color={colors.primary} />
                                        </View>
                                        <View style={styles.categoryHeaderInfo}>
                                            <Text style={styles.categoryName}>{category.name}</Text>
                                            <Text style={styles.categoryDescription}>{category.description}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.categoryHeaderRight}>
                                        <Text style={styles.categoryCount}>
                                            {categoryPermissions.filter(p => currentUserPermissions.includes(p.id)).length}/{categoryPermissions.length}
                                        </Text>
                                        {expandedCategories.has(category.id) ?
                                            <ChevronDown size={20} color={colors.textSecondary} /> :
                                            <ChevronRight size={20} color={colors.textSecondary} />
                                        }
                                    </View>
                                </TouchableOpacity>

                                {expandedCategories.has(category.id) && (
                                    <View style={styles.permissionsList}>
                                        {categoryPermissions.map(permission => (
                                            <View key={permission.id} style={styles.permissionRow}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.permissionItem,
                                                        currentUserPermissions.includes(permission.id) && styles.permissionItemSelected
                                                    ]}
                                                    onPress={() => handlePermissionToggle(permission.id)}
                                                    disabled={currentUser.is_super_admin || togglingPermissions.has(permission.id)} // Super admins have all permissions or currently toggling
                                                >
                                                    <View style={styles.permissionLeft}>
                                                        <View style={styles.permissionCheckbox}>
                                                            {togglingPermissions.has(permission.id) ? (
                                                                <ActivityIndicator size={20} color={colors.primary} />
                                                            ) : currentUserPermissions.includes(permission.id) || currentUser.is_super_admin ? (
                                                                <CheckCircle size={20} color={colors.primary} />
                                                            ) : (
                                                                <Circle size={20} color={colors.border} />
                                                            )}
                                                        </View>

                                                        <View style={styles.permissionContent}>
                                                            <View style={styles.permissionHeader}>
                                                                <Text style={styles.permissionName}>{permission.name}</Text>
                                                                <View style={styles.permissionMeta}>
                                                                    {permission.is_critical && (
                                                                        <View style={styles.criticalBadge}>
                                                                            <AlertTriangle size={10} color={colors.danger} />
                                                                        </View>
                                                                    )}
                                                                    <View style={[styles.levelBadge, { backgroundColor: getPermissionLevelColor(permission.level) + "20" }]}>
                                                                        {getPermissionLevelIcon(permission.level)}
                                                                        <Text style={[styles.levelText, { color: getPermissionLevelColor(permission.level) }]}>
                                                                            {permission.level.toUpperCase()}
                                                                        </Text>
                                                                    </View>
                                                                </View>
                                                            </View>

                                                            <Text style={styles.permissionDescription}>
                                                                {permission.description}
                                                            </Text>

                                                            {permission.dependencies && permission.dependencies.length > 0 && (
                                                                <View style={styles.dependencyInfo}>
                                                                    <Key size={10} color={colors.warning} />
                                                                    <Text style={styles.dependencyLabel}>
                                                                        Requires: {permission.dependencies.map(depId => {
                                                                            const dep = permissions.find(p => p.id === depId);
                                                                            return dep?.name || depId;
                                                                        }).join(', ')}
                                                                    </Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Role Templates Modal */}
            <Modal
                visible={showRoleTemplates}
                transparent
                animationType="slide"
                onRequestClose={() => setShowRoleTemplates(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Role Templates</Text>
                            <TouchableOpacity onPress={() => setShowRoleTemplates(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            {roleTemplates.map(template => (
                                <TouchableOpacity
                                    key={template.id}
                                    style={styles.templateItem}
                                    onPress={() => handleApplyRoleTemplate(template)}
                                    disabled={localLoading}
                                >
                                    <View style={[styles.templateIcon, { backgroundColor: colors.primary + "20" }]}>
                                        <Shield size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.templateInfo}>
                                        <Text style={styles.templateName}>{template.name}</Text>
                                        <Text style={styles.templateDescription}>{template.description}</Text>
                                        <Text style={styles.templatePermCount}>
                                            {template.permission_ids?.length || 0} permissions
                                        </Text>
                                    </View>
                                    <View style={styles.templateAction}>
                                        {localLoading ? (
                                            <ActivityIndicator size={12} color={colors.primary} />
                                        ) : (
                                            <Text style={styles.templateActionText}>Apply</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Bulk Actions Modal */}
            <Modal
                visible={showBulkActions}
                transparent
                animationType="slide"
                onRequestClose={() => setShowBulkActions(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bulk Actions</Text>
                            <TouchableOpacity onPress={() => setShowBulkActions(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalContent}>
                            <TouchableOpacity
                                style={styles.bulkActionItem}
                                onPress={() => handleBulkAction('select_all')}
                            >
                                <Plus size={20} color={colors.success} />
                                <View style={styles.bulkActionContent}>
                                    <Text style={styles.bulkActionText}>Select All Permissions</Text>
                                    <Text style={styles.bulkActionSubtext}>Apply all available permissions</Text>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.bulkActionItem}
                                onPress={() => handleBulkAction('deselect_all')}
                            >
                                <Minus size={20} color={colors.danger} />
                                <View style={styles.bulkActionContent}>
                                    <Text style={styles.bulkActionText}>Deselect All Permissions</Text>
                                    <Text style={styles.bulkActionSubtext}>Remove all permissions</Text>
                                </View>
                            </TouchableOpacity>

                            {selectedCategory && (
                                <TouchableOpacity
                                    style={styles.bulkActionItem}
                                    onPress={() => handleBulkAction('select_category')}
                                >
                                    <CheckCircle size={20} color={colors.primary} />
                                    <View style={styles.bulkActionContent}>
                                        <Text style={styles.bulkActionText}>Select Category Permissions</Text>
                                        <Text style={styles.bulkActionSubtext}>Apply current category only</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    mainScrollView: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        justifyContent: "flex-end",
    },
    headerResetButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: "transparent",
        alignItems: "center",
        justifyContent: "center",
    },
    headerSaveButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    headerSavedButton: {
        width: 32,
        height: 32,
        borderRadius: 6,
        backgroundColor: colors.success + "20",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.success + "30",
    },

    // Modern user info card styles
    modernUserInfoCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        margin: 20,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "30",
        overflow: 'hidden',
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    userAvatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    userAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    superAdminIndicator: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.warning,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.card,
    },
    userInfoContent: {
        flex: 1,
    },
    userInfoName: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    userInfoEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    userInfoMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    roleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + "20",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    roleTagText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        textTransform: 'capitalize',
    },
    superAdminBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.warning + "15",
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: colors.warning + "20",
    },
    superAdminBannerText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.warning,
    },

    // Statistics
    statsContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginBottom: 20,
        gap: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "800",
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
        textAlign: "center",
    },

    // Action bar
    actionBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border + "20",
    },
    actionBarLeft: {
        flexDirection: "row",
        gap: 8,
    },
    actionBarRight: {
        flexDirection: "row",
        gap: 8,
    },
    outlineButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "transparent",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    outlineButtonActive: {
        backgroundColor: colors.primary + "08",
    },
    outlineButtonText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
    },
    outlineButtonTextActive: {
        color: colors.primary,
        fontWeight: "700",
    },

    // Search
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },

    // Category tabs
    categoryTabContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    categorySelector: {
        maxHeight: 50,
    },
    categoryTab: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginRight: 4,
        gap: 6,
        minWidth: 100,
        justifyContent: "center",
    },
    categoryTabActive: {
        backgroundColor: colors.primary + "15",
    },
    categoryTabText: {
        fontSize: 11,
        fontWeight: "600",
        color: colors.textSecondary,
        textAlign: "center",
    },
    categoryTabTextActive: {
        color: colors.primary,
        fontWeight: "700",
    },

    // Permissions
    permissionsContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    categorySection: {
        backgroundColor: colors.card,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: colors.border + "20",
        overflow: "hidden",
    },
    categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 24,
        backgroundColor: colors.background + "40",
    },
    categoryHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + "15",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
        borderWidth: 2,
        borderColor: colors.primary + "30",
    },
    categoryHeaderInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.text,
        marginBottom: 6,
    },
    categoryDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    categoryHeaderRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    categoryCount: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    permissionsList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 12,
        gap: 12,
    },
    permissionRow: {
        backgroundColor: colors.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
        overflow: "hidden",
    },
    permissionItem: {
        padding: 16,
        backgroundColor: "transparent",
    },
    permissionItemSelected: {
        backgroundColor: colors.primary + "08",
        borderColor: colors.primary + "30",
    },
    permissionLeft: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    permissionCheckbox: {
        marginRight: 16,
        marginTop: 2,
    },
    permissionContent: {
        flex: 1,
    },
    permissionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    permissionName: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.text,
        flex: 1,
        marginRight: 8,
    },
    permissionMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    criticalBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.danger + "20",
        alignItems: "center",
        justifyContent: "center",
    },
    levelBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    levelText: {
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.5,
    },
    permissionDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 10,
    },
    dependencyInfo: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.warning + "10",
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.warning + "30",
        marginTop: 8,
        gap: 6,
    },
    dependencyLabel: {
        fontSize: 10,
        color: colors.warning,
        fontWeight: "600",
        flex: 1,
    },

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        backgroundColor: colors.card,
        borderRadius: 16,
        margin: 20,
        maxHeight: "70%",
        width: "90%",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    modalContent: {
        padding: 20,
        maxHeight: 400,
    },
    templateItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.background,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
    },
    templateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    templateDescription: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
        lineHeight: 16,
    },
    templatePermCount: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: "500",
    },
    templateAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: "transparent",
        minWidth: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    templateActionText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    bulkActionItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.background,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border + "30",
        gap: 16,
    },
    bulkActionContent: {
        flex: 1,
    },
    bulkActionText: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    bulkActionSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
    },
}); 