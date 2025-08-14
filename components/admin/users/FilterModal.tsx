import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import Button from '@/components/admin/Button';

type FilterStatus = 'all' | 'active' | 'inactive' | 'suspended';
type SortField =
  | 'name'
  | 'email'
  | 'role'
  | 'status'
  | 'created_at'
  | 'last_login';
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
    { key: 'active' as const, label: 'Active' },
    { key: 'inactive' as const, label: 'Inactive' },
    { key: 'suspended' as const, label: 'Suspended' },
  ];

  const sortOptions: {
    key: SortField;
    label: string;
    order: SortOrder;
  }[] = [
    { key: 'created_at', label: 'Date (Newest)', order: 'desc' },
    { key: 'created_at', label: 'Date (Oldest)', order: 'asc' },
    { key: 'name', label: 'Name (A-Z)', order: 'asc' },
    { key: 'name', label: 'Name (Z-A)', order: 'desc' },
    { key: 'role', label: 'Role (A-Z)', order: 'asc' },
    { key: 'status', label: 'Status (A-Z)', order: 'asc' },
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
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {statusOptions.map(option => (
                <TouchableOpacity
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
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort by</Text>
              {sortOptions.map(option => (
                <TouchableOpacity
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
                </TouchableOpacity>
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
