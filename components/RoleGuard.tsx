import React from "react";
import { useAuthStore } from "@/store/authStore";
import { UserRole } from "@/types/auth";
import AuthLoadingScreen from "./AuthLoadingScreen";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, isLoading, user, isRehydrated } = useAuthStore();

  // Show loading while checking authentication or user profile
  if (!isRehydrated || isLoading || !isAuthenticated || !user?.profile) {
    return (
      <AuthLoadingScreen
        message={
          !isRehydrated
            ? "Loading app data..."
            : isLoading
            ? "Verifying access..."
            : !isAuthenticated
            ? "Redirecting to login..."
            : "Loading your profile..."
        }
      />
    );
  }

  // Check if user role is allowed - if not, show unauthorized message
  if (!user.profile?.role || !allowedRoles.includes(user.profile.role)) {
    // Add a small delay to prevent immediate redirect and allow state to stabilize
    React.useEffect(() => {
      const timer = setTimeout(() => {
        // Force a re-check of authentication state
        useAuthStore.getState().checkAuth();
      }, 1000);

      return () => clearTimeout(timer);
    }, []);

    return <AuthLoadingScreen message="Verifying permissions..." />;
  }

  // User is authenticated and has proper role
  return <>{children}</>;
}
