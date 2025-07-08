import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth';
import { usePermissions } from './usePermissions';
import { PERMISSIONS, PermissionName } from '@/types/permissions';

export const useRoleAccess = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { hasPermission, hasAnyPermission, isSuperAdmin } = usePermissions();

    const hasRole = (allowedRoles: UserRole[]): boolean => {
        if (!isAuthenticated || !user?.profile) {
            return false;
        }
        return allowedRoles.includes(user.profile.role);
    };

    const isCustomer = (): boolean => {
        return hasRole(['customer']);
    };

    const isAgent = (): boolean => {
        return hasRole(['agent']);
    };

    const isAdmin = (): boolean => {
        return hasRole(['admin']);
    };

    const isCaptain = (): boolean => {
        return hasRole(['captain']);
    };

    const isStaff = (): boolean => {
        return hasRole(['agent', 'admin', 'captain']);
    };

    // Enhanced permission-based access checks
    const canAccessAdminPortal = (): boolean => {
        return isAdmin() && hasPermission(PERMISSIONS.DASHBOARD_VIEW).hasPermission;
    };

    const canAccessCustomerPortal = (): boolean => {
        return isCustomer();
    };

    const canAccessAgentPortal = (): boolean => {
        return isStaff();
    };

    // Tab-level access controls
    const canAccessDashboard = (): boolean => {
        return hasPermission(PERMISSIONS.DASHBOARD_VIEW).hasPermission;
    };

    const canAccessBookingsTab = (): boolean => {
        return hasPermission(PERMISSIONS.BOOKINGS_VIEW).hasPermission;
    };

    const canAccessScheduleTab = (): boolean => {
        return hasPermission(PERMISSIONS.SCHEDULE_VIEW).hasPermission;
    };

    const canAccessVesselsTab = (): boolean => {
        return hasPermission(PERMISSIONS.VESSELS_VIEW).hasPermission;
    };

    const canAccessRoutesTab = (): boolean => {
        return hasPermission(PERMISSIONS.ROUTES_VIEW).hasPermission;
    };

    const canAccessUsersTab = (): boolean => {
        return hasPermission(PERMISSIONS.USERS_VIEW).hasPermission;
    };

    // Permission-based feature access
    const canManageUsers = (): boolean => {
        return hasAnyPermission([
            PERMISSIONS.USERS_VIEW,
            PERMISSIONS.USERS_CREATE,
            PERMISSIONS.USERS_EDIT,
            PERMISSIONS.USERS_DELETE
        ]);
    };

    const canManageBookings = (): boolean => {
        return hasAnyPermission([
            PERMISSIONS.BOOKINGS_VIEW,
            PERMISSIONS.BOOKINGS_CREATE,
            PERMISSIONS.BOOKINGS_EDIT,
            PERMISSIONS.BOOKINGS_CANCEL
        ]);
    };

    const canManageVessels = (): boolean => {
        return hasAnyPermission([
            PERMISSIONS.VESSELS_VIEW,
            PERMISSIONS.VESSELS_CREATE,
            PERMISSIONS.VESSELS_EDIT,
            PERMISSIONS.VESSELS_DELETE
        ]);
    };

    const canManageRoutes = (): boolean => {
        return hasAnyPermission([
            PERMISSIONS.ROUTES_VIEW,
            PERMISSIONS.ROUTES_CREATE,
            PERMISSIONS.ROUTES_EDIT,
            PERMISSIONS.ROUTES_DELETE
        ]);
    };

    const canManageSchedule = (): boolean => {
        return hasAnyPermission([
            PERMISSIONS.SCHEDULE_VIEW,
            PERMISSIONS.SCHEDULE_CREATE,
            PERMISSIONS.SCHEDULE_EDIT,
            PERMISSIONS.SCHEDULE_DELETE
        ]);
    };

    const canViewReports = (): boolean => {
        return hasAnyPermission([
            PERMISSIONS.REPORTS_VIEW_BASIC,
            PERMISSIONS.REPORTS_VIEW_ADVANCED
        ]);
    };

    const canManagePermissions = (): boolean => {
        return isSuperAdmin && hasPermission(PERMISSIONS.SYSTEM_MANAGE_PERMISSIONS).hasPermission;
    };

    const canPerformEmergencyActions = (): boolean => {
        return hasPermission(PERMISSIONS.SYSTEM_EMERGENCY_ACTIONS).hasPermission;
    };

    // Check specific permission
    const checkPermission = (permissionName: PermissionName): boolean => {
        return hasPermission(permissionName).hasPermission;
    };

    const getCurrentUserRole = (): UserRole | null => {
        if (!isAuthenticated || !user?.profile) {
            return null;
        }
        return user.profile.role;
    };

    const getPortalPath = (): string => {
        const role = getCurrentUserRole();
        if (!role) return '/(auth)';

        if (role === 'customer') {
            return '/(app)/(customer)/(tabs)';
        } else if (role === 'admin' && canAccessAdminPortal()) {
            return '/(app)/(admin)/(tabs)';
        } else if (['agent', 'admin', 'captain'].includes(role)) {
            return '/(app)/(agent)/(tabs)';
        }

        return '/(auth)';
    };

    return {
        // Basic role checks
        hasRole,
        isCustomer,
        isAgent,
        isAdmin,
        isCaptain,
        isStaff,
        isSuperAdmin,

        // Portal access
        canAccessCustomerPortal,
        canAccessAgentPortal,
        canAccessAdminPortal,

        // Tab-level access
        canAccessDashboard,
        canAccessBookingsTab,
        canAccessScheduleTab,
        canAccessVesselsTab,
        canAccessRoutesTab,
        canAccessUsersTab,

        // Feature access (permission-based)
        canManageUsers,
        canManageBookings,
        canManageVessels,
        canManageRoutes,
        canManageSchedule,
        canViewReports,
        canManagePermissions,
        canPerformEmergencyActions,

        // Direct permission checking
        checkPermission,
        hasPermission: hasPermission,
        hasAnyPermission: hasAnyPermission,

        // Utility
        getCurrentUserRole,
        getPortalPath,
        userProfile: user?.profile || null,
    };
}; 