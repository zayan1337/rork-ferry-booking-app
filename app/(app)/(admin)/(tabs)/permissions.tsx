import React, { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useRoleAccess } from '@/hooks';

export default function PermissionsTab() {
    const { canManagePermissions, isSuperAdmin } = useRoleAccess();
    const hasRedirected = useRef(false);

    useEffect(() => {
        // Only redirect once and only if user authentication is stable
        if (!hasRedirected.current && typeof canManagePermissions === 'boolean') {
            hasRedirected.current = true;

            // Redirect to the permissions management screen
            if (canManagePermissions && isSuperAdmin) {
                router.replace('../permissions' as any);
            } else {
                router.replace('./' as any); // Redirect to dashboard if no permission
            }
        }
    }, [canManagePermissions, isSuperAdmin]);

    return (
        <View style={styles.container}>
            <Text>Redirecting...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 