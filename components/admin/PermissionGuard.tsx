import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionName } from '@/types/permissions';
import { colors } from '@/constants/adminColors';

interface PermissionGuardProps {
    children: React.ReactNode;
    permissions?: PermissionName[];
    requireAll?: boolean; // If true, user must have ALL permissions. If false, user needs ANY permission
    fallback?: React.ReactNode;
    showFallback?: boolean;
}

export default function PermissionGuard({
    children,
    permissions = [],
    requireAll = false,
    fallback,
    showFallback = false,
}: PermissionGuardProps) {
    const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin, loading } = usePermissions();

    // Show loading state while permissions are being loaded
    if (loading) {
        return null;
    }

    // Super admin always has access
    if (isSuperAdmin) {
        return <>{children}</>;
    }

    // If no permissions specified, show children (no protection)
    if (permissions.length === 0) {
        return <>{children}</>;
    }

    // Check permissions based on requireAll flag
    const hasAccess = requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);

    if (hasAccess) {
        return <>{children}</>;
    }

    // Show fallback if provided and showFallback is true
    if (showFallback && fallback) {
        return <>{fallback}</>;
    }

    // Show default fallback if showFallback is true but no custom fallback provided
    if (showFallback) {
        return (
            <View style={styles.noAccessContainer}>
                <Text style={styles.noAccessText}>Insufficient permissions</Text>
            </View>
        );
    }

    // Don't render anything if no access and showFallback is false
    return null;
}

const styles = StyleSheet.create({
    noAccessContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.cardSecondary,
        borderRadius: 8,
        marginVertical: 8,
    },
    noAccessText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
}); 