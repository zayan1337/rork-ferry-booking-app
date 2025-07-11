import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { Users, Shield, Key, Plus, Edit, Eye, Clock, Calendar, Trash2, AlertTriangle, Settings } from "lucide-react-native";
import { colors } from "@/constants/adminColors";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
    AdminUser,
    RoleTemplate,
    PermissionCategory,
    PermissionView,
    Permission
} from "@/types/settings";
import { getPermissionLevelColor, getPermissionLevelIcon, getUserInitials } from "@/utils/settingsUtils";
import Button from "@/components/admin/Button";
import SectionHeader from "@/components/admin/SectionHeader";
import StatCard from "@/components/admin/StatCard";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import { styles } from "./styles";

interface PermissionsTabProps {
    permissionView: PermissionView;
    setPermissionView: (view: PermissionView) => void;
    adminUsers: AdminUser[];
    roleTemplates: RoleTemplate[];
    permissionCategories: PermissionCategory[];
    availablePermissions: (Permission & { categoryId: string; categoryName: string })[];
    filteredData: any[];
    stats: any;
    onDeleteRole: (roleId: string) => void;
}

export default function PermissionsTab({
    permissionView,
    setPermissionView,
    adminUsers,
    roleTemplates,
    permissionCategories,
    availablePermissions,
    filteredData,
    stats,
    onDeleteRole,
}: PermissionsTabProps) {
    const { canManagePermissions } = useAdminPermissions();

    if (!canManagePermissions()) {
        return (
            <View style={styles.noPermissionContainer}>
                <AlertTriangle size={48} color={colors.warning} />
                <Text style={styles.noPermissionText}>
                    You don't have permission to manage admin permissions.
                </Text>
            </View>
        );
    }

    const renderUsersView = () => (
        <>
            <SectionHeader
                title="Admin Users Management"
                subtitle={`${stats.activeAdminUsers} active users • Click to manage individual permissions`}
                action={
                    <Button
                        title="Add User"
                        variant="primary"
                        size="small"
                        icon={<Plus size={16} color="white" />}
                        onPress={() => {
                            // Handle add new admin user
                        }}
                    />
                }
            />

            {filteredData.length === 0 ? (
                <EmptyState
                    icon={<Users size={48} color={colors.textSecondary} />}
                    title="No admin users found"
                    message="Add admin users to manage system access"
                />
            ) : (
                <View style={styles.usersList}>
                    {(filteredData as AdminUser[]).map((user) => {
                        const userRole = roleTemplates.find(r => r.id === user.role);
                        return (
                            <TouchableOpacity
                                key={user.id}
                                style={[styles.enhancedUserCard, {
                                    borderColor: userRole?.color + "30" || colors.primary + "30"
                                }]}
                                onPress={() => {
                                    router.push(`/user/${user.id}/permissions` as any);
                                }}
                            >
                                {/* Gradient Background */}
                                <View style={[styles.cardGradient, {
                                    backgroundColor: userRole?.color + "08" || colors.primary + "08"
                                }]} />

                                <View style={styles.enhancedUserHeader}>
                                    <View style={styles.userAvatarContainer}>
                                        <View style={[styles.userAvatar, { backgroundColor: userRole?.color || colors.primary }]}>
                                            <Text style={styles.userAvatarText}>
                                                {getUserInitials(user.name)}
                                            </Text>
                                        </View>
                                        <View style={styles.userStatusBadge}>
                                            <StatusBadge
                                                status={user.status === 'active' ? 'active' : 'inactive'}
                                                size="small"
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.enhancedUserInfo}>
                                        <View style={styles.userNameRow}>
                                            <Text style={styles.userName}>{user.name}</Text>
                                            <TouchableOpacity style={styles.userActionButton}>
                                                <Edit size={14} color={colors.primary} />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.userEmail}>{user.email}</Text>
                                        <View style={styles.userRoleContainer}>
                                            <View style={[styles.roleTag, { backgroundColor: userRole?.color + "20" }]}>
                                                <Shield size={12} color={userRole?.color || colors.primary} />
                                                <Text style={[styles.roleTagText, { color: userRole?.color || colors.primary }]}>
                                                    {userRole?.name || user.role}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.enhancedUserPermissions}>
                                    <View style={styles.permissionsHeader}>
                                        <Text style={styles.permissionsLabel}>
                                            Active Permissions ({user.permissions.length})
                                        </Text>
                                        <TouchableOpacity style={styles.viewAllButton}>
                                            <Text style={styles.viewAllButtonText}>View All</Text>
                                            <Eye size={12} color={colors.primary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.enhancedPermissionTags}>
                                        {user.permissions.slice(0, 4).map((permId: string) => {
                                            const permission = availablePermissions.find(p => p.id === permId);
                                            return permission ? (
                                                <View key={permId} style={[styles.enhancedPermissionTag, { borderColor: getPermissionLevelColor(permission.level) }]}>
                                                    <Text style={styles.enhancedPermissionTagText}>{permission.name}</Text>
                                                </View>
                                            ) : null;
                                        })}
                                        {user.permissions.length > 4 && (
                                            <View style={styles.morePermissionsTag}>
                                                <Text style={styles.morePermissionsText}>+{user.permissions.length - 4}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.enhancedUserFooter}>
                                    <View style={styles.userMetrics}>
                                        <View style={styles.userMetric}>
                                            <Clock size={12} color={colors.textSecondary} />
                                            <Text style={styles.userMetricText}>
                                                Last: {new Date(user.last_login).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={styles.userMetric}>
                                            <Calendar size={12} color={colors.textSecondary} />
                                            <Text style={styles.userMetricText}>
                                                Joined: {new Date(user.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </>
    );

    const renderRolesView = () => (
        <>
            <SectionHeader
                title="Role Management"
                subtitle={`${stats.totalRoles} roles available • Create custom roles for specific access levels`}
                action={
                    <Button
                        title="Create Role"
                        variant="primary"
                        size="small"
                        icon={<Plus size={16} color="white" />}
                        onPress={() => {
                            router.push('/user/role/new' as any);
                        }}
                    />
                }
            />

            <View style={styles.rolesList}>
                {roleTemplates.map((role) => (
                    <View key={role.id} style={styles.roleCard}>
                        <View style={styles.roleHeader}>
                            <View style={styles.roleIconContainer}>
                                <View style={[styles.roleIcon, { backgroundColor: role.color + "20" }]}>
                                    <Shield size={20} color={role.color} />
                                </View>
                            </View>
                            <View style={styles.roleInfo}>
                                <Text style={styles.roleName}>{role.name}</Text>
                                <Text style={styles.roleDescription}>{role.description}</Text>
                            </View>
                            <View style={styles.roleActions}>
                                {role.isSystemRole && (
                                    <View style={styles.systemRoleBadge}>
                                        <Text style={styles.systemRoleText}>System</Text>
                                    </View>
                                )}
                                <TouchableOpacity
                                    style={styles.roleActionButton}
                                    onPress={() => {
                                        router.push(`/user/role/new?clone=${role.id}` as any);
                                    }}
                                >
                                    <Plus size={16} color={colors.primary} />
                                </TouchableOpacity>
                                {!role.isSystemRole && (
                                    <TouchableOpacity
                                        style={styles.roleActionButton}
                                        onPress={() => onDeleteRole(role.id)}
                                    >
                                        <Trash2 size={16} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.rolePermissions}>
                            <Text style={styles.rolePermissionsLabel}>
                                Permissions ({role.permissions.length})
                            </Text>
                            <View style={styles.rolePermissionsList}>
                                {role.permissions.slice(0, 6).map((permId) => {
                                    const permission = availablePermissions.find(p => p.id === permId);
                                    return permission ? (
                                        <View key={permId} style={styles.rolePermissionItem}>
                                            <Text style={styles.rolePermissionText}>{permission.name}</Text>
                                        </View>
                                    ) : null;
                                })}
                                {role.permissions.length > 6 && (
                                    <View style={styles.rolePermissionItem}>
                                        <Text style={styles.rolePermissionMore}>
                                            +{role.permissions.length - 6} more
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        <View style={styles.roleFooter}>
                            <Text style={styles.roleUsageText}>
                                {adminUsers.filter(u => u.role === role.id).length} users assigned
                            </Text>
                            <TouchableOpacity style={styles.viewRoleButton}>
                                <Text style={styles.viewRoleButtonText}>View Details</Text>
                                <Eye size={12} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </>
    );

    const renderPermissionsView = () => (
        <>
            <SectionHeader
                title="Permission Categories"
                subtitle={`${stats.totalPermissions} permissions across ${stats.permissionCategories} categories`}
            />

            <View style={styles.permissionCategoriesList}>
                {permissionCategories.map((category) => (
                    <View key={category.id} style={styles.permissionCategoryCard}>
                        <View style={styles.permissionCategoryHeader}>
                            <View style={styles.categoryIconContainer}>
                                <Settings size={20} color={colors.primary} />
                            </View>
                            <View style={styles.categoryInfo}>
                                <Text style={styles.categoryName}>{category.name}</Text>
                                <Text style={styles.categoryDescription}>{category.description}</Text>
                            </View>
                            <View style={styles.categoryStats}>
                                <Text style={styles.categoryStatsText}>
                                    {category.permissions.length} permissions
                                </Text>
                            </View>
                        </View>

                        <View style={styles.categoryPermissions}>
                            {category.permissions.map((permission) => (
                                <View key={permission.id} style={styles.permissionDetailItem}>
                                    <View style={styles.permissionDetailHeader}>
                                        <View style={styles.permissionLevelBadge}>
                                            <Text style={[styles.permissionLevelText, { color: getPermissionLevelColor(permission.level) }]}>
                                                {permission.level.toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.permissionDetailName}>{permission.name}</Text>
                                    </View>
                                    <Text style={styles.permissionDetailDescription}>
                                        {permission.description}
                                    </Text>
                                    <View style={styles.permissionUsage}>
                                        <Text style={styles.permissionUsageText}>
                                            Used by {adminUsers.filter(u => u.permissions.includes(permission.id)).length} users
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        </>
    );

    return (
        <View style={styles.tabContent}>
            {/* Enhanced Permission Statistics */}
            <View style={styles.statsContainer}>
                <StatCard
                    title="Admin Users"
                    value={stats.totalAdminUsers.toString()}
                    icon={<Users size={20} color={colors.primary} />}
                    trend="up"
                    trendValue={`${stats.activeAdminUsers} active`}
                />
                <StatCard
                    title="Permission Roles"
                    value={stats.totalRoles.toString()}
                    icon={<Shield size={20} color={colors.secondary} />}
                    trend="neutral"
                    trendValue={`${stats.customRoles} custom`}
                />
                <StatCard
                    title="Permission Categories"
                    value={stats.permissionCategories.toString()}
                    icon={<Settings size={20} color={colors.warning} />}
                    trend="neutral"
                    trendValue={`${stats.totalPermissions} total`}
                />
            </View>

            {/* Enhanced Permission Management Navigation */}
            <View style={styles.permissionNavContainer}>
                <View style={styles.permissionNavTabs}>
                    {[
                        { key: "users", label: "Users", icon: <Users size={16} color={permissionView === "users" ? colors.primary : colors.textSecondary} /> },
                        { key: "roles", label: "Roles", icon: <Shield size={16} color={permissionView === "roles" ? colors.primary : colors.textSecondary} /> },
                        { key: "permissions", label: "Permissions", icon: <Key size={16} color={permissionView === "permissions" ? colors.primary : colors.textSecondary} /> }
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.permissionNavTab,
                                permissionView === tab.key && styles.permissionNavTabActive
                            ]}
                            onPress={() => setPermissionView(tab.key as PermissionView)}
                        >
                            {tab.icon}
                            <Text style={[
                                styles.permissionNavTabText,
                                permissionView === tab.key && styles.permissionNavTabTextActive
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Render the appropriate view */}
            {permissionView === "users" && renderUsersView()}
            {permissionView === "roles" && renderRolesView()}
            {permissionView === "permissions" && renderPermissionsView()}
        </View>
    );
} 