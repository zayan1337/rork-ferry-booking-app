import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Platform,
  Keyboard,
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
  const [tempHour, setTempHour] = useState<number | null>(null);
  const [tempMinute, setTempMinute] = useState<number | null>(null);

  const { selectedHour, selectedMinute } = useMemo(() => {
    const [h, m] = (value || '').split(':');
    return {
      selectedHour: Number.isFinite(parseInt(h)) ? parseInt(h) : undefined,
      selectedMinute: Number.isFinite(parseInt(m)) ? parseInt(m) : undefined,
    };
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  useEffect(() => {
    if (isVisible) {
      setTempHour(selectedHour ?? 0);
      setTempMinute(selectedMinute ?? 0);
    } else {
      setTempHour(null);
      setTempMinute(null);
    }
  }, [isVisible, selectedHour, selectedMinute]);

  const previewDisplay = useMemo(() => {
    if (tempHour === null || tempMinute === null) return '--:--';
    const hour12 =
      tempHour === 0 ? 12 : tempHour > 12 ? tempHour - 12 : tempHour;
    const period = tempHour >= 12 ? 'PM' : 'AM';
    return `${hour12.toString().padStart(2, '0')}:${tempMinute
      .toString()
      .padStart(2, '0')} ${period}`;
  }, [tempHour, tempMinute]);

  const handleConfirm = () => {
    if (tempHour === null || tempMinute === null) return;
    const hh = String(tempHour).padStart(2, '0');
    const mm = String(tempMinute).padStart(2, '0');
    onChange(`${hh}:${mm}`);
    Keyboard.dismiss();
    setIsVisible(false);
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setIsVisible(false);
  };

  const quickMinutes = [0, 15, 30, 45];

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
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <Pressable onPress={handleCancel} style={styles.closeButton}>
                <X size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Selected Time</Text>
              <Text style={styles.previewValue}>{previewDisplay}</Text>
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
                        tempHour === h && styles.optionSelected,
                      ]}
                      onPress={() => setTempHour(h)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          tempHour === h && styles.optionTextSelected,
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
                        tempMinute === m && styles.optionSelected,
                      ]}
                      onPress={() => setTempMinute(m)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          tempMinute === m && styles.optionTextSelected,
                        ]}
                      >
                        {String(m).padStart(2, '0')}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.quickRow}>
              <Text style={styles.quickLabel}>Quick minutes</Text>
              <View style={styles.quickChips}>
                {quickMinutes.map(min => (
                  <Pressable
                    key={min}
                    style={[
                      styles.quickChip,
                      tempMinute === min && styles.quickChipActive,
                    ]}
                    onPress={() => setTempMinute(min)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        tempMinute === min && styles.quickChipTextActive,
                      ]}
                    >
                      {String(min).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={handleCancel}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.primaryButton,
                  (tempHour === null || tempMinute === null) &&
                    styles.primaryButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={tempHour === null || tempMinute === null}
              >
                <Text style={styles.primaryButtonText}>Confirm</Text>
              </Pressable>
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
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  previewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  quickRow: {
    marginBottom: 16,
  },
  quickLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  quickChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  quickChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quickChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  quickChipTextActive: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
});
