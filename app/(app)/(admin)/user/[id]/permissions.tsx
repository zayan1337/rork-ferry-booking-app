import React, { useState, useMemo } from "react";
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
    TextInput
} from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useAdminStore } from "@/store/admin/adminStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
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
import { AdminPermission } from "@/types/admin";

const { width: screenWidth } = Dimensions.get('window');

interface PermissionCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    permissions: Permission[];
}

interface Permission {
    id: string;
    name: string;
    description: string;
    level: 'read' | 'write' | 'delete' | 'admin';
    dependencies?: string[];
    critical?: boolean;
}

interface RoleTemplate {
    id: string;
    name: string;
    description: string;
    color: string;
    permissions: string[];
    isSystemRole: boolean;
}

export default function UserPermissionsScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { adminPermissions } = useAdminStore();

    // Mock function for updating user permissions
    const updateUserPermissions = async (userId: string, permissions: string[]) => {
        // This would be implemented in the actual store
        console.log("Updating permissions for user:", userId, permissions);
    };
    const { canManagePermissions } = useAdminPermissions();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [showRoleTemplates, setShowRoleTemplates] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [filterLevel, setFilterLevel] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [loading, setLoading] = useState(false);

    const isTablet = screenWidth >= 768;

    // Mock admin user data - replace with actual data
    const adminUser = useMemo(() => ({
        id: id || "1",
        name: "John Admin",
        email: "john@ferry.com",
        role: "super_admin",
        status: "active",
        permissions: ["users_view", "users_create", "users_edit", "bookings_view", "bookings_create", "system_configure"]
    }), [id]);

    // Enhanced permission categories with more detail
    const permissionCategories: PermissionCategory[] = useMemo(() => [
        {
            id: "user_management",
            name: "User Management",
            description: "Manage user accounts, profiles, and access control",
            icon: "Users",
            permissions: [
                { id: "users_view", name: "View Users", description: "View user profiles and basic information", level: "read" },
                { id: "users_create", name: "Create Users", description: "Add new user accounts to the system", level: "write", dependencies: ["users_view"] },
                { id: "users_edit", name: "Edit Users", description: "Modify user profiles and information", level: "write", dependencies: ["users_view"] },
                { id: "users_delete", name: "Delete Users", description: "Remove user accounts from the system", level: "delete", dependencies: ["users_view", "users_edit"], critical: true },
                { id: "users_permissions", name: "Manage User Permissions", description: "Assign and modify user permissions", level: "admin", dependencies: ["users_view", "users_edit"], critical: true },
                { id: "users_export", name: "Export User Data", description: "Export user information and reports", level: "read", dependencies: ["users_view"] }
            ]
        },
        {
            id: "booking_management",
            name: "Booking Management",
            description: "Handle ferry bookings, reservations, and customer interactions",
            icon: "Calendar",
            permissions: [
                { id: "bookings_view", name: "View Bookings", description: "View booking details and history", level: "read" },
                { id: "bookings_create", name: "Create Bookings", description: "Make new ferry reservations", level: "write", dependencies: ["bookings_view"] },
                { id: "bookings_edit", name: "Edit Bookings", description: "Modify existing bookings", level: "write", dependencies: ["bookings_view"] },
                { id: "bookings_cancel", name: "Cancel Bookings", description: "Cancel and refund bookings", level: "delete", dependencies: ["bookings_view", "bookings_edit"] },
                { id: "bookings_checkin", name: "Check-in Management", description: "Manage passenger check-in process", level: "write", dependencies: ["bookings_view"] },
                { id: "bookings_reports", name: "Booking Reports", description: "Generate booking analytics and reports", level: "read", dependencies: ["bookings_view"] }
            ]
        },
        {
            id: "vessel_operations",
            name: "Vessel Operations",
            description: "Manage ferry vessels, schedules, and operational status",
            icon: "Ship",
            permissions: [
                { id: "vessels_view", name: "View Vessels", description: "View vessel information and status", level: "read" },
                { id: "vessels_create", name: "Add Vessels", description: "Add new vessels to the fleet", level: "write", dependencies: ["vessels_view"] },
                { id: "vessels_edit", name: "Edit Vessels", description: "Modify vessel details and configurations", level: "write", dependencies: ["vessels_view"] },
                { id: "vessels_delete", name: "Remove Vessels", description: "Remove vessels from the fleet", level: "delete", dependencies: ["vessels_view", "vessels_edit"], critical: true },
                { id: "trips_schedule", name: "Schedule Trips", description: "Create and manage trip schedules", level: "write", dependencies: ["vessels_view"] },
                { id: "trips_monitor", name: "Monitor Operations", description: "Track real-time vessel operations", level: "read", dependencies: ["vessels_view"] }
            ]
        },
        {
            id: "financial_management",
            name: "Financial Management",
            description: "Handle payments, pricing, and financial reporting",
            icon: "DollarSign",
            permissions: [
                { id: "payments_view", name: "View Payments", description: "View payment transactions and history", level: "read" },
                { id: "payments_process", name: "Process Payments", description: "Handle payment processing and refunds", level: "write", dependencies: ["payments_view"] },
                { id: "financial_reports", name: "Financial Reports", description: "Generate revenue and financial reports", level: "read", dependencies: ["payments_view"] },
                { id: "pricing_manage", name: "Manage Pricing", description: "Set and modify ticket pricing", level: "write", dependencies: ["payments_view"] },
                { id: "accounting_access", name: "Accounting Access", description: "Access detailed accounting information", level: "admin", dependencies: ["payments_view", "financial_reports"], critical: true }
            ]
        },
        {
            id: "system_administration",
            name: "System Administration",
            description: "System configuration, maintenance, and security",
            icon: "Settings",
            permissions: [
                { id: "system_view", name: "View System Status", description: "Monitor system health and performance", level: "read" },
                { id: "system_configure", name: "System Configuration", description: "Modify system settings and parameters", level: "admin", dependencies: ["system_view"], critical: true },
                { id: "system_backup", name: "Backup Management", description: "Create and manage system backups", level: "admin", dependencies: ["system_view"], critical: true },
                { id: "system_logs", name: "System Logs", description: "Access and analyze system logs", level: "read", dependencies: ["system_view"] },
                { id: "system_maintenance", name: "System Maintenance", description: "Perform system maintenance operations", level: "admin", dependencies: ["system_view", "system_configure"], critical: true }
            ]
        }
    ], []);

    // Role templates for quick permission assignment
    const roleTemplates: RoleTemplate[] = useMemo(() => [
        {
            id: "super_admin",
            name: "Super Administrator",
            description: "Full system access with all permissions",
            color: "#DC2626",
            permissions: permissionCategories.flatMap(cat => cat.permissions.map(p => p.id)),
            isSystemRole: true
        },
        {
            id: "operations_manager",
            name: "Operations Manager",
            description: "Manage bookings, vessels, and day-to-day operations",
            color: "#2563EB",
            permissions: [
                "bookings_view", "bookings_create", "bookings_edit", "bookings_cancel", "bookings_checkin",
                "vessels_view", "vessels_edit", "trips_schedule", "trips_monitor",
                "users_view", "system_view"
            ],
            isSystemRole: true
        },
        {
            id: "customer_service",
            name: "Customer Service",
            description: "Handle customer inquiries and basic booking management",
            color: "#059669",
            permissions: [
                "bookings_view", "bookings_create", "bookings_edit", "users_view"
            ],
            isSystemRole: true
        },
        {
            id: "financial_officer",
            name: "Financial Officer",
            description: "Manage payments, pricing, and financial reports",
            color: "#D97706",
            permissions: [
                "payments_view", "payments_process", "financial_reports", "pricing_manage",
                "bookings_view", "accounting_access"
            ],
            isSystemRole: true
        }
    ], [permissionCategories]);

    // Initialize selected permissions from user data
    useState(() => {
        setSelectedPermissions(new Set(adminUser.permissions));
        setExpandedCategories(new Set(permissionCategories.map(c => c.id)));
    });

    // Filter permissions based on search and category
    const filteredCategories = useMemo(() => {
        let filtered = permissionCategories;

        if (selectedCategory) {
            filtered = filtered.filter(cat => cat.id === selectedCategory);
        }

        if (searchQuery) {
            filtered = filtered.map(cat => ({
                ...cat,
                permissions: cat.permissions.filter(perm =>
                    perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    perm.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
            })).filter(cat => cat.permissions.length > 0);
        }

        if (filterLevel) {
            filtered = filtered.map(cat => ({
                ...cat,
                permissions: cat.permissions.filter(perm => perm.level === filterLevel)
            })).filter(cat => cat.permissions.length > 0);
        }

        return filtered;
    }, [permissionCategories, selectedCategory, searchQuery, filterLevel]);

    // Permission statistics
    const permissionStats = useMemo(() => {
        const totalPermissions = permissionCategories.reduce((sum, cat) => sum + cat.permissions.length, 0);
        const selectedCount = selectedPermissions.size;
        const criticalCount = permissionCategories.reduce((sum, cat) =>
            sum + cat.permissions.filter(p => p.critical && selectedPermissions.has(p.id)).length, 0
        );

        return {
            total: totalPermissions,
            selected: selectedCount,
            critical: criticalCount,
            percentage: Math.round((selectedCount / totalPermissions) * 100)
        };
    }, [permissionCategories, selectedPermissions]);

    const handlePermissionToggle = (permissionId: string) => {
        const newSelected = new Set(selectedPermissions);
        const permission = permissionCategories
            .flatMap(cat => cat.permissions)
            .find(p => p.id === permissionId);

        if (newSelected.has(permissionId)) {
            // Remove permission and its dependents
            const dependents = permissionCategories
                .flatMap(cat => cat.permissions)
                .filter(p => p.dependencies?.includes(permissionId));

            newSelected.delete(permissionId);
            dependents.forEach(dep => newSelected.delete(dep.id));
        } else {
            // Add permission and its dependencies
            newSelected.add(permissionId);
            if (permission?.dependencies) {
                permission.dependencies.forEach(dep => newSelected.add(dep));
            }
        }

        setSelectedPermissions(newSelected);
        setHasUnsavedChanges(true);
    };

    const handleApplyRoleTemplate = (template: RoleTemplate) => {
        setSelectedPermissions(new Set(template.permissions));
        setHasUnsavedChanges(true);
        setShowRoleTemplates(false);
        Alert.alert("Template Applied", `${template.name} permissions have been applied.`);
    };

    const handleSave = async () => {
        if (!canManagePermissions()) {
            Alert.alert("Access Denied", "You don't have permission to manage user permissions.");
            return;
        }

        setLoading(true);
        try {
            await updateUserPermissions(adminUser.id, Array.from(selectedPermissions));
            setHasUnsavedChanges(false);
            Alert.alert("Success", "User permissions updated successfully.");
        } catch (error) {
            Alert.alert("Error", "Failed to update user permissions.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        Alert.alert(
            "Reset Permissions",
            "Are you sure you want to reset all changes? This will revert to the last saved state.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        setSelectedPermissions(new Set(adminUser.permissions));
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
                permissionCategories.forEach(cat =>
                    cat.permissions.forEach(perm => newSelected.add(perm.id))
                );
                break;
            case 'deselect_all':
                newSelected.clear();
                break;
            case 'select_category':
                if (selectedCategory) {
                    const category = permissionCategories.find(cat => cat.id === selectedCategory);
                    category?.permissions.forEach(perm => newSelected.add(perm.id));
                }
                break;
        }

        setSelectedPermissions(newSelected);
        setHasUnsavedChanges(true);
        setShowBulkActions(false);
    };

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

    const toggleCategoryExpansion = (categoryId: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(categoryId)) {
            newExpanded.delete(categoryId);
        } else {
            newExpanded.add(categoryId);
        }
        setExpandedCategories(newExpanded);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `Permissions - ${adminUser.name}`,
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
                                    <TouchableOpacity onPress={handleSave} style={styles.headerSaveButton} disabled={loading}>
                                        <Save size={12} color="white" />
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

            {/* Main Content with Sticky Category Tabs */}
            <ScrollView
                style={styles.mainScrollView}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[4]} // Index of category tabs in the scroll view
            >
                {/* User Info Header */}
                <View style={styles.userInfoHeader}>
                    {/* Gradient Background */}
                    <View style={styles.headerGradient} />

                    <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>
                            {(adminUser.name || '').split(' ').filter(n => n).map(n => n[0]).join('').toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <View style={styles.userInfoContent}>
                        <Text style={styles.userInfoName}>{adminUser.name}</Text>
                        <Text style={styles.userInfoEmail}>{adminUser.email}</Text>
                        <View style={styles.userInfoMeta}>
                            <View style={styles.roleTag}>
                                <Shield size={12} color={colors.primary} />
                                <Text style={styles.roleTagText}>{adminUser.role}</Text>
                            </View>
                            <StatusBadge status={adminUser.status as any} size="small" />
                        </View>
                    </View>
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
                    />
                </View>

                {/* Category Tabs - Sticky Header */}
                <View style={styles.stickyTabContainer}>
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
                            {permissionCategories.map(category => (
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
                </View>

                {/* Permissions List */}
                <View style={styles.permissionsContainer}>
                    {filteredCategories.map(category => (
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
                                        {category.permissions.filter(p => selectedPermissions.has(p.id)).length}/{category.permissions.length}
                                    </Text>
                                    {expandedCategories.has(category.id) ?
                                        <ChevronDown size={20} color={colors.textSecondary} /> :
                                        <ChevronRight size={20} color={colors.textSecondary} />
                                    }
                                </View>
                            </TouchableOpacity>

                            {expandedCategories.has(category.id) && (
                                <View style={styles.permissionsList}>
                                    {category.permissions.map(permission => (
                                        <View key={permission.id} style={styles.permissionRow}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.permissionItem,
                                                    selectedPermissions.has(permission.id) && styles.permissionItemSelected
                                                ]}
                                                onPress={() => handlePermissionToggle(permission.id)}
                                            >
                                                <View style={styles.permissionLeft}>
                                                    <View style={styles.permissionCheckbox}>
                                                        {selectedPermissions.has(permission.id) ? (
                                                            <CheckCircle size={20} color={colors.primary} />
                                                        ) : (
                                                            <Circle size={20} color={colors.border} />
                                                        )}
                                                    </View>

                                                    <View style={styles.permissionContent}>
                                                        <View style={styles.permissionHeader}>
                                                            <Text style={styles.permissionName}>{permission.name}</Text>
                                                            <View style={styles.permissionMeta}>
                                                                {permission.critical && (
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
                                                                    Requires: {permission.dependencies.join(', ')}
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
                                >
                                    <View style={[styles.templateIcon, { backgroundColor: template.color + "20" }]}>
                                        <Shield size={20} color={template.color} />
                                    </View>
                                    <View style={styles.templateInfo}>
                                        <Text style={styles.templateName}>{template.name}</Text>
                                        <Text style={styles.templateDescription}>{template.description}</Text>
                                        <Text style={styles.templatePermCount}>
                                            {template.permissions.length} permissions
                                        </Text>
                                    </View>
                                    <View style={styles.templateAction}>
                                        <Text style={styles.templateActionText}>Apply</Text>
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
    stickyTabContainer: {
        backgroundColor: colors.backgroundSecondary,
        paddingTop: 4,
        paddingBottom: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + "20",
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
    resetButton: {
        padding: 8,
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
    userInfoHeader: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 24,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: colors.border + "20",
        position: "relative",
        overflow: "hidden",
    },
    headerGradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.primary + "08",
        borderRadius: 20,
    },
    userAvatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 20,
        borderWidth: 4,
        borderColor: "white",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    userAvatarText: {
        fontSize: 22,
        fontWeight: "900",
        color: "white",
        textShadowColor: "rgba(0,0,0,0.4)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    userInfoContent: {
        flex: 1,
    },
    userInfoName: {
        fontSize: 20,
        fontWeight: "800",
        color: colors.text,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    userInfoEmail: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: 12,
        opacity: 0.8,
    },
    userInfoMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    roleTag: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary + "20",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    roleTagText: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.primary,
    },
    statsContainer: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 20,
        gap: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        padding: 20,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.border + "20",
        position: "relative",
        overflow: "hidden",
    },
    statValue: {
        fontSize: 28,
        fontWeight: "900",
        color: colors.primary,
        marginBottom: 6,
        textShadowColor: colors.primary + "30",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    statLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: colors.textSecondary,
        textAlign: "center",
        opacity: 0.8,
    },
    actionBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginTop: 20,
        borderRadius: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
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
        marginRight: 8,
    },
    outlineButtonActive: {
        borderColor: colors.primary,
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
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    categoryTabContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 12,
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
    permissionsContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    categorySection: {
        backgroundColor: colors.card,
        borderRadius: 20,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
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
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryHeaderInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: "800",
        color: colors.text,
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    categoryDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
        opacity: 0.8,
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
        letterSpacing: -0.3,
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
        borderWidth: 1.5,
        borderColor: "transparent",
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
        opacity: 0.8,
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
        opacity: 0.8,
    },
}); 