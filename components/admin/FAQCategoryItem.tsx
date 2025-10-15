import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import { FAQCategory } from '@/types/admin/management';
import {
  Folder,
  Calendar,
  Edit,
  Trash2,
  MoreHorizontal,
  MessageSquare,
  Activity,
  FileText,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface FAQCategoryItemProps {
  category: FAQCategory;
  faqCount?: number;
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

const FAQCategoryItem: React.FC<FAQCategoryItemProps> = ({
  category,
  faqCount = 0,
  onPress,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const handlePress = () => {
    onPress(category.id);
  };

  const handleEdit = () => {
    onEdit?.(category.id);
  };

  const handleDelete = () => {
    onDelete?.(category.id);
  };

  const getCategoryColor = (categoryName: string) => {
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
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const categoryColor = getCategoryColor(category.name);

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
              <Folder size={20} color={categoryColor} />
            </View>
            <View style={styles.headerContent}>
              <Text style={styles.categoryName} numberOfLines={1}>
                {category.name}
              </Text>
              <View style={styles.metadata}>
                <View style={styles.faqCountContainer}>
                  <MessageSquare size={12} color={colors.textSecondary} />
                  <Text style={styles.faqCountText}>
                    {faqCount} FAQ{faqCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.statusContainer}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: category.is_active
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: category.is_active
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {category.is_active ? 'Active' : 'Inactive'}
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

        {/* Description */}
        {category.description && (
          <View style={styles.descriptionContainer}>
            <FileText size={14} color={colors.textSecondary} />
            <Text style={styles.description} numberOfLines={2}>
              {category.description}
            </Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Activity size={14} color={colors.info} />
            <Text style={styles.statLabel}>Order</Text>
            <Text style={styles.statValue}>{category.order_index}</Text>
          </View>
          <View style={styles.statItem}>
            <Calendar size={14} color={colors.textTertiary} />
            <Text style={styles.statLabel}>Created</Text>
            <Text style={styles.statValue}>
              {formatDate(category.created_at)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerText}>
              Click to view and manage FAQs in this category
            </Text>
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
  categoryName: {
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
    gap: 12,
  },
  faqCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  faqCountText: {
    fontSize: 12,
    color: colors.textSecondary,
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
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  description: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  statValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  footer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  footerContent: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  highlightBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
});

export default FAQCategoryItem;
