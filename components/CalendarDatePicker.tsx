import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { DatePickerProps } from '@/types/components';

const CalendarDatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  error,
  disabled = false,
  required = false,
  hideInput = false,
  visible,
  onClose,
}) => {
  const [internalModalVisible, setInternalModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<string | null>(value);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    value ? new Date(value) : new Date()
  );
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('day');
  const scrollViewRef = useRef<ScrollView>(null);

  // Use external visibility if provided, otherwise use internal state
  const modalVisible = visible !== undefined ? visible : internalModalVisible;

  useEffect(() => {
    setTempDate(value);
  }, [value]);

  // Auto-scroll to current year when year view opens
  useEffect(() => {
    if (viewMode === 'year' && scrollViewRef.current) {
      // Small delay to ensure the view is rendered
      setTimeout(() => {
        const currentYear = currentMonth.getFullYear();
        const years = generateYears();
        const currentYearIndex = years.indexOf(currentYear);

        if (currentYearIndex !== -1) {
          // Each year item is approximately 70px (paddingVertical 20 + margin)
          const itemHeight = 70;
          const scrollToPosition = Math.max(
            0,
            (currentYearIndex * itemHeight) / 3 - 100
          );

          scrollViewRef.current?.scrollTo({
            y: scrollToPosition,
            animated: true,
          });
        }
      }, 100);
    }
  }, [viewMode]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const generateCalendarDays = () => {
    const { daysInMonth, startingDayOfWeek, year, month } =
      getDaysInMonth(currentMonth);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date | null) => {
    if (!date) return true;

    const dateString = formatDate(date);

    // Compare date strings instead of timestamps to avoid timezone issues
    if (minDate && dateString < minDate) return true;
    if (maxDate && dateString > maxDate) return true;

    return false;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleSelectDate = (date: Date) => {
    if (!isDateDisabled(date)) {
      setTempDate(formatDate(date));
    }
  };

  const handleConfirm = () => {
    if (tempDate) {
      onChange(tempDate);
    }
    if (onClose) {
      onClose();
    } else {
      setInternalModalVisible(false);
    }
  };

  const handleCancel = () => {
    setTempDate(value);
    setCurrentMonth(value ? new Date(value) : new Date());
    if (onClose) {
      onClose();
    } else {
      setInternalModalVisible(false);
    }
  };

  const handleOpen = () => {
    setTempDate(value);
    setCurrentMonth(value ? new Date(value) : new Date());
    setViewMode('day');
    setInternalModalVisible(true);
  };

  const generateYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    const startYear = 1900; // Start from 1900
    const endYear = currentYear + 50; // Go 50 years into the future

    for (let year = endYear; year >= startYear; year--) {
      years.push(year);
    }

    return years;
  };

  const generateMonths = () => {
    const months = [
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
    return months;
  };

  const handleSelectYear = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setViewMode('month');
  };

  const handleSelectMonth = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
    setViewMode('day');
  };

  const handleMonthYearClick = () => {
    setViewMode('month');
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date || !tempDate) return false;
    return formatDate(date) === tempDate;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = generateCalendarDays();

  return (
    <View style={styles.container}>
      {!hideInput && (
        <>
          {label && (
            <Text style={styles.label}>
              {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
          )}

          <Pressable
            style={[
              styles.pickerContainer,
              error ? styles.pickerError : null,
              disabled ? styles.pickerDisabled : null,
            ]}
            onPress={() => !disabled && handleOpen()}
            disabled={disabled}
          >
            <Text style={[styles.pickerText, !value && styles.placeholderText]}>
              {value ? formatDisplayDate(value) : placeholder}
            </Text>
            <Calendar size={20} color={Colors.textSecondary} />
          </Pressable>

          {error && <Text style={styles.errorText}>{error}</Text>}
        </>
      )}

      <Modal
        visible={modalVisible}
        animationType='slide'
        transparent={true}
        // Note: Don't use presentationStyle: 'pageSheet' with transparent modals
        // as it causes the overlay background not to display correctly on iOS
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header with Month/Year and Navigation */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
            </View>

            <View style={styles.monthNavigation}>
              {viewMode === 'day' && (
                <>
                  <Pressable
                    style={styles.navButton}
                    onPress={handlePreviousMonth}
                  >
                    <ChevronLeft size={24} color={Colors.primary} />
                  </Pressable>

                  <Pressable onPress={handleMonthYearClick}>
                    <Text style={styles.monthYearText}>
                      {currentMonth.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.navButton} onPress={handleNextMonth}>
                    <ChevronRight size={24} color={Colors.primary} />
                  </Pressable>
                </>
              )}

              {viewMode === 'month' && (
                <>
                  <Pressable
                    style={styles.navButton}
                    onPress={() => setViewMode('year')}
                  >
                    <ChevronLeft size={24} color={Colors.primary} />
                  </Pressable>

                  <Pressable onPress={() => setViewMode('year')}>
                    <Text style={styles.monthYearText}>
                      {currentMonth.getFullYear()}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.navButton}
                    onPress={() => setViewMode('day')}
                  >
                    <ChevronRight size={24} color={Colors.primary} />
                  </Pressable>
                </>
              )}

              {viewMode === 'year' && (
                <>
                  <View style={styles.navButton} />
                  <Text style={styles.monthYearText}>Select Year</Text>
                  <Pressable
                    style={styles.navButton}
                    onPress={() => setViewMode('month')}
                  >
                    <ChevronRight size={24} color={Colors.primary} />
                  </Pressable>
                </>
              )}
            </View>

            {/* Calendar Content - Changes based on view mode */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.calendarContainer}
              showsVerticalScrollIndicator={true}
            >
              {viewMode === 'year' && (
                <View style={styles.yearGrid}>
                  {generateYears().map(year => (
                    <Pressable
                      key={year}
                      style={[
                        styles.yearMonthItem,
                        currentMonth.getFullYear() === year &&
                          styles.selectedYearMonth,
                      ]}
                      onPress={() => handleSelectYear(year)}
                    >
                      <Text
                        style={[
                          styles.yearMonthText,
                          currentMonth.getFullYear() === year &&
                            styles.selectedYearMonthText,
                        ]}
                      >
                        {year}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {viewMode === 'month' && (
                <View style={styles.monthGrid}>
                  {generateMonths().map((month, index) => (
                    <Pressable
                      key={month}
                      style={[
                        styles.yearMonthItem,
                        currentMonth.getMonth() === index &&
                          styles.selectedYearMonth,
                      ]}
                      onPress={() => handleSelectMonth(index)}
                    >
                      <Text
                        style={[
                          styles.yearMonthText,
                          currentMonth.getMonth() === index &&
                            styles.selectedYearMonthText,
                        ]}
                      >
                        {month}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {viewMode === 'day' && (
                <>
                  {/* Week Day Headers */}
                  <View style={styles.weekDaysRow}>
                    {weekDays.map(day => (
                      <View key={day} style={styles.weekDayCell}>
                        <Text style={styles.weekDayText}>{day}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Calendar Days Grid */}
                  <View style={styles.daysGrid}>
                    {calendarDays.map((date, index) => {
                      const disabled = isDateDisabled(date);
                      const selected = isSelected(date);
                      const today = isToday(date);
                      const isCurrentDay = today && !selected;

                      return (
                        <View key={index} style={styles.dayCell}>
                          <Pressable
                            style={[
                              styles.dayInner,
                              !date && styles.emptyCell,
                              selected && styles.selectedDayCell,
                              isCurrentDay && styles.todayCell,
                            ]}
                            onPress={() => date && handleSelectDate(date)}
                            disabled={disabled || !date}
                          >
                            {date && (
                              <Text
                                style={[
                                  styles.dayText,
                                  disabled && styles.disabledDayText,
                                  selected && styles.selectedDayText,
                                  isCurrentDay && styles.todayText,
                                ]}
                              >
                                {date.getDate()}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Selected Date Display - Only show in day view */}
            {tempDate && viewMode === 'day' && (
              <View style={styles.selectedDateContainer}>
                <Text style={styles.selectedDateLabel}>Selected Date:</Text>
                <Text style={styles.selectedDateValue}>
                  {formatDisplayDate(tempDate)}
                </Text>
              </View>
            )}

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              <Button
                title='Cancel'
                onPress={handleCancel}
                variant='outline'
                style={styles.footerButton}
              />
              <Button
                title='Confirm'
                onPress={handleConfirm}
                disabled={!tempDate}
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: Colors.card,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  pickerError: {
    borderColor: Colors.error,
  },
  pickerDisabled: {
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
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
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
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: 400,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  selectedDayCell: {
    backgroundColor: Colors.primary,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  disabledDayText: {
    color: Colors.textSecondary,
    opacity: 0.3,
  },
  selectedDayText: {
    color: Colors.card,
    fontWeight: '700',
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedDateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.highlight,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  selectedDateLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  selectedDateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  yearMonthItem: {
    width: '31%',
    margin: '1%',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedYearMonth: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  yearMonthText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedYearMonthText: {
    color: Colors.card,
  },
});

export default CalendarDatePicker;
