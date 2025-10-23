/**
 * Island Search Input Component
 *
 * Autocomplete search input for selecting islands in booking flow
 * Features:
 * - Search with suggestions
 * - Consistent with existing UI patterns
 * - Accessible and mobile-friendly
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import { MapPin, Check, X, Search } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Island } from '@/types';

interface IslandSearchInputProps {
  label: string;
  placeholder: string;
  value: string | null;
  onChange: (islandId: string) => void;
  islands: Island[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function IslandSearchInput({
  label,
  placeholder,
  value,
  onChange,
  islands,
  error,
  disabled = false,
  required = false,
}: IslandSearchInputProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIsland = islands.find(i => i.id === value);

  const filteredIslands = searchQuery
    ? islands.filter(island =>
        island.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : islands;

  const handleSelect = (island: Island) => {
    onChange(island.id);
    setSearchQuery('');
    setShowModal(false);
  };

  const handleClear = () => {
    onChange('');
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      {/* Input Trigger */}
      <Pressable
        onPress={() => !disabled && setShowModal(true)}
        style={[
          styles.inputTrigger,
          error ? styles.inputError : null,
          disabled ? styles.inputDisabled : null,
        ]}
      >
        <MapPin size={20} color={Colors.textSecondary} />
        <Text
          style={[styles.inputText, !selectedIsland && styles.placeholderText]}
        >
          {selectedIsland?.name || placeholder}
        </Text>
        {selectedIsland && !disabled && (
          <Pressable onPress={handleClear} style={styles.clearButton}>
            <X size={16} color={Colors.textSecondary} />
          </Pressable>
        )}
      </Pressable>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Selection Modal */}
      <Modal
        visible={showModal}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Pressable
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color={Colors.text} />
            </Pressable>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder='Search islands...'
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.searchClear}
              >
                <X size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Islands List */}
          <FlatList
            data={filteredIslands}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.islandItem,
                  value === item.id && styles.islandItemSelected,
                ]}
                onPress={() => handleSelect(item)}
              >
                <View style={styles.islandInfo}>
                  <MapPin
                    size={20}
                    color={
                      value === item.id ? Colors.primary : Colors.textSecondary
                    }
                  />
                  <View style={styles.islandDetails}>
                    <Text
                      style={[
                        styles.islandName,
                        value === item.id && styles.islandNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.zone && (
                      <Text style={styles.islandZone}>Zone {item.zone}</Text>
                    )}
                  </View>
                </View>
                {value === item.id && (
                  <Check size={20} color={Colors.primary} />
                )}
              </Pressable>
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No islands found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  inputTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputDisabled: {
    backgroundColor: Colors.background,
    opacity: 0.6,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  clearButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    margin: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  islandItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  islandItemSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.highlight,
  },
  islandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  islandDetails: {
    flex: 1,
  },
  islandName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  islandNameSelected: {
    color: Colors.primary,
  },
  islandZone: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
