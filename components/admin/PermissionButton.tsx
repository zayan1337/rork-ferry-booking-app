import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { usePermissions } from '@/hooks/usePermissions';
import type { PermissionName } from '@/types/permissions';
import { colors } from '@/constants/adminColors';

interface PermissionButtonProps {
    title: string;
    onPress: () => void;
    permissions: PermissionName[];
    requireAll?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'success';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export default function PermissionButton({
    title,
    onPress,
    permissions,
    requireAll = false,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    style,
    textStyle,
    icon,
}: PermissionButtonProps) {
    const { hasAnyPermission, hasAllPermissions, isSuperAdmin, loading } = usePermissions();

    // Don't render while permissions are loading
    if (loading) {
        return null;
    }

    // Super admin always has access
    if (!isSuperAdmin) {
        // Check permissions based on requireAll flag
        const hasAccess = requireAll
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);

        if (!hasAccess) {
            return null;
        }
    }

    const getButtonStyle = () => {
        const baseStyle = [styles.button, styles[size]];

        if (disabled) {
            baseStyle.push(styles.disabled);
        } else {
            baseStyle.push(styles[variant]);
        }

        if (style) {
            baseStyle.push(style);
        }

        return baseStyle;
    };

    const getTextStyle = () => {
        const baseStyle = [styles.text, styles[`${size}Text`], styles[`${variant}Text`]];

        if (disabled) {
            baseStyle.push(styles.disabledText);
        }

        if (textStyle) {
            baseStyle.push(textStyle);
        }

        return baseStyle;
    };

    return (
        <TouchableOpacity
            style={getButtonStyle()}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={title}
        >
            {icon}
            <Text style={getTextStyle()}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },

    // Sizes
    small: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    medium: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    large: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 10,
    },

    // Variants
    primary: {
        backgroundColor: colors.primary,
    },
    secondary: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    danger: {
        backgroundColor: colors.danger,
    },
    success: {
        backgroundColor: colors.success,
    },

    disabled: {
        backgroundColor: colors.disabled,
    },

    // Text styles
    text: {
        fontWeight: '600',
        textAlign: 'center',
    },

    smallText: {
        fontSize: 12,
    },
    mediumText: {
        fontSize: 14,
    },
    largeText: {
        fontSize: 16,
    },

    primaryText: {
        color: colors.white,
    },
    secondaryText: {
        color: colors.text,
    },
    dangerText: {
        color: colors.white,
    },
    successText: {
        color: colors.white,
    },

    disabledText: {
        color: colors.textSecondary,
    },
}); 