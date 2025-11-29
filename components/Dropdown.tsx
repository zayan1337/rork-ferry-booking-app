import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { DropdownProps } from '@/types/components';

const Dropdown: React.FC<DropdownProps> = ({
  label,
  items,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled = false,
  searchable = false,
  required = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedItem = items.find(item => item.value === value);

  const filteredItems =
    searchable && searchQuery
      ? items.filter(item =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : items;

  const handleSelect = (itemValue: string) => {
    Keyboard.dismiss();
    onChange(itemValue);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setSearchQuery('');
  };

  const clearSelection = () => {
    onChange('');
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <Pressable
        style={[
          styles.dropdownContainer,
          error ? styles.dropdownError : null,
          disabled ? styles.dropdownDisabled : null,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text
          style={[styles.dropdownText, !selectedItem && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>

        <View style={styles.dropdownRight}>
          {value && (
            <Pressable
              style={styles.clearButton}
              onPress={clearSelection}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <X size={16} color={Colors.textSecondary} />
            </Pressable>
          )}
          <ChevronDown size={20} color={Colors.textSecondary} />
        </View>
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType='slide'
        transparent={true}
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {label || 'Select an option'}
              </Text>
            </View>

            {searchable && (
              <View style={styles.searchContainer}>
                <Search
                  size={20}
                  color={Colors.textSecondary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder='Search...'
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize='none'
                  clearButtonMode='while-editing'
                />
              </View>
            )}

            <FlatList
              data={filteredItems}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.optionItem,
                    item.value === value && styles.selectedOptionItem,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.selectedOptionText,
                    ]}
                  >
                    {item.label}
                  </Text>

                  {item.value === value && (
                    <View style={styles.selectedIndicator} />
                  )}
                </Pressable>
              )}
              style={styles.optionsList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No options found</Text>
                </View>
              }
            />

            <View style={styles.modalFooter}>
              <Button
                title='Cancel'
                onPress={handleCancel}
                variant='outline'
                style={styles.footerButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: Colors.text,
    fontWeight: '500',
  },
  required: {
    color: Colors.error,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.card,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  dropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    marginRight: 8,
  },
  dropdownError: {
    borderColor: Colors.error,
  },
  dropdownDisabled: {
    backgroundColor: Colors.inactive,
    opacity: 0.7,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedOptionItem: {
    backgroundColor: Colors.highlight,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedOptionText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  selectedIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButton: {
    width: '100%',
  },
});

export default Dropdown;
