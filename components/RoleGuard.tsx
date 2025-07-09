import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/auth';
import AuthLoadingScreen from './AuthLoadingScreen';

interface RoleGuardProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}

export default function RoleGuard({
    children,
    allowedRoles
}: RoleGuardProps) {
    const { isAuthenticated, isLoading, user, isRehydrated } = useAuthStore();

    // No useEffect needed - just render based on current state

    // Show loading while checking authentication or user profile
    if (!isRehydrated || isLoading || !isAuthenticated || !user?.profile) {
        return (
            <AuthLoadingScreen
                message={
                    !isRehydrated ? "Loading app data..." :
                        isLoading ? "Verifying access..." :
                            !isAuthenticated ? "Redirecting to login..." :
                                "Loading your profile..."
                }
            />
        );
    }

    // Check if user role is allowed - if not, show unauthorized message
    if (!allowedRoles.includes(user.profile.role)) {
        return (
            <AuthLoadingScreen message="Access denied. Redirecting..." />
        );
    }

    // User is authenticated and has proper role
    return <>{children}</>;
} 