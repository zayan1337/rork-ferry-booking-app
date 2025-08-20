import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Percent, Calendar, Tag, Users } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { Promotion } from '@/types/content';

interface PromotionItemProps {
  promotion: Promotion;
  onPress: (id: string) => void;
}

export default function PromotionItem({
  promotion,
  onPress,
}: PromotionItemProps) {
  const getDiscountColor = () => {
    if (promotion.discount_percentage >= 50) return colors.error;
    if (promotion.discount_percentage >= 30) return colors.warning;
    if (promotion.discount_percentage >= 15) return colors.success;
    return colors.primary;
  };

  const getPromotionStatus = () => {
    if (!promotion.is_active) {
      return {
        status: 'Inactive',
        color: colors.textSecondary,
        bgColor: colors.backgroundTertiary,
      };
    }

    if (!promotion.start_date || !promotion.end_date) {
      return {
        status: 'Unknown',
        color: colors.textSecondary,
        bgColor: colors.backgroundTertiary,
      };
    }

    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        status: 'Invalid',
        color: colors.error,
        bgColor: colors.errorLight,
      };
    }

    if (start > now) {
      return {
        status: 'Upcoming',
        color: colors.warning,
        bgColor: colors.warningLight,
      };
    }
    if (end < now) {
      return {
        status: 'Expired',
        color: colors.error,
        bgColor: colors.errorLight,
      };
    }
    return {
      status: 'Current',
      color: colors.success,
      bgColor: colors.successLight,
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatDateRange = () => {
    if (!promotion.start_date || !promotion.end_date) {
      return 'Date not available';
    }
    const startDate = formatDate(promotion.start_date);
    const endDate = formatDate(promotion.end_date);
    return `${startDate} - ${endDate}`;
  };

  const discountColor = getDiscountColor();
  const { status, color, bgColor } = getPromotionStatus();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(promotion.id)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Percent size={20} color={discountColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {promotion.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{status}</Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View
              style={[
                styles.discountBadge,
                { backgroundColor: `${discountColor}15` },
              ]}
            >
              <Tag size={12} color={discountColor} />
              <Text style={[styles.discountText, { color: discountColor }]}>
                {promotion.discount_percentage}% OFF
              </Text>
            </View>

            {promotion.is_first_time_booking_only && (
              <View style={styles.targetBadge}>
                <Users size={12} color={colors.info} />
                <Text style={styles.targetText}>New Customers</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            <Calendar size={12} color={colors.textTertiary} />
            <Text style={styles.dateRange}>{formatDateRange()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.chevron}>
        <View style={styles.chevronIcon} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  content: {
    flex: 1,
    minHeight: 60,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  discountText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.infoLight,
    gap: 4,
  },
  targetText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.info,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateRange: {
    fontSize: 12,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chevronIcon: {
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.textTertiary,
    transform: [{ rotate: '45deg' }],
  },
});
