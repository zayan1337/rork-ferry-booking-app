import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import { FAQ } from '@/types/admin/management';
import { formatDateInMaldives } from '@/utils/timezoneUtils';
import {
  HelpCircle,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  Tag,
  Clock,
  MessageSquare,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface FAQItemProps {
  faq: FAQ;
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const FAQItem: React.FC<FAQItemProps> = ({
  faq,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const handlePress = () => {
    onPress(faq.id);
  };

  const handleEdit = () => {
    onEdit?.(faq.id);
  };

  const handleDelete = () => {
    onDelete?.(faq.id);
  };

  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return colors.textSecondary;

    // Simple hash-based color assignment
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colorOptions = [
      colors.primary,
      colors.info,
      colors.success,
      colors.warning,
      '#9333ea', // Purple
      '#dc2626', // Red
      '#059669', // Emerald
      '#0891b2', // Cyan
    ];

    return colorOptions[Math.abs(hash) % colorOptions.length];
  };

  const formatDate = (dateString: string) => {
    // Use Maldives timezone for consistent date display
    return formatDateInMaldives(dateString, 'short-date');
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const categoryColor = getCategoryColor(faq.category?.name);

  return (
    <Pressable
      style={[styles.container, isTablet && styles.containerTablet]}
      onPress={handlePress}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${categoryColor}15` },
              ]}
            >
              <HelpCircle size={20} color={categoryColor} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.question} numberOfLines={2}>
                {faq.question}
              </Text>
              <View style={styles.metadata}>
                <View
                  style={[
                    styles.categoryBadge,
                    { backgroundColor: `${categoryColor}15` },
                  ]}
                >
                  <Tag size={12} color={categoryColor} />
                  <Text style={[styles.categoryText, { color: categoryColor }]}>
                    {faq.category?.name || 'Uncategorized'}
                  </Text>
                </View>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: faq.is_active
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: faq.is_active
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {faq.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {showActions && (
            <View style={styles.actions}>
              {onEdit && (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleEdit}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Edit size={16} color={colors.primary} />
                </Pressable>
              )}
              {onDelete && (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleDelete}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              )}
              <Pressable
                style={styles.actionButton}
                onPress={handlePress}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <MoreHorizontal size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Answer Preview */}
        <View style={styles.answerContainer}>
          <MessageSquare size={14} color={colors.textSecondary} />
          <Text style={styles.answer} numberOfLines={2}>
            {truncateText(faq.answer, 120)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.dateContainer}>
              <Calendar size={12} color={colors.textTertiary} />
              <Text style={styles.dateText}>
                Created {formatDate(faq.created_at)}
              </Text>
            </View>
            {faq.updated_at !== faq.created_at && (
              <View style={styles.dateContainer}>
                <Clock size={12} color={colors.textTertiary} />
                <Text style={styles.dateText}>
                  Updated {formatDate(faq.updated_at)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerRight}>
            <Text style={styles.orderText}>Order: {faq.order_index}</Text>
          </View>
        </View>
      </View>

      {/* Highlight bar */}
      <View style={[styles.highlightBar, { backgroundColor: categoryColor }]} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${colors.background}20`,
  },
  containerTablet: {
    marginHorizontal: 24,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  answerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  answer: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  footerLeft: {
    flex: 1,
    gap: 4,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  orderText: {
    fontSize: 11,
    color: colors.textTertiary,
    fontWeight: '500',
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});

export default FAQItem;
