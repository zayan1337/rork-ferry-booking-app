import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/adminColors';

type StatusType =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'completed'
  | 'paid'
  | 'refunded'
  | 'failed'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'banned'
  | 'maintenance'
  | 'scheduled'
  | 'in-progress'
  | 'reserved'
  | 'pending_payment'
  | 'checked_in'; // Added booking-specific statuses

interface StatusBadgeProps {
  status: StatusType;
  size?: 'small' | 'medium';
  variant?: 'default' | 'payment';
}

export default function StatusBadge({
  status,
  size = 'medium',
  variant = 'default',
}: StatusBadgeProps) {
  const getStatusColor = () => {
    // Payment-specific styling
    if (variant === 'payment') {
      switch (status) {
        case 'paid':
        case 'completed':
          return {
            bg: '#E8F5E8',
            text: '#2E7D32',
          };
        case 'pending':
        case 'pending_payment':
          return {
            bg: '#FFF3E0',
            text: '#F57C00',
          };
        case 'failed':
        case 'cancelled':
        case 'refunded':
          return {
            bg: '#FFEBEE',
            text: '#C62828',
          };
        default:
          return {
            bg: colors.backgroundSecondary,
            text: colors.textSecondary,
          };
      }
    }

    // Default status styling
    switch (status) {
      case 'confirmed':
      case 'completed':
      case 'checked_in':
        return {
          bg: '#E8F5E8',
          text: '#2E7D32',
        };
      case 'pending':
      case 'pending_payment':
      case 'reserved':
        return {
          bg: '#FFF3E0',
          text: '#F57C00',
        };
      case 'cancelled':
        return {
          bg: '#FFEBEE',
          text: '#C62828',
        };
      case 'active':
      case 'scheduled':
        return {
          bg: '#E3F2FD',
          text: '#1976D2',
        };
      case 'inactive':
      case 'suspended':
      case 'banned':
        return {
          bg: '#F3E5F5',
          text: '#7B1FA2',
        };
      case 'maintenance':
        return {
          bg: '#FFF8E1',
          text: '#F57F17',
        };
      case 'in-progress':
        return {
          bg: '#E8F5E8',
          text: '#388E3C',
        };
      default:
        return {
          bg: colors.backgroundSecondary,
          text: colors.textSecondary,
        };
    }
  };

  const formatStatusText = (status: string) => {
    return status
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const statusStyle = getStatusColor();
  const textSize = size === 'small' ? 11 : 12;
  const paddingVertical = size === 'small' ? 4 : 6;
  const paddingHorizontal = size === 'small' ? 8 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusStyle.bg,
          paddingVertical,
          paddingHorizontal,
        },
      ]}
    >
      {/* Always wrap status in <Text> to prevent RN error */}
      <Text
        style={[
          styles.badgeText,
          {
            color: statusStyle.text,
            fontSize: textSize,
          },
        ]}
      >
        {typeof status === 'string' ? formatStatusText(status) : String(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
