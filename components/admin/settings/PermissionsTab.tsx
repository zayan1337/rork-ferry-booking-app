import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  Users,
  Shield,
  Key,
  Edit,
  Eye,
  Trash2,
  AlertTriangle,
  Settings,
  Crown,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { usePermissionStore } from '@/store/admin/permissionStore';
import { AdminManagement } from '@/types';
import Button from '@/components/admin/Button';
import SectionHeader from '@/components/admin/SectionHeader';
import StatCard from '@/components/admin/StatCard';
import EmptyState from '@/components/admin/EmptyState';
import StatusBadge from '@/components/admin/StatusBadge';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import { styles } from './styles';

// Use types from management types
type AdminUser = AdminManagement.AdminUser;
type RoleTemplate = AdminManagement.RoleTemplate;
type PermissionCategory = AdminManagement.PermissionCategory;
type Permission = AdminManagement.Permission;

// Local types for the tab views
type PermissionView = 'users' | 'roles' | 'permissions';

// Predefined colors for role templates
const ROLE_TEMPLATE_COLORS: Record<string, string> = {
  'Super Administrator': '#DC2626',
  'Operations Manager': '#2563EB',
  'Customer Service': '#059669',
  'Financial Officer': '#D97706',
  'Content Manager': '#7C3AED',
  default: colors.primary,
};

const getTemplateColor = (templateName: string): string => {
  return ROLE_TEMPLATE_COLORS[templateName] || ROLE_TEMPLATE_COLORS.default;
};

const getPermissionLevelColor = (level: string): string => {
  switch (level) {
    case 'read':
      return colors.info;
    case 'write':
      return colors.warning;
    case 'delete':
      return colors.danger;
    case 'admin':
      return colors.primaryDark;
    default:
      return colors.textSecondary;
  }
};

const getUserInitials = (name: string): string => {
  return (
    name
      .split(' ')
      .filter(n => n)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  );
};

export default function PermissionsTab() {
  const { canManagePermissions } = useAdminPermissions();
  const [permissionView, setPermissionView] = useState<PermissionView>('users');

  const {
    data: permissions,
    categories,
    roleTemplates,
    adminUsers,
    loading,
    error,
    fetchAll,
    clearError,
  } = usePermissionStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Calculate display stats
  const displayStats = useMemo(
    () => ({
      totalUsers: adminUsers.length,
      activeUsers: adminUsers.filter(u => u.is_active).length,
      usersWithPermissions: adminUsers.filter(
        u => (u.direct_permissions?.length || 0) > 0
      ).length,
      totalRoles: roleTemplates.length,
      activeRoles: roleTemplates.filter(r => r.is_active).length,
      totalPermissions: permissions.length,
      activePermissions: permissions.filter(p => p.is_active).length,
    }),
    [adminUsers, roleTemplates, permissions]
  );

  const handleDeleteRole = (roleId: string) => {
    Alert.alert(
      'Delete Role Template',
      'Are you sure you want to delete this role template? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement role deletion
          },
        },
      ]
    );
  };

  if (!canManagePermissions()) {
    return (
      <View style={styles.noPermissionContainer}>
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to manage user permissions and roles.
        </Text>
      </View>
    );
  }

  if (loading.fetchAll) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <LoadingSpinner />
        <Text style={{ marginTop: 10, color: colors.textSecondary }}>
          Loading permissions...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: 'center', alignItems: 'center', padding: 20 },
        ]}
      >
        <AlertTriangle size={48} color={colors.danger} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: colors.text,
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          Error Loading Permissions
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          {error}
        </Text>
        <Button
          title='Retry'
          onPress={() => {
            clearError();
            fetchAll();
          }}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const renderUsersView = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={loading.fetchAll}
          onRefresh={fetchAll}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <SectionHeader
        title={`Admin Users (${adminUsers.length})`}
        subtitle='Manage user permissions and roles'
      />

      <View style={styles.statsContainer}>
        <StatCard
          title='Total Users'
          value={displayStats.totalUsers.toString()}
          icon={<Users size={20} color={colors.primary} />}
          color={colors.primary}
        />
        <StatCard
          title='Active Users'
          value={displayStats.activeUsers.toString()}
          icon={<Eye size={20} color={colors.success} />}
          color={colors.success}
        />
        <StatCard
          title='With Permissions'
          value={displayStats.usersWithPermissions.toString()}
          icon={<Key size={20} color={colors.warning} />}
          color={colors.warning}
        />
      </View>

      {adminUsers.length === 0 ? (
        <EmptyState
          icon={<Users size={48} color={colors.textSecondary} />}
          title='No Admin Users'
          message='No admin users found in the system.'
        />
      ) : (
        <View style={styles.usersList}>
          {adminUsers.map((user: AdminUser) => (
            <Pressable
              key={user.id}
              style={styles.modernUserCard}
              onPress={() => {
                router.push(`../user/${user.id}/permissions` as any);
              }}
            >
              {/* Card Header */}
              <View style={styles.userCardHeader}>
                <View style={styles.userAvatarContainer}>
                  <View
                    style={[
                      styles.userAvatar,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.userAvatarText}>
                      {getUserInitials(user.full_name)}
                    </Text>
                  </View>
                  {user.is_super_admin && (
                    <View style={styles.superAdminBadge}>
                      <Crown size={10} color={colors.warning} />
                    </View>
                  )}
                </View>

                <View style={styles.userMainInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.full_name}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>

                <View style={styles.userStatusContainer}>
                  <StatusBadge
                    status={user.is_active ? 'active' : 'inactive'}
                    size='small'
                  />
                </View>
              </View>

              {/* Card Content */}
              <View style={styles.userCardContent}>
                <View style={styles.userMetadata}>
                  <View style={styles.roleContainer}>
                    <Shield size={12} color={colors.primary} />
                    <Text style={styles.roleText}>{user.role}</Text>
                  </View>

                  <View style={styles.permissionCount}>
                    <Key size={12} color={colors.warning} />
                    <Text style={styles.permissionCountText}>
                      {user.direct_permissions?.length || 0} permissions
                    </Text>
                  </View>
                </View>

                {user.is_super_admin && (
                  <View style={styles.superAdminNote}>
                    <Text style={styles.superAdminNoteText}>
                      Has full system access
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Indicator */}
              <View style={styles.actionIndicator}>
                <ChevronRight size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRolesView = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl
          refreshing={loading.fetchAll}
          onRefresh={fetchAll}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <SectionHeader
        title={`Role Templates (${roleTemplates.length})`}
        subtitle='Predefined permission sets for different user types'
      />

      <View style={styles.statsContainer}>
        <StatCard
          title='Total Roles'
          value={displayStats.totalRoles.toString()}
          icon={<Shield size={20} color={colors.primary} />}
          color={colors.primary}
        />
        <StatCard
          title='Active Roles'
          value={displayStats.activeRoles.toString()}
          icon={<Eye size={20} color={colors.success} />}
          color={colors.success}
        />
      </View>

      {roleTemplates.length === 0 ? (
        <EmptyState
          icon={<Shield size={48} color={colors.textSecondary} />}
          title='No Role Templates'
          message='No role templates have been created yet.'
        />
      ) : (
        <View style={styles.rolesList}>
          {roleTemplates.map((template: RoleTemplate) => (
            <View key={template.id} style={styles.modernRoleCard}>
              <View style={styles.roleCardHeader}>
                <View style={styles.roleIconContainer}>
                  <View
                    style={[
                      styles.roleIcon,
                      {
                        backgroundColor: `${getTemplateColor(template.name)}20`,
                      },
                    ]}
                  >
                    <Shield size={20} color={getTemplateColor(template.name)} />
                  </View>
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{template.name}</Text>
                  <Text style={styles.roleDescription}>
                    {template.description}
                  </Text>
                </View>
                <View style={styles.roleActions}>
                  <Pressable style={styles.roleActionButton}>
                    <Edit size={16} color={colors.textSecondary} />
                  </Pressable>
                  {!template.is_system_role && (
                    <Pressable
                      style={styles.roleActionButton}
                      onPress={() => handleDeleteRole(template.id)}
                    >
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.roleCardContent}>
                <View style={styles.roleMetadata}>
                  <View style={styles.permissionCountBadge}>
                    <Key size={12} color={colors.primary} />
                    <Text style={styles.permissionCountBadgeText}>
                      {template.permission_ids?.length || 0} permissions
                    </Text>
                  </View>

                  {template.is_system_role && (
                    <View style={styles.systemRoleBadge}>
                      <Settings size={10} color={colors.info} />
                      <Text style={styles.systemRoleText}>System</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderPermissionsView = () => {
    // Group permissions by category
    const permissionsByCategory = categories.map(category => ({
      ...category,
      permissions: permissions.filter(p => p.category_id === category.id),
    }));

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={loading.fetchAll}
            onRefresh={fetchAll}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <SectionHeader
          title={`Permissions (${permissions.length})`}
          subtitle='System permissions organized by category'
        />

        <View style={styles.statsContainer}>
          <StatCard
            title='Total Permissions'
            value={displayStats.totalPermissions.toString()}
            icon={<Key size={20} color={colors.primary} />}
            color={colors.primary}
          />
          <StatCard
            title='Active Permissions'
            value={displayStats.activePermissions.toString()}
            icon={<Eye size={20} color={colors.success} />}
            color={colors.success}
          />
          <StatCard
            title='Categories'
            value={categories.length.toString()}
            icon={<Settings size={20} color={colors.warning} />}
            color={colors.warning}
          />
        </View>

        {permissionsByCategory.length === 0 ? (
          <EmptyState
            icon={<Key size={48} color={colors.textSecondary} />}
            title='No Permissions'
            message='No permissions have been configured yet.'
          />
        ) : (
          <View style={styles.permissionCategoriesList}>
            {permissionsByCategory.map((category: any) => (
              <View key={category.id} style={styles.modernCategoryCard}>
                <View style={styles.categoryCardHeader}>
                  <View style={styles.categoryIconContainer}>
                    <Settings size={20} color={colors.primary} />
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDescription}>
                      {category.description}
                    </Text>
                  </View>
                  <View style={styles.categoryStats}>
                    <Text style={styles.categoryStatsText}>
                      {category.permissions.length} permissions
                    </Text>
                  </View>
                </View>

                <View style={styles.categoryPermissions}>
                  {category.permissions
                    .slice(0, 3)
                    .map((permission: Permission) => (
                      <View
                        key={permission.id}
                        style={styles.permissionPreview}
                      >
                        <View style={styles.permissionLevelBadge}>
                          <Text
                            style={[
                              styles.permissionLevelText,
                              {
                                color: getPermissionLevelColor(
                                  permission.level
                                ),
                              },
                            ]}
                          >
                            {permission.level.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.permissionPreviewName}>
                          {permission.name}
                        </Text>
                      </View>
                    ))}
                  {category.permissions.length > 3 && (
                    <Text style={styles.morePermissionsText}>
                      +{category.permissions.length - 3} more permissions
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderTabSelector = () => (
    <View style={styles.permissionNavContainer}>
      <View style={styles.permissionNavTabs}>
        {[
          { key: 'users', label: 'Users', icon: Users },
          { key: 'roles', label: 'Roles', icon: Shield },
          { key: 'permissions', label: 'Permissions', icon: Key },
        ].map(tab => {
          const IconComponent = tab.icon;
          const isActive = permissionView === tab.key;

          return (
            <Pressable
              key={tab.key}
              style={[
                styles.permissionNavTab,
                isActive && styles.permissionNavTabActive,
              ]}
              onPress={() => setPermissionView(tab.key as PermissionView)}
            >
              <IconComponent
                size={16}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.permissionNavTabText,
                  isActive && styles.permissionNavTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderTabContent = () => {
    switch (permissionView) {
      case 'users':
        return renderUsersView();
      case 'roles':
        return renderRolesView();
      case 'permissions':
        return renderPermissionsView();
      default:
        return renderUsersView();
    }
  };

  return (
    <View style={styles.tabContent}>
      {/* Enhanced Permission Statistics */}
      <View style={styles.statsContainer}>
        <StatCard
          title='Admin Users'
          value={displayStats.totalUsers.toString()}
          icon={<Users size={20} color={colors.primary} />}
          trend='up'
          trendValue={`${displayStats.activeUsers} active`}
        />
        <StatCard
          title='Permission Roles'
          value={displayStats.totalRoles.toString()}
          icon={<Shield size={20} color={colors.secondary} />}
          trend='neutral'
          trendValue={`${displayStats.activeRoles} active`}
        />
        <StatCard
          title='Total Permissions'
          value={displayStats.totalPermissions.toString()}
          icon={<Settings size={20} color={colors.warning} />}
          trend='neutral'
          trendValue={`${categories.length} categories`}
        />
      </View>

      {renderTabSelector()}
      {renderTabContent()}
    </View>
  );
}
