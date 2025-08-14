import React from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { colors } from '@/constants/adminColors';
import SectionHeader from '@/components/admin/SectionHeader';
import SearchBar from '@/components/admin/SearchBar';
import Button from '@/components/admin/Button';
import EmptyState from '@/components/admin/EmptyState';

interface ListSectionProps {
  title: string;
  subtitle?: string;
  headerSize?: 'small' | 'medium' | 'large';

  // Search functionality
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showSearch?: boolean;

  // Header actions
  headerAction?: {
    title: string;
    icon?: React.ReactNode;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'small' | 'medium' | 'large';
  };

  // Filter/status info
  filterInfo?: {
    text: string;
    onClear?: () => void;
  };

  // List content
  children?: React.ReactNode;
  data?: any[];
  renderItem?: (item: any, index: number) => React.ReactNode;
  keyExtractor?: (item: any, index: number) => string;

  // Empty state
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;

  // View all functionality
  viewAllAction?: {
    text: string;
    icon?: React.ReactNode;
    onPress: () => void;
  };

  // Styling
  contentStyle?: any;
  listStyle?: any;
}

export default function ListSection({
  title,
  subtitle,
  headerSize = 'medium',
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  showSearch = false,
  headerAction,
  filterInfo,
  children,
  data,
  renderItem,
  keyExtractor,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyMessage,
  viewAllAction,
  contentStyle,
  listStyle,
}: ListSectionProps) {
  const hasData = data ? data.length > 0 : React.Children.count(children) > 0;

  return (
    <View style={[styles.section, contentStyle]}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader title={title} subtitle={subtitle} size={headerSize} />
        </View>
        {headerAction && (
          <View style={styles.sectionHeaderButton}>
            <Button
              title={headerAction.title}
              onPress={headerAction.onPress}
              size={headerAction.size || 'small'}
              variant={headerAction.variant || 'outline'}
              icon={headerAction.icon}
            />
          </View>
        )}
      </View>

      {/* Search */}
      {showSearch && onSearchChange && (
        <SearchBar
          placeholder={searchPlaceholder}
          value={searchValue || ''}
          onChangeText={onSearchChange}
        />
      )}

      {/* Filter Info */}
      {filterInfo && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>{filterInfo.text}</Text>
          {filterInfo.onClear && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={filterInfo.onClear}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      {!hasData ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          message={emptyMessage || ''}
        />
      ) : (
        <View style={[styles.listContainer, listStyle]}>
          {/* Render children directly or map through data */}
          {children ||
            (data && renderItem && (
              <View style={styles.itemsList}>
                {(data || []).map((item, index) => (
                  <View key={keyExtractor ? keyExtractor(item, index) : index}>
                    {renderItem(item, index)}
                  </View>
                ))}
              </View>
            ))}
        </View>
      )}

      {/* View All Action */}
      {viewAllAction && hasData && (
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={viewAllAction.onPress}
        >
          <Text style={styles.viewAllText}>{viewAllAction.text}</Text>
          {viewAllAction.icon}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 44,
  },
  sectionHeaderContent: {
    flex: 1,
    paddingRight: 8,
  },
  sectionHeaderButton: {
    flexShrink: 0,
    maxWidth: '40%',
  },
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}40`,
    marginBottom: 16,
  },
  filterInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  clearFiltersButton: {
    padding: 4,
    borderRadius: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  listContainer: {
    marginTop: 16,
  },
  itemsList: {
    gap: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});
