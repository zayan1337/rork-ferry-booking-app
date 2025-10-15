import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Check } from 'lucide-react-native';

interface SelectionCheckboxProps {
  selected: boolean;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export function SelectionCheckbox({
  selected,
  onPress,
  size = 'medium',
  style,
}: SelectionCheckboxProps) {
  const getCheckboxSize = () => {
    switch (size) {
      case 'small':
        return { width: 18, height: 18, borderRadius: 4 };
      case 'large':
        return { width: 26, height: 26, borderRadius: 8 };
      default:
        return { width: 22, height: 22, borderRadius: 6 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  return (
    <Pressable style={[styles.checkboxContainer, style]} onPress={onPress}>
      <View
        style={[
          styles.checkbox,
          getCheckboxSize(),
          selected && styles.checkboxSelected,
        ]}
      >
        {selected && <Check size={getIconSize()} color='white' />}
      </View>
    </Pressable>
  );
}

interface SelectAllControlProps {
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

export function SelectAllControl({
  totalCount,
  selectedCount,
  onSelectAll,
  size = 'medium',
  style,
}: SelectAllControlProps) {
  const isAllSelected = totalCount > 0 && selectedCount === totalCount;
  const isPartiallySelected = selectedCount > 0 && selectedCount < totalCount;

  const getCheckboxSize = () => {
    switch (size) {
      case 'small':
        return { width: 18, height: 18, borderRadius: 4 };
      case 'large':
        return { width: 26, height: 26, borderRadius: 8 };
      default:
        return { width: 22, height: 22, borderRadius: 6 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  if (totalCount === 0) return null;

  return (
    <Pressable
      style={[styles.selectAllButton, style]}
      onPress={onSelectAll}
      accessibilityRole='button'
      accessibilityLabel={
        isAllSelected ? 'Deselect all items' : 'Select all items'
      }
    >
      <View
        style={[
          styles.checkbox,
          getCheckboxSize(),
          isAllSelected && styles.checkboxSelected,
          isPartiallySelected && styles.checkboxPartial,
        ]}
      >
        {isAllSelected && <Check size={getIconSize()} color='white' />}
        {isPartiallySelected && !isAllSelected && (
          <View style={styles.partialCheckmark} />
        )}
      </View>
      <Text style={[styles.selectAllText, { fontSize: getTextSize() }]}>
        {isAllSelected ? 'Deselect All' : `Select All (${totalCount})`}
      </Text>
    </Pressable>
  );
}

interface SelectionSummaryProps {
  selectedCount: number;
  totalCount: number;
  itemName?: string;
  style?: any;
}

export function SelectionSummary({
  selectedCount,
  totalCount,
  itemName = 'item',
  style,
}: SelectionSummaryProps) {
  if (selectedCount === 0) return null;

  const itemText = selectedCount === 1 ? itemName : `${itemName}s`;

  return (
    <View style={[styles.selectionSummary, style]}>
      <Text style={styles.selectionSummaryText}>
        {selectedCount} {itemText} selected
        {totalCount > 0 && ` of ${totalCount}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxContainer: {
    padding: 4,
  },
  checkbox: {
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  selectAllText: {
    fontWeight: '500',
    color: colors.primary,
  },
  selectionSummary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: `${colors.primary}10`,
    borderRadius: 6,
    marginBottom: 12,
  },
  selectionSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    textAlign: 'center',
  },
});
