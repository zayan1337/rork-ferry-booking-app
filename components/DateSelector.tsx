import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Calendar } from 'lucide-react-native';
import colors from '@/constants/colors';
import { DateSelectorProps } from '@/types/components';

export const DateSelector: React.FC<DateSelectorProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  isDateOfBirth = false,
  error,
  required = false,
  labelStyle,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'day'>(
    isDateOfBirth ? 'year' : 'day'
  );

  // Generate dates based on context (future dates for regular, past dates for DOB)
  const generateDates = () => {
    if (isDateOfBirth) {
      // For DOB, we're in day view and have selected year and month
      if (
        viewMode === 'day' &&
        selectedYear !== null &&
        selectedMonth !== null
      ) {
        const daysInMonth = new Date(
          selectedYear,
          selectedMonth + 1,
          0
        ).getDate();
        const days = [];

        for (let i = 1; i <= daysInMonth; i++) {
          const date = new Date(selectedYear, selectedMonth, i);

          // Check if date is within allowed range
          const dateString = formatDate(date);
          const isAfterMin = !minDate || dateString >= minDate;
          const isBeforeMax = !maxDate || dateString <= maxDate;

          if (isAfterMin && isBeforeMax) {
            days.push(date);
          }
        }

        return days;
      }
      return [];
    } else {
      // Regular date selector (future dates)
      const dates = [];
      const today = new Date();
      const min = minDate ? new Date(minDate) : today;
      const max = maxDate ? new Date(maxDate) : new Date(today);

      if (!maxDate) {
        max.setDate(today.getDate() + 30);
      }

      for (
        let date = new Date(min);
        date <= max;
        date.setDate(date.getDate() + 1)
      ) {
        dates.push(new Date(date));
      }

      return dates;
    }
  };

  // Generate years for DOB selector (100 years back from max date)
  const generateYears = () => {
    const years = [];
    const endYear = maxDate
      ? new Date(maxDate).getFullYear()
      : new Date().getFullYear();
    const startYear = endYear - 100; // 100 years back

    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }

    return years;
  };

  // Generate months for the selected year
  const generateMonths = () => {
    if (selectedYear === null) return [];

    const months = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // If selected year is current year, only show months up to current month
    const monthLimit =
      selectedYear === currentYear && isDateOfBirth ? currentMonth : 11;

    for (let month = 0; month <= monthLimit; month++) {
      months.push(month);
    }

    return months;
  };

  const formatDate = (date: Date) => {
    // Adjust the date to handle timezone offset
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string) => {
    // Create date object by parsing the date string parts to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month, 1).toLocaleDateString('en-US', {
      month: 'long',
    });
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setViewMode('month');
  };

  const handleSelectMonth = (month: number) => {
    setSelectedMonth(month);
    setViewMode('day');
  };

  const handleSelectDay = (date: Date) => {
    onChange(formatDate(date));
    setModalVisible(false);
    // Reset view mode for next time
    if (isDateOfBirth) {
      setViewMode('year');
    }
  };

  const handleOpenModal = () => {
    // If DOB and we have a value, parse it to set initial year/month
    if (isDateOfBirth && value) {
      const date = new Date(value);
      setSelectedYear(date.getFullYear());
      setSelectedMonth(date.getMonth());
      setViewMode('day'); // Go directly to day view
    } else if (isDateOfBirth) {
      // Reset to year view if no value
      setViewMode('year');
    }

    setModalVisible(true);
  };

  const handleBack = () => {
    if (viewMode === 'day') {
      setViewMode('month');
    } else if (viewMode === 'month') {
      setViewMode('year');
    }
  };

  const renderModalContent = () => {
    if (isDateOfBirth) {
      if (viewMode === 'year') {
        return (
          <FlatList
            key='yearGrid'
            data={generateYears()}
            keyExtractor={item => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.yearItem}
                onPress={() => handleSelectYear(item)}
              >
                <Text style={styles.yearText}>{item}</Text>
              </TouchableOpacity>
            )}
            numColumns={3}
            contentContainerStyle={styles.yearGrid}
          />
        );
      } else if (viewMode === 'month') {
        return (
          <FlatList
            key='monthGrid'
            data={generateMonths()}
            keyExtractor={item => item.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.monthItem}
                onPress={() => handleSelectMonth(item)}
              >
                <Text style={styles.monthText}>{getMonthName(item)}</Text>
              </TouchableOpacity>
            )}
            numColumns={2}
            contentContainerStyle={styles.monthGrid}
          />
        );
      }
    }

    // Default day view for both DOB and regular
    return (
      <FlatList
        key='dayGrid'
        data={generateDates()}
        keyExtractor={item => formatDate(item)}
        renderItem={({ item }) => {
          const dateString = formatDate(item);
          const isSelected = value === dateString;

          return (
            <TouchableOpacity
              style={[styles.dateItem, isSelected && styles.selectedItem]}
              onPress={() => handleSelectDay(item)}
            >
              <Text
                style={[styles.dayName, isSelected && styles.selectedItemText]}
              >
                {item.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.selectedItemText,
                ]}
              >
                {item.getDate()}
              </Text>
              <Text
                style={[
                  styles.monthYear,
                  isSelected && styles.selectedItemText,
                ]}
              >
                {item.toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={handleOpenModal}
      >
        <View style={styles.selectorContent}>
          <Calendar
            size={20}
            color={colors.textSecondary}
            style={styles.calendarIcon}
          />
          <Text style={value ? styles.selectedText : styles.placeholderText}>
            {value ? formatDisplayDate(value) : 'Select a date'}
          </Text>
        </View>
        <ChevronDown size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType='slide'
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {isDateOfBirth && viewMode !== 'year' ? (
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.placeholder} />
              )}

              <Text style={styles.modalTitle}>
                {isDateOfBirth
                  ? viewMode === 'year'
                    ? 'Select Year'
                    : viewMode === 'month'
                      ? 'Select Month'
                      : 'Select Day'
                  : 'Select a Date'}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  if (isDateOfBirth) setViewMode('year');
                }}
              >
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            {renderModalContent()}
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
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 8,
  },
  selectedText: {
    fontSize: 16,
    color: colors.text,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  backButton: {
    paddingRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
  },
  dateItem: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedItem: {
    backgroundColor: colors.highlight,
  },
  selectedItemText: {
    color: colors.primary,
    fontWeight: '600',
  },
  dayName: {
    fontSize: 16,
    color: colors.text,
    width: 50,
  },
  dayNumber: {
    fontSize: 16,
    color: colors.text,
    width: 30,
    textAlign: 'center',
    fontWeight: '600',
  },
  monthYear: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  yearGrid: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  yearItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    margin: 4,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  yearText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
  monthGrid: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  monthItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    margin: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  monthText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '500',
  },
});
