import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth';
import AuthLoadingScreen from './AuthLoadingScreen';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  customer: '/(app)/(customer)',
  agent: '/(app)/(agent)',
  admin: '/(app)/(admin)',
  captain: '/(app)/(captain)',
};

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const {
    isAuthenticated,
    isAuthenticating,
    user,
    isRehydrated,
    preventRedirect,
    isGuestMode,
  } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const userRole = user?.profile?.role;

  useEffect(() => {
    if (
      isGuestMode ||
      !isRehydrated ||
      !isAuthenticated ||
      preventRedirect ||
      !userRole ||
      allowedRoles.includes(userRole)
    ) {
      return;
    }

    const fallbackRoute = ROLE_HOME_ROUTES[userRole] ?? '/(app)/(customer)';

    if (!pathname.startsWith(fallbackRoute)) {
      setTimeout(() => {
        try {
          router.replace(fallbackRoute as any);
        } catch (error) {
          console.error('RoleGuard redirect error:', error);
        }
      }, 50);
    }
  }, [
    allowedRoles,
    isAuthenticated,
    isGuestMode,
    isRehydrated,
    pathname,
    preventRedirect,
    router,
    userRole,
  ]);

  if (isGuestMode) {
    if (allowedRoles.includes('customer')) {
      return <>{children}</>;
    }
    return <AuthLoadingScreen message='Redirecting to login...' />;
  }

  if (!isRehydrated) {
    return <AuthLoadingScreen message='Loading app data...' />;
  }

  if (!isAuthenticated) {
    return <AuthLoadingScreen message='Redirecting to login...' />;
  }

  if (isAuthenticating && !user?.profile) {
    return <AuthLoadingScreen message='Verifying access...' />;
  }

  if (!user?.profile?.role) {
    return <AuthLoadingScreen message='Loading your profile...' />;
  }

  if (!allowedRoles.includes(user.profile.role)) {
    return <AuthLoadingScreen message='Verifying permissions...' />;
  }

  return <>{children}</>;
}
