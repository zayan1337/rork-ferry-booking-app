import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth';

export const useRoleAccess = () => {
  const { user, isAuthenticated } = useAuthStore();

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

  const canAccessCustomerPortal = (): boolean => {
    return isCustomer();
  };

  const canAccessAgentPortal = (): boolean => {
    return isStaff();
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
    } else if (['agent', 'admin', 'captain'].includes(role)) {
      return '/(app)/(agent)/(tabs)';
    }

    return '/(auth)';
  };

  return {
    hasRole,
    isCustomer,
    isAgent,
    isAdmin,
    isCaptain,
    isStaff,
    canAccessCustomerPortal,
    canAccessAgentPortal,
    getCurrentUserRole,
    getPortalPath,
    userProfile: user?.profile || null,
  };
};
