import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';

interface SelectAllSectionProps {
  canUpdateUsers: boolean;
  filteredCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: () => void;
}

const SelectAllSection: React.FC<SelectAllSectionProps> = ({
  canUpdateUsers,
  filteredCount,
  selectedCount,
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
}) => {
  if (!canUpdateUsers || filteredCount === 0) return null;

  return (
    <View>
      <Pressable
        style={styles.selectAllButton}
        onPress={onSelectAll}
        accessibilityRole='button'
        accessibilityLabel={
          isAllSelected ? 'Deselect all users' : 'Select all users'
        }
      >
        <View
          style={[
            styles.selectAllCheckboxLarge,
            isAllSelected && styles.checkboxSelected,
            isPartiallySelected && styles.checkboxPartial,
          ]}
        >
          {isAllSelected && <Check size={14} color='white' />}
          {isPartiallySelected && !isAllSelected && (
            <View style={styles.partialCheckmark} />
          )}
        </View>
        <Text style={styles.selectAllTextLarge}>
          {isAllSelected ? 'Deselect All' : 'Select All'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  selectAllCheckboxLarge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllTextLarge: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxPartial: {
    backgroundColor: `${colors.primary}40`,
    borderColor: colors.primary,
  },
  partialCheckmark: {
    width: 8,
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
});

export default SelectAllSection;
