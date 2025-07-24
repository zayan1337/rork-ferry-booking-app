import React, { useState, useMemo, useEffect } from "react";
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
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { usePermissionStore } from "@/store/admin/permissionStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { useAuthStore } from "@/store/authStore";
import { AdminManagement } from "@/types";
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
    ArrowLeft
} from "lucide-react-native";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import SearchBar from "@/components/admin/SearchBar";
import StatusBadge from "@/components/admin/StatusBadge";

const { width: screenWidth } = Dimensions.get('window');

// Use types from management types file
type Permission = AdminManagement.Permission;
type PermissionCategory = AdminManagement.PermissionCategory;
type RoleTemplate = AdminManagement.RoleTemplate;
type AdminUser = AdminManagement.AdminUser;

// Predefined colors for role templates (replacing database colors)
const ROLE_TEMPLATE_COLORS: Record<string, string> = {
    'Super Administrator': '#DC2626',
    'Operations Manager': '#2563EB',
    'Customer Service': '#059669',
    'Financial Officer': '#D97706',
    'Content Manager': '#7C3AED',
    'default': colors.primary
};

// Helper function to get template color
const getTemplateColor = (templateName: string): string => {
    return ROLE_TEMPLATE_COLORS[templateName] || ROLE_TEMPLATE_COLORS.default;
};

export default function UserPermissionsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const { canManagePermissions } = useAdminPermissions();

    // Store state
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
        updateUserPermissions,
        applyRoleTemplate,
        getUserPermissions,
        clearError
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isTablet = screenWidth >= 768;

    // Get current user data
    const currentUser = useMemo(() => {
        return adminUsers.find(u => u.id === id);
    }, [adminUsers, id]);

    // Initialize data and user permissions
    useEffect(() => {
        const initializeData = async () => {
            await fetchAll();
            if (id) {
                await fetchUserPermissions(id);
            }
        };

        initializeData();
    }, [id, fetchAll, fetchUserPermissions]);

    // Set initial selected permissions
    useEffect(() => {
        if (currentUser?.direct_permissions) {
            setSelectedPermissions(new Set(currentUser.direct_permissions));
            setExpandedCategories(new Set(categories.map(c => c.id)));
        }
    }, [currentUser, categories]);

    // Organize permissions by category
    const permissionsByCategory = useMemo(() => {
        const categoryMap = new Map();

        categories.forEach(category => {
            const categoryPermissions = permissions.filter(p => p.category_id === category.id);
            categoryMap.set(category.id, {
                ...category,
                permissions: categoryPermissions
            });
        });

        return Array.from(categoryMap.values());
    }, [categories, permissions]);

    // Filter permissions based on search and category
    const filteredCategories = useMemo(() => {
        let filtered = permissionsByCategory;

        if (selectedCategory) {
            filtered = filtered.filter((cat: any) => cat.id === selectedCategory);
        }

        if (searchQuery) {
            filtered = filtered.map((cat: any) => ({
                ...cat,
                permissions: cat.permissions.filter((perm: Permission) =>
                    perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    perm.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
            })).filter((cat: any) => cat.permissions.length > 0);
        }

        if (filterLevel) {
            filtered = filtered.map((cat: any) => ({
                ...cat,
                permissions: cat.permissions.filter((perm: Permission) => perm.level === filterLevel)
            })).filter((cat: any) => cat.permissions.length > 0);
        }

        return filtered;
    }, [permissionsByCategory, selectedCategory, searchQuery, filterLevel]);

    // Permission statistics
    const permissionStats = useMemo(() => {
        const totalPermissions = permissionsByCategory.reduce((sum: number, cat: any) => sum + cat.permissions.length, 0);
        const selectedCount = selectedPermissions.size;
        const criticalCount = permissionsByCategory.reduce((sum: number, cat: any) =>
            sum + cat.permissions.filter((p: Permission) => p.is_critical && selectedPermissions.has(p.id)).length, 0
        );

        return {
            total: totalPermissions,
            selected: selectedCount,
            critical: criticalCount,
            percentage: totalPermissions > 0 ? Math.round((selectedCount / totalPermissions) * 100) : 0
        };
    }, [permissionsByCategory, selectedPermissions]);

    const handlePermissionToggle = (permissionId: string) => {
        const newSelected = new Set(selectedPermissions);
        const permission = permissionsByCategory
            .flatMap((cat: any) => cat.permissions)
            .find((p: Permission) => p.id === permissionId);

        if (newSelected.has(permissionId)) {
            // Remove permission and its dependents
            const dependents = permissionsByCategory
                .flatMap((cat: any) => cat.permissions)
                .filter((p: Permission) => p.dependencies?.includes(permissionId));

            newSelected.delete(permissionId);
            dependents.forEach((dep: Permission) => newSelected.delete(dep.id));
        } else {
            // Add permission and its dependencies
            newSelected.add(permissionId);
            if (permission?.dependencies) {
                permission.dependencies.forEach((dep: string) => newSelected.add(dep));
            }
        }

        setSelectedPermissions(newSelected);
        setHasUnsavedChanges(true);
    };

    const handleApplyRoleTemplate = (template: RoleTemplate) => {
        setSelectedPermissions(new Set(template.permission_ids || []));
        setHasUnsavedChanges(true);
        setShowRoleTemplates(false);
        Alert.alert("Template Applied", `${template.name} permissions have been applied.`);
    };

    const handleSave = async () => {
        if (!currentUser || !user?.profile?.id) {
            Alert.alert("Error", "User information not available.");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateUserPermissions(currentUser.id, Array.from(selectedPermissions), user.profile.id);
            setHasUnsavedChanges(false);
            Alert.alert("Success", "User permissions updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update user permissions.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        Alert.alert(
            "Reset Permissions",
            "Are you sure you want to reset to the saved permissions?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        setSelectedPermissions(new Set(currentUser?.direct_permissions || []));
                        setHasUnsavedChanges(false);
                    }
                }
            ]
        );
    };

    const handleBulkAction = (action: 'select_all' | 'deselect_all' | 'select_category') => {
        const newSelected = new Set(selectedPermissions);

        switch (action) {
            case 'select_all':
                permissionsByCategory.forEach((cat: any) =>
                    cat.permissions.forEach((perm: Permission) => newSelected.add(perm.id))
                );
                break;
            case 'deselect_all':
                newSelected.clear();
                break;
            case 'select_category':
                if (selectedCategory) {
                    const category = permissionsByCategory.find((cat: any) => cat.id === selectedCategory);
                    category?.permissions.forEach((perm: Permission) => newSelected.add(perm.id));
                }
                break;
        }

        setSelectedPermissions(newSelected);
        setHasUnsavedChanges(true);
        setShowBulkActions(false);
    };

    const getPermissionLevelColor = (level: string) => {
        switch (level) {
            case 'read': return colors.info;
            case 'write': return colors.warning;
            case 'delete': return colors.danger;
            case 'admin': return colors.primaryDark;
            default: return colors.textSecondary;
        }
    };

    const getPermissionLevelIcon = (level: string) => {
        switch (level) {
            case 'read': return Eye;
            case 'write': return Edit;
            case 'delete': return Trash2;
            case 'admin': return Key;
            default: return Circle;
        }
    };

    const toggleCategoryExpansion = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    if (loading.fetchAll) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Loading permissions...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button title="Retry" onPress={() => { clearError(); fetchAll(); }} />
            </View>
        );
    }

    if (!currentUser) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>User not found</Text>
                <Button title="Go Back" onPress={() => router.back()} />
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
                                        "You have unsaved changes. Are you sure you want to leave?",
                                        [
                                            { text: "Cancel", style: "cancel" },
                                            { text: "Leave", style: "destructive", onPress: () => router.back() }
                                        ]
                                    );
                                } else {
                                    router.back();
                                }
                            }}
                            style={styles.headerBackButton}
                        >
                            <ArrowLeft size={20} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        hasUnsavedChanges && canManagePermissions ? (
                            <View style={styles.headerActions}>
                                <TouchableOpacity onPress={handleReset} style={styles.headerResetButton}>
                                    <RotateCcw size={12} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleSave}
                                    style={styles.headerSaveButton}
                                    disabled={isSubmitting}
                                >
                                    <Save size={12} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : null
                    )
                }}
            />

            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={loading.fetchAll}
                        onRefresh={fetchAll}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* User Info Header */}
                <View style={styles.userInfoSection}>
                    <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                            {(currentUser.full_name || '').split(' ').filter((n: string) => n).map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                        </Text>
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

                {/* Permission Statistics */}
                <View style={styles.statsSection}>
                    <Text style={styles.statsTitle}>Permission Overview</Text>
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{permissionStats.selected}</Text>
                            <Text style={styles.statLabel}>Selected</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{permissionStats.total}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{permissionStats.critical}</Text>
                            <Text style={styles.statLabel}>Critical</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{permissionStats.percentage}%</Text>
                            <Text style={styles.statLabel}>Coverage</Text>
                        </View>
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
                                // Cycle through filter levels
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
                        style={styles.searchBar}
                    />
                </View>

                {/* Category Tabs */}
                <View style={styles.categoryTabs}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity
                            style={[styles.categoryTab, !selectedCategory && styles.categoryTabActive]}
                            onPress={() => setSelectedCategory(null)}
                        >
                            <Text style={[styles.categoryTabText, !selectedCategory && styles.categoryTabTextActive]}>
                                All Categories
                            </Text>
                        </TouchableOpacity>
                        {permissionsByCategory.map((category: any) => (
                            <TouchableOpacity
                                key={category.id}
                                style={[styles.categoryTab, selectedCategory === category.id && styles.categoryTabActive]}
                                onPress={() => setSelectedCategory(category.id)}
                            >
                                <Text style={[styles.categoryTabText, selectedCategory === category.id && styles.categoryTabTextActive]}>
                                    {category.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Permissions List */}
                <View style={styles.permissionsContainer}>
                    {filteredCategories.map((category: any) => (
                        <View key={category.id} style={styles.categorySection}>
                            <TouchableOpacity
                                style={styles.categoryHeader}
                                onPress={() => toggleCategoryExpansion(category.id)}
                            >
                                <View style={styles.categoryHeaderLeft}>
                                    <Text style={styles.categoryName}>{category.name}</Text>
                                    <Text style={styles.categoryDescription}>{category.description}</Text>
                                </View>
                                <View style={styles.categoryHeaderRight}>
                                    <Text style={styles.categoryCount}>
                                        {category.permissions.filter((p: Permission) => selectedPermissions.has(p.id)).length}/{category.permissions.length}
                                    </Text>
                                    {expandedCategories.has(category.id) ?
                                        <ChevronDown size={20} color={colors.textSecondary} /> :
                                        <ChevronRight size={20} color={colors.textSecondary} />
                                    }
                                </View>
                            </TouchableOpacity>

                            {expandedCategories.has(category.id) && (
                                <View style={styles.permissionsList}>
                                    {category.permissions.map((permission: Permission) => (
                                        <View key={permission.id} style={styles.permissionRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.permissionCheckbox,
                                                    selectedPermissions.has(permission.id) && styles.permissionCheckboxSelected
                                                ]}
                                                onPress={() => handlePermissionToggle(permission.id)}
                                                disabled={!canManagePermissions}
                                            >
                                                {selectedPermissions.has(permission.id) ? (
                                                    <CheckCircle size={20} color={colors.primary} />
                                                ) : (
                                                    <Circle size={20} color={colors.border} />
                                                )}
                                            </TouchableOpacity>

                                            <View style={styles.permissionContent}>
                                                <View style={styles.permissionHeader}>
                                                    <Text style={styles.permissionName}>{permission.name}</Text>
                                                    <View style={styles.permissionLevel}>
                                                        {React.createElement(getPermissionLevelIcon(permission.level), {
                                                            size: 14,
                                                            color: getPermissionLevelColor(permission.level)
                                                        })}
                                                        <Text style={[styles.permissionLevelText, { color: getPermissionLevelColor(permission.level) }]}>
                                                            {permission.level.toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.permissionDescription}>{permission.description}</Text>
                                                {permission.is_critical && (
                                                    <View style={styles.criticalTag}>
                                                        <AlertTriangle size={12} color={colors.danger} />
                                                        <Text style={styles.criticalTagText}>Critical</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Role Templates Modal */}
            <Modal
                visible={showRoleTemplates}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Role Templates</Text>
                        <TouchableOpacity onPress={() => setShowRoleTemplates(false)}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {roleTemplates.map((template: RoleTemplate) => (
                            <TouchableOpacity
                                key={template.id}
                                style={styles.templateItem}
                                onPress={() => handleApplyRoleTemplate(template)}
                            >
                                <View style={[styles.templateIcon, { backgroundColor: getTemplateColor(template.name) + "20" }]}>
                                    <Shield size={20} color={getTemplateColor(template.name)} />
                                </View>
                                <View style={styles.templateInfo}>
                                    <Text style={styles.templateName}>{template.name}</Text>
                                    <Text style={styles.templateDescription}>{template.description}</Text>
                                    <Text style={styles.templatePermCount}>
                                        {template.permission_ids?.length || 0} permissions
                                    </Text>
                                </View>
                                <View style={styles.templateAction}>
                                    <ChevronRight size={20} color={colors.textSecondary} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* Bulk Actions Modal */}
            <Modal
                visible={showBulkActions}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Bulk Actions</Text>
                        <TouchableOpacity onPress={() => setShowBulkActions(false)}>
                            <X size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.bulkActionItem}
                            onPress={() => handleBulkAction('select_all')}
                        >
                            <Plus size={20} color={colors.primary} />
                            <Text style={styles.bulkActionText}>Select All Permissions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.bulkActionItem}
                            onPress={() => handleBulkAction('deselect_all')}
                        >
                            <Minus size={20} color={colors.danger} />
                            <Text style={styles.bulkActionText}>Deselect All Permissions</Text>
                        </TouchableOpacity>

                        {selectedCategory && (
                            <TouchableOpacity
                                style={styles.bulkActionItem}
                                onPress={() => handleBulkAction('select_category')}
                            >
                                <Copy size={20} color={colors.warning} />
                                <Text style={styles.bulkActionText}>Select Current Category</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Styles (keeping existing styles - they should work fine)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: colors.danger,
        textAlign: 'center',
        marginBottom: 20,
    },
    scrollView: {
        flex: 1,
    },
    headerBackButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerResetButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
    },
    headerSaveButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    userInfoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.card,
        marginBottom: 1,
    },
    userAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    userAvatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.white,
    },
    userInfoContent: {
        flex: 1,
    },
    userInfoName: {
        fontSize: 18,
        fontWeight: '600',
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
        backgroundColor: colors.primaryLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    roleTagText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.primary,
    },
    statsSection: {
        padding: 20,
        backgroundColor: colors.card,
        marginBottom: 1,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actionBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: colors.card,
        marginBottom: 1,
    },
    actionBarLeft: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBarRight: {
        flexDirection: 'row',
    },
    outlineButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    outlineButtonActive: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    outlineButtonText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    outlineButtonTextActive: {
        color: colors.primary,
    },
    searchContainer: {
        padding: 20,
        backgroundColor: colors.card,
        marginBottom: 1,
    },
    searchBar: {
        marginBottom: 0,
    },
    categoryTabs: {
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginBottom: 1,
    },
    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: colors.backgroundSecondary,
    },
    categoryTabActive: {
        backgroundColor: colors.primary,
    },
    categoryTabText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    categoryTabTextActive: {
        color: colors.white,
    },
    permissionsContainer: {
        backgroundColor: colors.card,
    },
    categorySection: {
        marginBottom: 1,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: colors.backgroundSecondary,
    },
    categoryHeaderLeft: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    categoryDescription: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    categoryHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryCount: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    permissionsList: {
        backgroundColor: colors.card,
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },
    permissionCheckbox: {
        marginTop: 2,
    },
    permissionCheckboxSelected: {
        // Add any selected styles if needed
    },
    permissionContent: {
        flex: 1,
    },
    permissionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    permissionName: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.text,
        flex: 1,
    },
    permissionLevel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    permissionLevelText: {
        fontSize: 12,
        fontWeight: '500',
    },
    permissionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 8,
    },
    criticalTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.dangerLight,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
        alignSelf: 'flex-start',
    },
    criticalTagText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.danger,
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
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    templateItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    templateIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    templateDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    templatePermCount: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    templateAction: {
        // Add action styles if needed
    },
    bulkActionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    bulkActionText: {
        fontSize: 16,
        color: colors.text,
    },
}); 