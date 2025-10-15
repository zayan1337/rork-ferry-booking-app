import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  Pressable,
  View,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/adminColors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  rounded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const { width: screenWidth } = Dimensions.get('window');

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  rounded = false,
  style,
}: ButtonProps) {
  const isSmallScreen = screenWidth < 480;

  const getBackgroundColor = () => {
    if (disabled) return colors.backgroundSecondary;

    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'danger':
        return colors.danger;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textSecondary;

    switch (variant) {
      case 'outline':
        return colors.primary;
      case 'ghost':
        return colors.text;
      case 'primary':
      case 'secondary':
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;

    switch (variant) {
      case 'outline':
        return colors.primary;
      case 'ghost':
        return 'transparent';
      default:
        return 'transparent';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          height: isSmallScreen ? 32 : 36,
          paddingHorizontal: isSmallScreen ? 10 : 12,
          fontSize: isSmallScreen ? 13 : 14,
          borderRadius: rounded ? 18 : 8,
        };
      case 'large':
        return {
          height: isSmallScreen ? 48 : 52,
          paddingHorizontal: isSmallScreen ? 20 : 24,
          fontSize: isSmallScreen ? 16 : 18,
          borderRadius: rounded ? 26 : 12,
        };
      case 'medium':
      default:
        return {
          height: isSmallScreen ? 40 : 44,
          paddingHorizontal: isSmallScreen ? 14 : 16,
          fontSize: 16,
          borderRadius: rounded ? 22 : 10,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const buttonStyle = [
    styles.button,
    {
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor(),
      height: sizeStyles.height,
      paddingHorizontal: sizeStyles.paddingHorizontal,
      borderRadius: sizeStyles.borderRadius,
      width: fullWidth ? ('100%' as const) : undefined,
      minWidth: icon && !title ? sizeStyles.height : undefined,
    },
    variant === 'ghost' && styles.ghostButton,
    disabled && styles.disabledButton,
    style, // Apply the custom style prop
  ];

  const textStyle = [
    styles.title,
    {
      color: getTextColor(),
      fontSize: sizeStyles.fontSize,
    },
  ];

  return (
    <Pressable
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size='small' />
      ) : (
        <View style={styles.content}>
          {icon && (
            <View
              style={[styles.iconContainer, { marginRight: title ? 8 : 0 }]}
            >
              {icon}
            </View>
          )}
          {title && (
            <Text style={textStyle} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
  },
  ghostButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
});
