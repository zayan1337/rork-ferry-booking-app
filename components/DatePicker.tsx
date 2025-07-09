import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Platform,
  ScrollView
} from 'react-native';
import { Calendar } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Button from './Button';
import { DatePickerProps } from '@/types/components';

const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  error,
  disabled = false,
  required = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<string | null>(value);
  
  // Generate dates for the next 3 months
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    const minDateTime = minDate ? new Date(minDate).getTime() : today.getTime();
    
    // Generate dates for the next 90 days
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Skip dates before minDate
      if (date.getTime() < minDateTime) continue;
      
      // Stop if we've reached maxDate
      if (maxDate && date > new Date(maxDate)) break;
      
      dates.push({
        dateString: date.toISOString().split('T')[0],
        day: date.getDate(),
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        dayName: date.toLocaleString('default', { weekday: 'short' }),
      });
    }
    
    return dates;
  };
  
  const dates = generateDates();
  
  const handleConfirm = () => {
    if (tempDate) {
      onChange(tempDate);
    }
    setModalVisible(false);
  };
  
  const handleCancel = () => {
    setTempDate(value);
    setModalVisible(false);
  };
  
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.pickerContainer,
          error ? styles.pickerError : null,
          disabled ? styles.pickerDisabled : null
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text 
          style={[
            styles.pickerText, 
            !value && styles.placeholderText
          ]}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Calendar size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
            </View>
            
            <ScrollView style={styles.dateList}>
              {dates.map((date) => (
                <TouchableOpacity
                  key={date.dateString}
                  style={[
                    styles.dateItem,
                    tempDate === date.dateString && styles.selectedDateItem
                  ]}
                  onPress={() => setTempDate(date.dateString)}
                >
                  <View style={styles.dateLeft}>
                    <Text style={styles.dayName}>{date.dayName}</Text>
                    <Text 
                      style={[
                        styles.dateText,
                        tempDate === date.dateString && styles.selectedDateText
                      ]}
                    >
                      {date.day} {date.month} {date.year}
                    </Text>
                  </View>
                  
                  {tempDate === date.dateString && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button 
                title="Cancel" 
                onPress={handleCancel} 
                variant="outline"
                style={styles.footerButton}
              />
              <Button 
                title="Confirm" 
                onPress={handleConfirm} 
                disabled={!tempDate}
                style={styles.footerButton}
              />
            </View>
          </View>
        </View>
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
  dateList: {
    maxHeight: 400,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedDateItem: {
    backgroundColor: Colors.highlight,
  },
  dateLeft: {
    flex: 1,
  },
  dayName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedDateText: {
    fontWeight: '600',
    color: Colors.primary,
  },
  selectedIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default DatePicker;