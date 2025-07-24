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
    Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
    Shield,
    Users,
    Key,
    Star,
    Activity,
    Zap,
    Settings,
    Crown,
    UserCheck,
    UserX,
    Trash2,
    Plus,
    Filter,
    ArrowRight,
    Eye,
    User,
    Calendar,
    Clock,
    Search,
    SortAsc,
    SortDesc,
    TrendingUp,
    Grid3x3,
    List,
    MoreHorizontal,
    FileText,
    Layers,
    Database,
    AlertTriangle,
    MapPin,
} from 'lucide-react-native';
import { usePermissionStore } from '@/store/admin/permissionStore';
import colors from '@/constants/colors';
import { colors as adminColors } from '@/constants/adminColors';
import { Permission, AdminUser, PermissionLevel, PermissionCategory, UserRole, SuperAdminCapabilities, PermissionTemplate, PermissionAuditLog } from '@/types/permissions';
import SearchBar from '@/components/admin/SearchBar';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/admin/Dropdown';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import EmptyState from '@/components/admin/EmptyState';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import AdminUserItem from '@/components/admin/AdminUserItem';
import SectionHeader from '@/components/admin/SectionHeader';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

type PermissionTab = 'admins' | 'audit' | 'templates' | 'bulk';

interface PermissionsTabProps {
    permissionView: PermissionView;
    setPermissionView: (view: PermissionView) => void;
    searchQuery?: string;
}

type PermissionView = 'overview' | 'users' | 'permissions' | 'roles' | 'templates' | 'audit' | 'bulk';

export default function PermissionsTab({ permissionView, setPermissionView, searchQuery }: PermissionsTabProps) {
    const {
        users: admins,
        permissions,
        templates,
        audit_logs,
        bulk_operations,
        stats,
        loading,
        error,
        fetchUsers,
        fetchPermissions,
        fetchTemplates,
        fetchAuditLogs,
        fetchBulkOperations,
    } = usePermissionStore();

    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<PermissionTab>('admins');
    const [searchQueryLocal, setSearchQueryLocal] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'permissions' | 'lastLogin'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [filterRole, setFilterRole] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<boolean | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Fetch data on mount
    useEffect(() => {
        fetchUsers();
        fetchPermissions();
        fetchTemplates();
        fetchAuditLogs();
        fetchBulkOperations();
    }, []);

    // Handle refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchUsers(),
                fetchPermissions(),
                fetchTemplates(),
                fetchAuditLogs(),
                fetchBulkOperations(),
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [fetchUsers, fetchPermissions, fetchTemplates, fetchAuditLogs, fetchBulkOperations]);

    // Handle admin selection - navigate to user permissions page
    const handleAdminPress = (adminId: string) => {
        router.push(`/user/${adminId}/permissions` as any);
    };

    // Handle view all admins
    const handleViewAllAdmins = () => {
        router.push('/admin-permissions' as any);
    };

    // Toggle sort
    const toggleSort = (field: typeof sortBy) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Filter and sort admins
    const filteredAndSortedAdmins = useMemo(() => {
        let filtered = admins;

        // Apply search filter
        if (searchQueryLocal) {
            filtered = filtered.filter(admin =>
                admin.full_name.toLowerCase().includes(searchQueryLocal.toLowerCase()) ||
                admin.email.toLowerCase().includes(searchQueryLocal.toLowerCase())
            );
        }

        // Apply role filter
        if (filterRole) {
            if (filterRole === 'super_admin') {
                filtered = filtered.filter(admin => admin.is_super_admin);
            } else {
                filtered = filtered.filter(admin => admin.role === filterRole && !admin.is_super_admin);
            }
        }

        // Apply status filter
        if (filterStatus !== null) {
            filtered = filtered.filter(admin => admin.is_active === filterStatus);
        }

        // Sort
        filtered.sort((a, b) => {
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

            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [admins, searchQueryLocal, filterRole, filterStatus, sortBy, sortOrder]);

    // Create preview items (first 4 items) for admins tab
    const previewAdmins = useMemo(() => {
        return filteredAndSortedAdmins.slice(0, 4);
    }, [filteredAndSortedAdmins]);

    // Get stats for display
    const totalAdmins = stats?.total_users || admins.length;
    const activeAdmins = admins.filter(a => a.is_active).length;
    const superAdminCount = stats?.security_metrics?.super_admin_count || admins.filter(a => a.is_super_admin).length;
    const totalPermissions = stats?.total_permissions || permissions.length;

    if (loading.users && admins.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading admin users...</Text>
            </View>
        );
    }

    const renderAdminItem = ({ item, index }: { item: AdminUser; index: number }) => (
        <AdminUserItem
            key={item.id}
            admin={item}
            onPress={handleAdminPress}
        />
    );

    const renderHeader = () => (
        <View style={styles.sectionContent}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                    <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionIcon}>
                            <Shield size={20} color={adminColors.primary} />
                        </View>
                        <View>
                            <Text style={styles.sectionTitle}>Permissions Management</Text>
                            <Text style={styles.sectionSubtitle}>{totalAdmins} admin users available</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'admins' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('admins')}
                >
                    <Users size={16} color={activeTab === 'admins' ? adminColors.primary : adminColors.textSecondary} />
                    <Text style={[styles.tabButtonText, activeTab === 'admins' && styles.tabButtonTextActive]}>
                        Admin List
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'audit' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('audit')}
                >
                    <FileText size={16} color={activeTab === 'audit' ? adminColors.primary : adminColors.textSecondary} />
                    <Text style={[styles.tabButtonText, activeTab === 'audit' && styles.tabButtonTextActive]}>
                        Audit Logs
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'templates' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('templates')}
                >
                    <Layers size={16} color={activeTab === 'templates' ? adminColors.primary : adminColors.textSecondary} />
                    <Text style={[styles.tabButtonText, activeTab === 'templates' && styles.tabButtonTextActive]}>
                        Templates
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'bulk' && styles.tabButtonActive]}
                    onPress={() => setActiveTab('bulk')}
                >
                    <Database size={16} color={activeTab === 'bulk' ? adminColors.primary : adminColors.textSecondary} />
                    <Text style={[styles.tabButtonText, activeTab === 'bulk' && styles.tabButtonTextActive]}>
                        Bulk Operations
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
                <Users size={48} color={adminColors.textSecondary} />
            </View>
            <Text style={styles.emptyStateTitle}>No admin users found</Text>
            <Text style={styles.emptyStateText}>
                {searchQueryLocal ? 'Try adjusting your search terms' : 'No admin users available'}
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (filteredAndSortedAdmins.length <= 4) return null; // Don't show footer if all items are displayed

        return (
            <View style={styles.footerContainer}>
                <Text style={styles.previewText}>
                    Showing {previewAdmins.length} of {filteredAndSortedAdmins.length} admin users
                </Text>
                <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={handleViewAllAdmins}
                >
                    <Text style={styles.viewAllText}>View All Admins</Text>
                    <Users size={16} color={adminColors.primary} />
                </TouchableOpacity>
            </View>
        );
    };

    // Render audit log item
    const renderAuditLogItem = ({ item }: { item: PermissionAuditLog }) => (
        <View style={styles.auditLogItem}>
            <View style={styles.auditLogHeader}>
                <View style={styles.auditLogIcon}>
                    {item.action_type === 'GRANT' && <UserCheck size={16} color={adminColors.success} />}
                    {item.action_type === 'REVOKE' && <UserX size={16} color={adminColors.danger} />}
                    {item.action_type === 'CREATE' && <Plus size={16} color={adminColors.primary} />}
                    {item.action_type === 'UPDATE' && <Settings size={16} color={adminColors.warning} />}
                    {item.action_type === 'DELETE' && <Trash2 size={16} color={adminColors.danger} />}
                </View>
                <View style={styles.auditLogInfo}>
                    <Text style={styles.auditLogAction}>
                        {item.action_description || `${item.action_type} ${item.entity_description || item.entity_type.replace('_', ' ')}`}
                    </Text>
                    <Text style={styles.auditLogUser}>
                        by {item.performed_by_user?.full_name || 'Unknown User'}
                    </Text>
                    {item.target_user && (
                        <Text style={styles.auditLogTarget}>
                            Target: {item.target_user.full_name}
                        </Text>
                    )}
                    {item.permission && (
                        <Text style={styles.auditLogPermission}>
                            Permission: {item.permission.name}
                        </Text>
                    )}
                </View>
                <View style={styles.auditLogTime}>
                    <Text style={styles.auditLogTimeText}>
                        {item.time_ago || new Date(item.performed_at).toLocaleDateString()}
                    </Text>
                    <Text style={styles.auditLogTimeDetail}>
                        {item.formatted_time || new Date(item.performed_at).toLocaleTimeString()}
                    </Text>
                </View>
            </View>
            {item.reason && (
                <View style={styles.auditLogReason}>
                    <Text style={styles.auditLogReasonLabel}>Reason:</Text>
                    <Text style={styles.auditLogReasonText}>{item.reason}</Text>
                </View>
            )}
        </View>
    );

    // Render template item
    const renderTemplateItem = ({ item }: { item: PermissionTemplate }) => (
        <View style={styles.templateItem}>
            <View style={styles.templateHeader}>
                <View style={[styles.templateColor, { backgroundColor: item.color }]} />
                <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{item.name}</Text>
                    <Text style={styles.templateDescription}>{item.description}</Text>
                    {item.created_by_name && (
                        <Text style={styles.templateCreator}>
                            Created by {item.created_by_name}
                        </Text>
                    )}
                </View>
                <View style={styles.templateStats}>
                    <View style={styles.templateCount}>
                        <Shield size={14} color={adminColors.textSecondary} />
                        <Text style={styles.templateCountText}>{item.permission_count} permissions</Text>
                    </View>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.is_active ? adminColors.successLight : adminColors.dangerLight }
                    ]}>
                        <Text style={[
                            styles.statusBadgeText,
                            { color: item.is_active ? adminColors.success : adminColors.danger }
                        ]}>
                            {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    {item.is_system_template && (
                        <View style={[styles.systemBadge, { backgroundColor: adminColors.primaryLight }]}>
                            <Crown size={10} color={adminColors.primary} />
                            <Text style={[styles.systemBadgeText, { color: adminColors.primary }]}>
                                System
                            </Text>
                        </View>
                    )}
                </View>
            </View>
            <View style={styles.templateFooter}>
                <Text style={styles.templateDate}>
                    Created {new Date(item.created_at).toLocaleDateString()}
                </Text>
                {item.updated_at !== item.created_at && (
                    <Text style={styles.templateDate}>
                        Updated {new Date(item.updated_at).toLocaleDateString()}
                    </Text>
                )}
            </View>
        </View>
    );

    // Render bulk operation item
    const renderBulkOperationItem = ({ item }: { item: any }) => (
        <View style={styles.bulkOperationItem}>
            <View style={styles.bulkOperationHeader}>
                <View style={styles.bulkOperationIcon}>
                    {item.operation_type === 'grant' && <UserCheck size={16} color={adminColors.success} />}
                    {item.operation_type === 'revoke' && <UserX size={16} color={adminColors.danger} />}
                    {item.operation_type === 'template' && <Shield size={16} color={adminColors.primary} />}
                </View>
                <View style={styles.bulkOperationInfo}>
                    <Text style={styles.bulkOperationTitle}>
                        {item.operation_type === 'grant' && 'Bulk Permission Grant'}
                        {item.operation_type === 'revoke' && 'Bulk Permission Revoke'}
                        {item.operation_type === 'template' && 'Template Application'}
                    </Text>
                    <Text style={styles.bulkOperationSubtitle}>
                        {item.total_users} users • {item.completed_users} completed • {item.failed_users} failed
                    </Text>
                    {item.template_name && (
                        <Text style={styles.bulkOperationTemplate}>
                            Template: {item.template_name}
                        </Text>
                    )}
                    {item.reason && (
                        <Text style={styles.bulkOperationReason}>
                            Reason: {item.reason}
                        </Text>
                    )}
                </View>
                <View style={styles.bulkOperationStatus}>
                    <View style={[
                        styles.statusBadge,
                        {
                            backgroundColor:
                                item.status === 'completed' ? adminColors.successLight :
                                    item.status === 'failed' ? adminColors.dangerLight :
                                        item.status === 'in_progress' ? adminColors.warningLight :
                                            adminColors.secondaryLight
                        }
                    ]}>
                        <Text style={[
                            styles.statusBadgeText,
                            {
                                color:
                                    item.status === 'completed' ? adminColors.success :
                                        item.status === 'failed' ? adminColors.danger :
                                            item.status === 'in_progress' ? adminColors.warning :
                                                adminColors.textSecondary
                            }
                        ]}>
                            {item.status === 'completed' ? 'Completed' :
                                item.status === 'failed' ? 'Failed' :
                                    item.status === 'in_progress' ? 'In Progress' :
                                        'Pending'}
                        </Text>
                    </View>
                    <Text style={styles.bulkOperationTime}>
                        {new Date(item.performed_at).toLocaleDateString()}
                    </Text>
                </View>
            </View>
            {item.progress_percentage !== undefined && item.progress_percentage < 100 && (
                <View style={styles.bulkOperationProgress}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${item.progress_percentage}%`,
                                    backgroundColor: item.status === 'failed' ? adminColors.danger : adminColors.primary
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{item.progress_percentage}%</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            {activeTab === 'admins' && (
                <FlatList
                    data={previewAdmins}
                    renderItem={renderAdminItem}
                    keyExtractor={(item) => `admin-${item.id}`}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmptyState}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[adminColors.primary]}
                            tintColor={adminColors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {activeTab === 'audit' && (
                <FlatList
                    data={audit_logs}
                    renderItem={renderAuditLogItem}
                    keyExtractor={(item) => `audit-${item.id}`}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <EmptyState
                            icon={<FileText size={48} color={adminColors.textSecondary} />}
                            title="No Audit Logs"
                            message="No audit logs found. Permission changes will appear here."
                        />
                    }
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[adminColors.primary]}
                            tintColor={adminColors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {activeTab === 'templates' && (
                <FlatList
                    data={templates}
                    renderItem={renderTemplateItem}
                    keyExtractor={(item) => `template-${item.id}`}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <EmptyState
                            icon={<Layers size={48} color={adminColors.textSecondary} />}
                            title="No Templates"
                            message="No permission templates found. Create templates to manage permission sets."
                        />
                    }
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[adminColors.primary]}
                            tintColor={adminColors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {activeTab === 'bulk' && (
                <FlatList
                    data={bulk_operations}
                    renderItem={renderBulkOperationItem}
                    keyExtractor={(item, index) => `bulk-${index}`}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={
                        <EmptyState
                            icon={<Database size={48} color={adminColors.textSecondary} />}
                            title="No Bulk Operations"
                            message="No bulk operations found. Bulk permission changes will appear here."
                        />
                    }
                    contentContainerStyle={styles.contentContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={[adminColors.primary]}
                            tintColor={adminColors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Error Display */}
            {error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
    },
    sectionContent: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        minHeight: 44,
        paddingHorizontal: 4,
    },
    sectionHeaderContent: {
        flex: 1,
        paddingRight: 8,
    },
    sectionHeaderButton: {
        flexShrink: 0,
        maxWidth: "40%",
    },
    sectionTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionIcon: {
        padding: 8,
        backgroundColor: adminColors.primary + "10",
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: adminColors.text,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: adminColors.textSecondary,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: adminColors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: adminColors.border,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 6,
    },
    tabButtonActive: {
        backgroundColor: adminColors.primaryLight,
    },
    tabButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: adminColors.textSecondary,
    },
    tabButtonTextActive: {
        color: adminColors.primary,
    },
    itemSeparator: {
        height: 12,
    },
    footerContainer: {
        paddingVertical: 24,
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: adminColors.primary + "10",
        borderRadius: 8,
        gap: 8,
        minWidth: 200,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: "500",
        color: adminColors.primary,
    },
    previewText: {
        fontSize: 14,
        color: adminColors.textSecondary,
        textAlign: "center",
        marginBottom: 12,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 64,
        gap: 16,
    },
    emptyStateIcon: {
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: adminColors.textSecondary + "10",
        borderRadius: 24,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: adminColors.text,
    },
    emptyStateText: {
        fontSize: 14,
        color: adminColors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: adminColors.textSecondary,
    },
    errorContainer: {
        backgroundColor: adminColors.dangerLight,
        padding: 16,
        margin: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: adminColors.danger + '20',
    },
    errorText: {
        fontSize: 14,
        color: adminColors.danger,
        textAlign: 'center',
    },
    // Audit Log Styles
    auditLogItem: {
        backgroundColor: adminColors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: adminColors.border,
    },
    auditLogHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    auditLogIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: adminColors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    auditLogInfo: {
        flex: 1,
    },
    auditLogAction: {
        fontSize: 14,
        fontWeight: '600',
        color: adminColors.text,
    },
    auditLogUser: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    auditLogTarget: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    auditLogPermission: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    auditLogTime: {
        alignItems: 'flex-end',
    },
    auditLogTimeText: {
        fontSize: 12,
        fontWeight: '600',
        color: adminColors.text,
    },
    auditLogTimeDetail: {
        fontSize: 10,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    auditLogReason: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 4,
    },
    auditLogReasonLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: adminColors.text,
    },
    auditLogReasonText: {
        fontSize: 12,
        color: adminColors.textSecondary,
        flex: 1,
    },
    // Template Styles
    templateItem: {
        backgroundColor: adminColors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: adminColors.border,
    },
    templateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    templateColor: {
        width: 4,
        height: 40,
        borderRadius: 2,
    },
    templateInfo: {
        flex: 1,
    },
    templateName: {
        fontSize: 16,
        fontWeight: '600',
        color: adminColors.text,
    },
    templateDescription: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    templateCreator: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    templateStats: {
        alignItems: 'flex-end',
        gap: 4,
    },
    templateCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    templateCountText: {
        fontSize: 12,
        color: adminColors.textSecondary,
    },
    templateFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: adminColors.border,
    },
    templateDate: {
        fontSize: 12,
        color: adminColors.textSecondary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    systemBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    systemBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    // Bulk Operation Styles
    bulkOperationItem: {
        backgroundColor: adminColors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: adminColors.border,
    },
    bulkOperationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bulkOperationIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: adminColors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bulkOperationInfo: {
        flex: 1,
    },
    bulkOperationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: adminColors.text,
    },
    bulkOperationSubtitle: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    bulkOperationTemplate: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    bulkOperationReason: {
        fontSize: 12,
        color: adminColors.textSecondary,
        marginTop: 2,
    },
    bulkOperationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    bulkOperationTime: {
        fontSize: 12,
        color: adminColors.textSecondary,
    },
    bulkOperationProgress: {
        marginTop: 12,
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 8,
        backgroundColor: adminColors.border,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: adminColors.text,
        marginTop: 8,
    },
}); 