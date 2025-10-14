import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { X, Download, FileText, Check } from 'lucide-react-native';
import { DateSelector } from '@/components/DateSelector';

export type FileType = 'excel' | 'pdf' | 'csv';

export interface ExportFilter {
  dateFrom: Date | null;
  dateTo: Date | null;
  selectedRoles: string[];
  fileType: FileType;
}

interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (filters: ExportFilter) => Promise<void>;
  title?: string;
  description?: string;
  roleOptions?: { value: string; label: string }[];
  showRoleFilter?: boolean;
  showDateFilter?: boolean;
  fileTypes?: FileType[];
}

export default function ExportModal({
  visible,
  onClose,
  onExport,
  title = 'Export Data',
  description = 'Select filters and file type to export data',
  roleOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'admin', label: 'Admins' },
    { value: 'agent', label: 'Agents' },
    { value: 'customer', label: 'Customers' },
    { value: 'passenger', label: 'Passengers' },
    { value: 'captain', label: 'Captains' },
  ],
  showRoleFilter = true,
  showDateFilter = true,
  fileTypes = ['excel', 'pdf', 'csv'],
}: ExportModalProps) {
  // Get today's date as max date
  const getMaxDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get one month ago date
  const getOneMonthAgo = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  };

  const [dateFrom, setDateFrom] = useState<string>(getOneMonthAgo());
  const [dateTo, setDateTo] = useState<string>(getMaxDate());
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['all']);
  const [fileType, setFileType] = useState<FileType>('excel');
  const [exporting, setExporting] = useState(false);

  const handleRoleToggle = (role: string) => {
    if (role === 'all') {
      // If "All" is selected, deselect all others
      setSelectedRoles(['all']);
    } else {
      // If any specific role is selected, remove "All"
      let newRoles = selectedRoles.includes(role)
        ? selectedRoles.filter(r => r !== role)
        : [...selectedRoles.filter(r => r !== 'all'), role];

      // If no roles selected, default to "All"
      if (newRoles.length === 0) {
        newRoles = ['all'];
      }

      setSelectedRoles(newRoles);
    }
  };

  const handleExport = async () => {
    // Validate date range
    if (showDateFilter && dateFrom && dateTo) {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (fromDate > toDate) {
        Alert.alert(
          'Invalid Date Range',
          'Start date must be before end date.'
        );
        return;
      }
    }

    setExporting(true);
    try {
      await onExport({
        dateFrom: dateFrom ? new Date(dateFrom) : null,
        dateTo: dateTo ? new Date(dateTo) : null,
        selectedRoles,
        fileType,
      });
      handleClose();
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    // Reset state to defaults
    setDateFrom(getOneMonthAgo());
    setDateTo(getMaxDate());
    setSelectedRoles(['all']);
    setFileType('excel');
    setExporting(false);
    onClose();
  };

  const getFileTypeIcon = (type: FileType) => {
    return <FileText size={18} color={colors.primary} />;
  };

  const getFileTypeLabel = (type: FileType) => {
    switch (type) {
      case 'excel':
        return 'Excel (.xls)';
      case 'pdf':
        return 'HTML/PDF (.html)';
      case 'csv':
        return 'CSV (.csv)';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Download size={24} color={colors.primary} />
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={exporting}
            >
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>{description}</Text>

            {/* Date Range Filter */}
            {showDateFilter && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Date Range (Default: Last Month)
                </Text>
                <View style={styles.dateRangeContainer}>
                  <DateSelector
                    label='From Date'
                    value={dateFrom}
                    onChange={setDateFrom}
                    maxDate={dateTo || getMaxDate()}
                    isDateOfBirth={true}
                  />
                  <DateSelector
                    label='To Date'
                    value={dateTo}
                    onChange={setDateTo}
                    minDate={dateFrom || undefined}
                    maxDate={getMaxDate()}
                    isDateOfBirth={true}
                  />
                </View>

                {/* Reset dates button */}
                {(dateFrom !== getOneMonthAgo() || dateTo !== getMaxDate()) && (
                  <TouchableOpacity
                    style={styles.clearDatesButton}
                    onPress={() => {
                      setDateFrom(getOneMonthAgo());
                      setDateTo(getMaxDate());
                    }}
                    disabled={exporting}
                  >
                    <Text style={styles.clearDatesText}>
                      Reset to Default (Last Month)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Role Filter */}
            {showRoleFilter && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Select Roles</Text>
                <View style={styles.checkboxContainer}>
                  {roleOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.checkboxItem}
                      onPress={() => handleRoleToggle(option.value)}
                      disabled={exporting}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          selectedRoles.includes(option.value) &&
                            styles.checkboxSelected,
                        ]}
                      >
                        {selectedRoles.includes(option.value) && (
                          <Check size={16} color='white' />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* File Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>File Type</Text>
              <View style={styles.fileTypeContainer}>
                {fileTypes.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.fileTypeButton,
                      fileType === type && styles.fileTypeButtonSelected,
                    ]}
                    onPress={() => setFileType(type)}
                    disabled={exporting}
                  >
                    {getFileTypeIcon(type)}
                    <Text
                      style={[
                        styles.fileTypeText,
                        fileType === type && styles.fileTypeTextSelected,
                      ]}
                    >
                      {getFileTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={exporting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.exportButton,
                exporting && styles.exportButtonDisabled,
              ]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Download size={18} color='white' />
              <Text style={styles.exportButtonText}>
                {exporting ? 'Exporting...' : 'Export'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dateRangeContainer: {
    gap: 0,
  },
  clearDatesButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: `${colors.error}10`,
    borderRadius: 6,
  },
  clearDatesText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
  checkboxContainer: {
    gap: 10,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: `${colors.primary}40`,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  fileTypeContainer: {
    gap: 10,
  },
  fileTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  fileTypeButtonSelected: {
    backgroundColor: `${colors.primary}10`,
    borderColor: colors.primary,
  },
  fileTypeText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  fileTypeTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
