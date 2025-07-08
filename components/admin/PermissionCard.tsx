import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, X, Clock, Shield } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import type { PermissionCardProps } from '@/types/permissions';

const PermissionCard: React.FC<PermissionCardProps> = ({
    permission,
    isGranted,
    isLoading,
    onToggle,
    disabled = false,
}) => {
    const handleToggle = () => {
        if (!disabled && !isLoading) {
            onToggle(permission);
        }
    };

    const getResourceColor = (resource: string) => {
        const colorMap: { [key: string]: string } = {
            dashboard: colors.blue,
            users: colors.purple,
            bookings: colors.green,
            schedule: colors.orange,
            vessels: colors.teal,
            routes: colors.indigo,
            payments: colors.red,
            system: colors.gray,
            communications: colors.yellow,
            reports: colors.pink,
        };
        return colorMap[resource] || colors.gray;
    };

    const getActionIcon = () => {
        const iconProps = {
            size: 16,
            color: colors.textSecondary,
        };

        switch (permission.action) {
            case 'view':
                return <Shield {...iconProps} />;
            case 'create':
                return <Check {...iconProps} />;
            case 'edit':
                return <Check {...iconProps} />;
            case 'delete':
                return <X {...iconProps} />;
            case 'manage':
                return <Shield {...iconProps} />;
            default:
                return <Check {...iconProps} />;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isGranted && styles.grantedContainer,
                disabled && styles.disabledContainer,
            ]}
            onPress={handleToggle}
            disabled={disabled || isLoading}
            activeOpacity={0.7}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <View
                            style={[
                                styles.resourceBadge,
                                { backgroundColor: getResourceColor(permission.resource) },
                            ]}
                        >
                            <Text style={styles.resourceText}>
                                {permission.resource.toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.actionIcon}>
                            {getActionIcon()}
                        </View>
                    </View>

                    <Switch
                        value={isGranted}
                        onValueChange={handleToggle}
                        disabled={disabled || isLoading}
                        trackColor={{
                            false: colors.border,
                            true: colors.success,
                        }}
                        thumbColor={isGranted ? 'white' : colors.textSecondary}
                        style={styles.switch}
                    />
                </View>

                <View style={styles.details}>
                    <Text style={styles.permissionName} numberOfLines={2}>
                        {permission.name}
                    </Text>
                    {permission.description && (
                        <Text style={styles.description} numberOfLines={3}>
                            {permission.description}
                        </Text>
                    )}
                </View>

                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <Clock size={16} color={colors.primary} />
                        <Text style={styles.loadingText}>Updating...</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    grantedContainer: {
        borderColor: colors.success,
        backgroundColor: colors.successLight,
    },
    disabledContainer: {
        opacity: 0.6,
    },
    content: {
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    resourceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 8,
    },
    resourceText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
    },
    actionIcon: {
        marginLeft: 4,
    },
    switch: {
        transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
    },
    details: {
        flex: 1,
    },
    permissionName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    loadingText: {
        marginLeft: 8,
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
});

export default PermissionCard; 