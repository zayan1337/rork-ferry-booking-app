import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import Button from '@/components/admin/Button';
import { BookingStatus } from '@/types/admin/management';

type FilterStatus = BookingStatus | 'all';
type SortField =
  | 'created_at'
  | 'total_fare'
  | 'user_name'
  | 'route_name'
  | 'trip_travel_date';
type SortOrder = 'asc' | 'desc';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterStatus: FilterStatus;
  sortBy: SortField;
  sortOrder: SortOrder;
  onStatusChange: (status: FilterStatus) => void;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onClearAll: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filterStatus,
  sortBy,
  sortOrder,
  onStatusChange,
  onSortChange,
  onClearAll,
}) => {
  const statusOptions = [
    { key: 'all' as const, label: 'All Status' },
    { key: 'reserved' as const, label: 'Reserved' },
    { key: 'pending_payment' as const, label: 'Pending Payment' },
    { key: 'confirmed' as const, label: 'Confirmed' },
    { key: 'checked_in' as const, label: 'Checked In' },
    { key: 'completed' as const, label: 'Completed' },
    { key: 'cancelled' as const, label: 'Cancelled' },
  ];

  const sortOptions: {
    key: SortField;
    label: string;
    order: SortOrder;
  }[] = [
    { key: 'created_at', label: 'Date (Newest)', order: 'desc' },
    { key: 'created_at', label: 'Date (Oldest)', order: 'asc' },
    { key: 'total_fare', label: 'Amount (High to Low)', order: 'desc' },
    { key: 'total_fare', label: 'Amount (Low to High)', order: 'asc' },
    { key: 'user_name', label: 'Customer (A-Z)', order: 'asc' },
    { key: 'user_name', label: 'Customer (Z-A)', order: 'desc' },
    { key: 'route_name', label: 'Route (A-Z)', order: 'asc' },
    { key: 'route_name', label: 'Route (Z-A)', order: 'desc' },
    { key: 'trip_travel_date', label: 'Travel Date (Latest)', order: 'desc' },
    { key: 'trip_travel_date', label: 'Travel Date (Earliest)', order: 'asc' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter & Sort</Text>
            <Pressable onPress={onClose}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {statusOptions.map(option => (
                <Pressable
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filterStatus === option.key && styles.filterOptionSelected,
                  ]}
                  onPress={() => onStatusChange(option.key)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filterStatus === option.key &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filterStatus === option.key && (
                    <Check size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort by</Text>
              {sortOptions.map(option => (
                <Pressable
                  key={`${option.key}_${option.order}`}
                  style={[
                    styles.filterOption,
                    sortBy === option.key &&
                      sortOrder === option.order &&
                      styles.filterOptionSelected,
                  ]}
                  onPress={() => onSortChange(option.key, option.order)}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      sortBy === option.key &&
                        sortOrder === option.order &&
                        styles.filterOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.key && sortOrder === option.order && (
                    <Check size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button title='Clear All' variant='ghost' onPress={onClearAll} />
            <Button title='Apply' variant='primary' onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.border}20`,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  filterOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  filterOptionTextSelected: {
    color: colors.primary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}20`,
  },
});

export default FilterModal;
