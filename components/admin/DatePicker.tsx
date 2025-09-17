import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  error,
  disabled = false,
  required = false,
}: DatePickerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => {
    // Initialize to today's date
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(`${value}T00:00:00`) : null
  );
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Get current year, month, and day
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  // Get selected year, month, and day
  const selectedYear = selectedDate?.getFullYear() || currentYear;
  const selectedMonth = selectedDate?.getMonth() || currentMonth;
  const selectedDay = selectedDate?.getDate() || currentDay;

  // Generate calendar data
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Add empty cells at the end to complete the grid (ensure we have complete weeks)
    const totalCells = days.length;
    const remainingCells = totalCells % 7;
    if (remainingCells !== 0) {
      const cellsToAdd = 7 - remainingCells;
      for (let i = 0; i < cellsToAdd; i++) {
        days.push(null);
      }
    }

    return days;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);

    // Auto-confirm: format the date and call onChange immediately
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayFormatted = String(newDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${dayFormatted}`;

    onChange(formattedDate);
    setIsVisible(false);
  };

  const handleConfirm = () => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      onChange(formattedDate);
    }
    setIsVisible(false);
  };

  const handleCancel = () => {
    setSelectedDate(value ? new Date(`${value}T00:00:00`) : null);
    setIsVisible(false);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);

    // Auto-select today's date and close modal
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    onChange(formattedDate);
    setIsVisible(false);
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(`${dateString}T00:00:00`);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate &&
      day === selectedDate.getDate() &&
      currentMonth === selectedDate.getMonth() &&
      currentYear === selectedDate.getFullYear()
    );
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Generate year options (current year ± 50 years)
  const currentYearNum = new Date().getFullYear();
  const yearOptions = [];
  for (let year = currentYearNum - 50; year <= currentYearNum + 50; year++) {
    yearOptions.push(year);
  }

  const handleYearChange = (year: number) => {
    setCurrentDate(new Date(year, currentMonth, 1));
    setShowYearPicker(false);
  };

  const handleMonthChange = (month: number) => {
    setCurrentDate(new Date(currentYear, month, 1));
    setShowMonthPicker(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.input,
          error && styles.inputError,
          disabled && styles.inputDisabled,
        ]}
        onPress={() => {
          if (!disabled) {
            // Reset to current date when opening if no date is selected
            if (!value) {
              const today = new Date();
              setCurrentDate(
                new Date(today.getFullYear(), today.getMonth(), today.getDate())
              );
            } else {
              // Navigate to the selected date's month/year
              const selectedDateObj = new Date(`${value}T00:00:00`);
              setCurrentDate(
                new Date(
                  selectedDateObj.getFullYear(),
                  selectedDateObj.getMonth(),
                  selectedDateObj.getDate()
                )
              );
            }
            setIsVisible(true);
          }
        }}
        disabled={disabled}
      >
        <Text
          style={[
            styles.inputText,
            !value && styles.placeholder,
            disabled && styles.textDisabled,
          ]}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Calendar size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType='fade'
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Year and Month Selection */}
            <View style={styles.yearMonthSelector}>
              {/* Year Selector */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Year</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowYearPicker(!showYearPicker)}
                >
                  <Text style={styles.selectorButtonText}>{currentYear}</Text>
                  <ChevronDown
                    size={16}
                    color={colors.textSecondary}
                    style={[
                      styles.chevronIcon,
                      showYearPicker && styles.chevronIconRotated,
                    ]}
                  />
                </TouchableOpacity>

                {showYearPicker && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={false}
                    >
                      {yearOptions.map(year => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.dropdownOption,
                            currentYear === year &&
                              styles.dropdownOptionSelected,
                          ]}
                          onPress={() => handleYearChange(year)}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              currentYear === year &&
                                styles.dropdownOptionTextSelected,
                            ]}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Month Selector */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Month</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowMonthPicker(!showMonthPicker)}
                >
                  <Text style={styles.selectorButtonText}>
                    {monthNames[currentMonth]}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={colors.textSecondary}
                    style={[
                      styles.chevronIcon,
                      showMonthPicker && styles.chevronIconRotated,
                    ]}
                  />
                </TouchableOpacity>

                {showMonthPicker && (
                  <View style={styles.dropdownContainer}>
                    <ScrollView
                      style={styles.dropdownScrollView}
                      showsVerticalScrollIndicator={false}
                    >
                      {monthNames.map((month, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownOption,
                            currentMonth === index &&
                              styles.dropdownOptionSelected,
                          ]}
                          onPress={() => handleMonthChange(index)}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              currentMonth === index &&
                                styles.dropdownOptionTextSelected,
                            ]}
                          >
                            {month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                onPress={goToPreviousMonth}
                style={styles.navButton}
              >
                <ChevronLeft size={20} color={colors.primary} />
              </TouchableOpacity>

              <Text style={styles.monthYearText}>
                {monthNames[currentMonth]} {currentYear}
              </Text>

              <TouchableOpacity
                onPress={goToNextMonth}
                style={styles.navButton}
              >
                <ChevronRight size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Today Button */}
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {/* Day headers */}
              <View style={styles.dayHeaders}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <Text key={day} style={styles.dayHeader}>
                    {day}
                  </Text>
                ))}
              </View>

              {/* Calendar days - organized in rows */}
              <View style={styles.daysContainer}>
                {Array.from(
                  { length: Math.ceil(calendarDays.length / 7) },
                  (_, weekIndex) => (
                    <View key={weekIndex} style={styles.weekRow}>
                      {calendarDays
                        .slice(weekIndex * 7, (weekIndex + 1) * 7)
                        .map((day, dayIndex) => (
                          <TouchableOpacity
                            key={`${weekIndex}-${dayIndex}`}
                            style={[
                              styles.dayCell,
                              day && isToday(day) ? styles.todayCell : null,
                              day && isSelected(day)
                                ? styles.selectedCell
                                : null,
                            ]}
                            onPress={() => day && handleDateSelect(day)}
                            disabled={!day}
                          >
                            {day && (
                              <Text
                                style={[
                                  styles.dayText,
                                  isToday(day) && styles.todayText,
                                  isSelected(day) && styles.selectedText,
                                ]}
                              >
                                {day}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                    </View>
                  )
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                style={styles.confirmButton}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 350,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  yearMonthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  selectorContainer: {
    flex: 1,
    position: 'relative',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  chevronIcon: {
    marginLeft: 8,
  },
  chevronIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginTop: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
    maxHeight: 200,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primaryLight,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  todayButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    marginBottom: 16,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  calendarGrid: {
    marginBottom: 20,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingVertical: 8,
  },
  daysContainer: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    marginHorizontal: 1,
  },
  todayCell: {
    backgroundColor: colors.primaryLight,
  },
  selectedCell: {
    backgroundColor: colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: colors.text,
  },
  todayText: {
    color: colors.primary,
    fontWeight: '600',
  },
  selectedText: {
    color: colors.white,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
});
