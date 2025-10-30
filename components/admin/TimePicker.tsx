import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Clock, X } from 'lucide-react-native';

interface TimePickerProps {
  label?: string;
  value: string; // HH:MM (24-hour)
  onChange: (time: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  // When true, removes outer margins so it fits inside inline layouts
  compact?: boolean;
}

export default function TimePicker({
  label,
  value,
  onChange,
  placeholder = 'Select time',
  error,
  required = false,
  disabled = false,
  compact = false,
}: TimePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  // Local temp selections so the modal doesn't close immediately on first tap
  const [tempHour, setTempHour] = useState<number | undefined>(undefined);
  const [tempMinute, setTempMinute] = useState<number | undefined>(undefined);

  const { selectedHour, selectedMinute } = useMemo(() => {
    const [h, m] = (value || '').split(':');
    return {
      selectedHour: Number.isFinite(parseInt(h)) ? parseInt(h) : undefined,
      selectedMinute: Number.isFinite(parseInt(m)) ? parseInt(m) : undefined,
    };
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  const finalizeSelection = (hour: number, minute: number) => {
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    onChange(`${hh}:${mm}`);
    setIsVisible(false);
  };

  return (
    <View style={[styles.container, compact && { marginBottom: 0 }]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <Pressable
        style={[
          styles.input,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
        disabled={disabled}
        onPress={() => !disabled && setIsVisible(true)}
      >
        <Text
          style={[
            styles.inputText,
            !value && styles.placeholder,
            disabled && styles.textDisabled,
          ]}
        >
          {value || placeholder}
        </Text>
        <Clock size={20} color={colors.textSecondary} />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType='fade'
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <Pressable
                onPress={() => setIsVisible(false)}
                style={styles.closeButton}
              >
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.pickersRow}>
              {/* Hours */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Hour</Text>
                <ScrollView
                  style={styles.scroll}
                  showsVerticalScrollIndicator={false}
                >
                  {hours.map(h => (
                    <Pressable
                      key={h}
                      style={[
                        styles.option,
                        selectedHour === h && styles.optionSelected,
                      ]}
                      onPress={() => {
                        setTempHour(h);
                        // If minute already chosen in this session or existing value, finalize
                        const minuteToUse = tempMinute ?? selectedMinute ?? 0;
                        if (minuteToUse !== undefined && minuteToUse !== null) {
                          finalizeSelection(h, minuteToUse);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedHour === h && styles.optionTextSelected,
                        ]}
                      >
                        {String(h).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Minutes */}
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Minute</Text>
                <ScrollView
                  style={styles.scroll}
                  showsVerticalScrollIndicator={false}
                >
                  {minutes.map(m => (
                    <Pressable
                      key={m}
                      style={[
                        styles.option,
                        selectedMinute === m && styles.optionSelected,
                      ]}
                      onPress={() => {
                        setTempMinute(m);
                        // If hour already chosen in this session or existing value, finalize
                        const hourToUse = tempHour ?? selectedHour ?? 0;
                        finalizeSelection(hourToUse, m);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedMinute === m && styles.optionTextSelected,
                        ]}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
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
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.error,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputDisabled: {
    backgroundColor: colors.backgroundSecondary,
    opacity: 0.6,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  textDisabled: {
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 360,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 6,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerColumn: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  scroll: {
    maxHeight: 220,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
