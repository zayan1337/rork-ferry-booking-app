import React from 'react';
import { StyleSheet, TextInput, Pressable, View } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: any;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.container, style]}>
      <Search size={20} color={colors.textSecondary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear && onClear();
          }}
          style={styles.clearButton}
        >
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: `${colors.border}40`,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.text,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
});
