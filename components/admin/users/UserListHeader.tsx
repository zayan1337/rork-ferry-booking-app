import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import SectionHeader from '@/components/admin/SectionHeader';

interface UserListHeaderProps {
  searchQuery: string;
  filteredCount: number;
  isTablet: boolean;
  hasActiveFilters: boolean;
  currentFilterText: { filters: string; sort: string };
  onClearFilters: () => void;
}

const UserListHeader: React.FC<UserListHeaderProps> = ({
  searchQuery,
  filteredCount,
  isTablet,
  hasActiveFilters,
  currentFilterText,
  onClearFilters,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.usersHeader}>
        <SectionHeader
          title={searchQuery ? 'Search Results' : 'Users'}
          subtitle={`${filteredCount} ${
            filteredCount === 1 ? 'user' : 'users'
          } found`}
          size={isTablet ? 'large' : 'medium'}
        />
      </View>

      {/* Compact Filter Status - Full width */}
      {(hasActiveFilters || filteredCount > 0) && (
        <View style={styles.compactFilterStatus}>
          <Text style={styles.compactFilterText}>
            {currentFilterText.filters}
          </Text>
          <View style={styles.filterStatusDivider}>
            <Text style={styles.compactFilterText}>
              {currentFilterText.sort}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={onClearFilters}
                accessibilityRole='button'
                accessibilityLabel='Clear all filters'
              >
                <X size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  usersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactFilterStatus: {
    paddingHorizontal: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '40',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterStatusDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactFilterText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  clearFiltersButton: {
    padding: 2,
    borderRadius: 2,
  },
});

export default UserListHeader;
