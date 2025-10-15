import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import { TermsAndConditions } from '@/types/content';
import {
  FileText,
  Calendar,
  Edit,
  Trash2,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface TermsItemProps {
  terms: TermsAndConditions;
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  showActions?: boolean;
}

const TermsItem: React.FC<TermsItemProps> = ({
  terms,
  onPress,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
}) => {
  const handlePress = () => {
    onPress(terms.id);
  };

  const handleEdit = () => {
    onEdit?.(terms.id);
  };

  const handleDelete = () => {
    onDelete?.(terms.id);
  };

  const handleDuplicate = () => {
    onDuplicate?.(terms.id);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = () => {
    return terms.is_active ? colors.success : colors.warning;
  };

  const getStatusIcon = () => {
    return terms.is_active ? CheckCircle : XCircle;
  };

  const StatusIcon = getStatusIcon();

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  };

  const getWordCount = (content: string) => {
    return content.trim().split(/\s+/).length;
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <FileText
              size={20}
              color={terms.is_active ? colors.primary : colors.textSecondary}
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {terms.title}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.versionContainer}>
                <Tag size={12} color={colors.textSecondary} />
                <Text style={styles.version}>v{terms.version}</Text>
              </View>

              <View style={styles.statusContainer}>
                <StatusIcon size={12} color={getStatusColor()} />
                <Text style={[styles.status, { color: getStatusColor() }]}>
                  {terms.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>

          {showActions && (
            <View style={styles.actionsContainer}>
              {onDuplicate && (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleDuplicate}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Copy size={16} color={colors.textSecondary} />
                </Pressable>
              )}

              {onEdit && (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleEdit}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Edit size={16} color={colors.primary} />
                </Pressable>
              )}

              {onDelete && (
                <Pressable
                  style={styles.actionButton}
                  onPress={handleDelete}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={colors.error} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Content Preview */}
        <View style={styles.contentPreview}>
          <Text style={styles.contentText} numberOfLines={3}>
            {truncateContent(terms.content)}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.dateContainer}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={styles.date}>
                Effective: {formatDate(terms.effective_date)}
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <Text style={styles.stats}>
                {getWordCount(terms.content)} words
              </Text>
            </View>
          </View>

          <View style={styles.footerRight}>
            <View style={styles.timestampContainer}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={styles.timestamp}>
                {formatDate(terms.updated_at || terms.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: isTablet ? 0 : 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  version: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentPreview: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  contentText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLeft: {
    flex: 1,
    gap: 6,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stats: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
export default TermsItem;
