import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Switch,
    FlatList,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { UserProfile, Permission, Role, UserPermission } from '@/types/userManagement';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import {
    Shield,
    Crown,
    UserCheck,
    Settings,
    Check,
    X,
    Plus,
    Edit,
    Trash2,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Users,
    Activity,
    AlertTriangle,
    CheckCircle,
    Filter,
    Save,
} from 'lucide-react-native';

interface PermissionManagerProps {
    user: UserProfile;
    permissions: Permission[];
    roles: Role[];
    userPermissions: UserPermission[];
    onUpdatePermissions?: (permissions: UserPermission[]) => void;
    onUpdateRole?: (roleId: string) => void;
    onSave?: () => void;
    showActions?: boolean;
}

type PermissionCategory = 'all' | 'users' | 'bookings' | 'operations' | 'finance' | 'settings';

export default function PermissionManager({
    user,
    permissions,
    roles,
    userPermissions,
    onUpdatePermissions,
    onUpdateRole,
    onSave,
    showActions = true,
}: PermissionManagerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<PermissionCategory>('all');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
        new Set(userPermissions.map(p => p.permission_id))
    );
    const [selectedRole, setSelectedRole] = useState(user.role || '');
    const [hasChanges, setHasChanges] = useState(false);

    // Group permissions by category
    const permissionsByCategory = useMemo(() => {
        const categories: { [key: string]: Permission[] } = {};
        permissions.forEach(permission => {
            const category = permission.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(permission);
        });
        return categories;
    }, [permissions]);

    // Filter permissions based on search and category
    const filteredPermissions = useMemo(() => {
        let filtered = permissions;

        // Category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [permissions, selectedCategory, searchQuery]);

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    const togglePermission = (permissionId: string) => {
        const newPermissions = new Set(selectedPermissions);
        if (newPermissions.has(permissionId)) {
            newPermissions.delete(permissionId);
        } else {
            newPermissions.add(permissionId);
        }
        setSelectedPermissions(newPermissions);
        setHasChanges(true);
    };

    const toggleCategoryPermissions = (category: string, enable: boolean) => {
        const categoryPermissions = permissionsByCategory[category] || [];
        const newPermissions = new Set(selectedPermissions);

        categoryPermissions.forEach(permission => {
            if (enable) {
                newPermissions.add(permission.id);
            } else {
                newPermissions.delete(permission.id);
            }
        });

        setSelectedPermissions(newPermissions);
        setHasChanges(true);
    };

    const handleRoleChange = (roleId: string) => {
        setSelectedRole(roleId);
        setHasChanges(true);
    };

    const handleSave = () => {
        if (hasChanges) {
            // Update permissions
            const newUserPermissions = Array.from(selectedPermissions).map(permissionId => ({
                id: `${user.id}-${permissionId}`,
                user_id: user.id,
                permission_id: permissionId,
                granted_at: new Date(),
                granted_by: 'current_admin', // Replace with actual admin ID
            }));

            onUpdatePermissions?.(newUserPermissions);
            onUpdateRole?.(selectedRole);
            onSave?.();
            setHasChanges(false);
            Alert.alert('Success', 'Permissions updated successfully!');
        }
    };

    const handleReset = () => {
        setSelectedPermissions(new Set(userPermissions.map(p => p.permission_id)));
        setSelectedRole(user.role || '');
        setHasChanges(false);
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin':
                return <Crown size={16} color={colors.danger} />;
            case 'agent':
                return <UserCheck size={16} color={colors.primary} />;
            case 'customer':
                return <Users size={16} color={colors.secondary} />;
            default:
                return <Users size={16} color={colors.textSecondary} />;
        }
    };

    const getPermissionIcon = (permission: Permission) => {
        if (permission.category === 'users') return <Users size={16} color={colors.primary} />;
        if (permission.category === 'bookings') return <Activity size={16} color={colors.success} />;
        if (permission.category === 'operations') return <Settings size={16} color={colors.warning} />;
        if (permission.category === 'finance') return <Shield size={16} color={colors.danger} />;
        return <Lock size={16} color={colors.textSecondary} />;
    };

    const getCategoryStats = (category: string) => {
        const categoryPermissions = permissionsByCategory[category] || [];
        const granted = categoryPermissions.filter(p => selectedPermissions.has(p.id)).length;
        const total = categoryPermissions.length;
        return { granted, total };
    };

    const renderPermissionItem = (permission: Permission) => {
        const isSelected = selectedPermissions.has(permission.id);
        const isInherited = user.role === 'admin' && permission.level <= 1; // Admin inherits basic permissions

        return (
            <View key={permission.id} style={styles.permissionItem}>
                <TouchableOpacity
                    style={styles.permissionContent}
                    onPress={() => !isInherited && togglePermission(permission.id)}
                    disabled={isInherited}
                >
                    <View style={styles.permissionIcon}>
                        {getPermissionIcon(permission)}
                    </View>
                    <View style={styles.permissionInfo}>
                        <Text style={styles.permissionName}>{permission.name}</Text>
                        <Text style={styles.permissionDescription}>{permission.description}</Text>
                        {isInherited && (
                            <Text style={styles.inheritedText}>Inherited from role</Text>
                        )}
                    </View>
                    <View style={styles.permissionToggle}>
                        <Switch
                            value={isSelected || isInherited}
                            onValueChange={() => !isInherited && togglePermission(permission.id)}
                            disabled={isInherited}
                            trackColor={{ false: colors.border, true: colors.primary + '40' }}
                            thumbColor={isSelected || isInherited ? colors.primary : colors.textSecondary}
                        />
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const renderCategorySection = (category: string) => {
        const categoryPermissions = permissionsByCategory[category] || [];
        const isExpanded = expandedCategories.has(category);
        const stats = getCategoryStats(category);
        const allSelected = stats.granted === stats.total;
        const someSelected = stats.granted > 0 && stats.granted < stats.total;

        return (
            <View key={category} style={styles.categorySection}>
                <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category)}
                >
                    <View style={styles.categoryInfo}>
                        <Text style={styles.categoryTitle}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
                        <Text style={styles.categoryStats}>
                            {stats.granted}/{stats.total} permissions
                        </Text>
                    </View>
                    <View style={styles.categoryActions}>
                        <TouchableOpacity
                            style={styles.categoryToggle}
                            onPress={() => toggleCategoryPermissions(category, !allSelected)}
                        >
                            <View style={[
                                styles.categoryCheckbox,
                                allSelected && styles.categoryCheckboxSelected,
                                someSelected && styles.categoryCheckboxPartial,
                            ]}>
                                {allSelected && <Check size={12} color="white" />}
                                {someSelected && <View style={styles.partialIndicator} />}
                            </View>
                        </TouchableOpacity>
                        <View style={styles.expandIcon}>
                            {isExpanded ?
                                <EyeOff size={16} color={colors.textSecondary} /> :
                                <Eye size={16} color={colors.textSecondary} />
                            }
                        </View>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.permissionsList}>
                        {categoryPermissions.map(renderPermissionItem)}
                    </View>
                )}
            </View>
        );
    };

    const categories = [
        { key: 'all', label: 'All Permissions', icon: <Shield size={16} color={colors.textSecondary} /> },
        { key: 'users', label: 'User Management', icon: <Users size={16} color={colors.primary} /> },
        { key: 'bookings', label: 'Bookings', icon: <Activity size={16} color={colors.success} /> },
        { key: 'operations', label: 'Operations', icon: <Settings size={16} color={colors.warning} /> },
        { key: 'finance', label: 'Finance', icon: <Shield size={16} color={colors.danger} /> },
        { key: 'settings', label: 'Settings', icon: <Settings size={16} color={colors.textSecondary} /> },
    ];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Permissions Manager</Text>
                    <Text style={styles.subtitle}>
                        Managing permissions for {user.name}
                    </Text>
                </View>
                {hasChanges && (
                    <View style={styles.changesIndicator}>
                        <Text style={styles.changesText}>Unsaved Changes</Text>
                    </View>
                )}
            </View>

            {/* Role Selection */}
            <View style={styles.roleSection}>
                <Text style={styles.sectionTitle}>User Role</Text>
                <View style={styles.roleContainer}>
                    {roles.map(role => (
                        <TouchableOpacity
                            key={role.id}
                            style={[
                                styles.roleOption,
                                selectedRole === role.id && styles.roleOptionSelected,
                            ]}
                            onPress={() => handleRoleChange(role.id)}
                        >
                            <View style={styles.roleIcon}>
                                {getRoleIcon(role.name)}
                            </View>
                            <View style={styles.roleInfo}>
                                <Text style={[
                                    styles.roleName,
                                    selectedRole === role.id && styles.roleNameSelected,
                                ]}>
                                    {role.name}
                                </Text>
                                <Text style={[
                                    styles.roleDescription,
                                    selectedRole === role.id && styles.roleDescriptionSelected,
                                ]}>
                                    {role.description}
                                </Text>
                            </View>
                            {selectedRole === role.id && (
                                <CheckCircle size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search permissions..."
                    style={styles.searchBar}
                />
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryFilters}
                >
                    {categories.map(category => (
                        <TouchableOpacity
                            key={category.key}
                            style={[
                                styles.categoryFilter,
                                selectedCategory === category.key && styles.categoryFilterActive,
                            ]}
                            onPress={() => setSelectedCategory(category.key as PermissionCategory)}
                        >
                            {category.icon}
                            <Text style={[
                                styles.categoryFilterText,
                                selectedCategory === category.key && styles.categoryFilterTextActive,
                            ]}>
                                {category.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Permissions List */}
            <ScrollView style={styles.permissionsContainer}>
                {Object.keys(permissionsByCategory).map(renderCategorySection)}
            </ScrollView>

            {/* Action Buttons */}
            {showActions && (
                <View style={styles.actionContainer}>
                    <Button
                        title="Reset"
                        variant="ghost"
                        onPress={handleReset}
                        disabled={!hasChanges}
                        style={styles.resetButton}
                    />
                    <Button
                        title="Save Changes"
                        variant="primary"
                        onPress={handleSave}
                        disabled={!hasChanges}
                        icon={<Save size={18} color="#FFFFFF" />}
                        style={styles.saveButton}
                    />
                </View>
            )}

            {/* Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Permissions</Text>
                    <Text style={styles.summaryValue}>{selectedPermissions.size}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Role</Text>
                    <Text style={styles.summaryValue}>{selectedRole}</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Status</Text>
                    <Text style={[
                        styles.summaryValue,
                        { color: hasChanges ? colors.warning : colors.success }
                    ]}>
                        {hasChanges ? 'Modified' : 'Saved'}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        marginBottom: 16,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    changesIndicator: {
        backgroundColor: colors.warning + '20',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    changesText: {
        fontSize: 12,
        color: colors.warning,
        fontWeight: '600',
    },
    roleSection: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    roleContainer: {
        gap: 8,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundSecondary,
    },
    roleOptionSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '10',
    },
    roleIcon: {
        marginRight: 12,
    },
    roleInfo: {
        flex: 1,
    },
    roleName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
        textTransform: 'capitalize',
    },
    roleNameSelected: {
        color: colors.primary,
    },
    roleDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    roleDescriptionSelected: {
        color: colors.primary,
    },
    filtersContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    searchBar: {
        marginBottom: 12,
    },
    categoryFilters: {
        flexDirection: 'row',
    },
    categoryFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    categoryFilterActive: {
        backgroundColor: colors.primary + '10',
        borderColor: colors.primary,
    },
    categoryFilterText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    categoryFilterTextActive: {
        color: colors.primary,
    },
    permissionsContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    categorySection: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '30',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    categoryStats: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    categoryActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryToggle: {
        padding: 4,
    },
    categoryCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryCheckboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryCheckboxPartial: {
        backgroundColor: colors.warning + '40',
        borderColor: colors.warning,
    },
    partialIndicator: {
        width: 8,
        height: 2,
        backgroundColor: colors.warning,
        borderRadius: 1,
    },
    expandIcon: {
        padding: 4,
    },
    permissionsList: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    permissionItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border + '20',
    },
    permissionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    permissionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
    },
    permissionInfo: {
        flex: 1,
    },
    permissionName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    permissionDescription: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    inheritedText: {
        fontSize: 10,
        color: colors.primary,
        fontStyle: 'italic',
        marginTop: 2,
    },
    permissionToggle: {
        paddingLeft: 8,
    },
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12,
    },
    resetButton: {
        flex: 1,
    },
    saveButton: {
        flex: 2,
    },
    summaryContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
}); 