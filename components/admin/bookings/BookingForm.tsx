import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBookingFormData, AdminPassenger } from '@/types/admin/management';
import Button from '@/components/admin/Button';
import TextInput from '@/components/admin/TextInput';
import Dropdown from '@/components/admin/Dropdown';
import { Save, X, Plus, Trash2 } from 'lucide-react-native';

interface BookingFormProps {
  initialData?: Partial<AdminBookingFormData>;
  onSave: (data: AdminBookingFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
}

interface FormErrors {
  user_id?: string;
  trip_id?: string;
  total_fare?: string;
  passengers?: string;
  [key: string]: string | undefined;
}

export default function BookingForm({
  initialData,
  onSave,
  onCancel,
  loading = false,
  title = 'Booking Form',
}: BookingFormProps) {
  const [formData, setFormData] = useState<AdminBookingFormData>({
    user_id: '',
    trip_id: '',
    is_round_trip: false,
    total_fare: 0,
    passengers: [],
    ...initialData,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableTrips, setAvailableTrips] = useState<any[]>([]);

  // Mock data - in real app, these would come from props or API
  useEffect(() => {
    // Simulate loading users and trips
    setAvailableUsers([
      { id: '1', label: 'John Doe (john@example.com)', value: '1' },
      { id: '2', label: 'Jane Smith (jane@example.com)', value: '2' },
    ]);
    setAvailableTrips([
      { id: '1', label: 'Morning Ferry - Island A to B', value: '1' },
      { id: '2', label: 'Afternoon Ferry - Island B to A', value: '2' },
    ]);
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Customer is required';
    }
    if (!formData.trip_id) {
      newErrors.trip_id = 'Trip is required';
    }
    if (!formData.total_fare || formData.total_fare <= 0) {
      newErrors.total_fare = 'Valid total fare is required';
    }
    if (!formData.passengers || formData.passengers.length === 0) {
      newErrors.passengers = 'At least one passenger is required';
    }

    // Validate passenger data
    formData.passengers?.forEach((passenger, index) => {
      if (!passenger.passenger_name?.trim()) {
        newErrors[`passenger_${index}_name`] = 'Passenger name is required';
      }
      if (!passenger.passenger_contact_number?.trim()) {
        newErrors[`passenger_${index}_contact`] = 'Contact number is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    try {
      await onSave(formData);
    } catch (error) {
      Alert.alert('Error', 'Failed to save booking. Please try again.');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All changes will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: onCancel },
      ]
    );
  };

  const updateFormData = (field: keyof AdminBookingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addPassenger = () => {
    const newPassenger: AdminPassenger = {
      passenger_name: '',
      passenger_contact_number: '',
      special_assistance_request: '',
    };
    setFormData(prev => ({
      ...prev,
      passengers: [...(prev.passengers || []), newPassenger],
    }));
  };

  const removePassenger = (index: number) => {
    setFormData(prev => ({
      ...prev,
      passengers: prev.passengers?.filter((_, i) => i !== index) || [],
    }));
  };

  const updatePassenger = (
    index: number,
    field: keyof AdminPassenger,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      passengers:
        prev.passengers?.map((passenger, i) =>
          i === index ? { ...passenger, [field]: value } : passenger
        ) || [],
    }));

    // Clear error when user makes changes
    const errorKey = `passenger_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: undefined }));
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Trip Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Information</Text>

          <Dropdown
            label='Customer'
            options={availableUsers}
            value={formData.user_id}
            onValueChange={value => updateFormData('user_id', value)}
            placeholder='Select a customer...'
            error={errors.user_id}
            required
          />

          <Dropdown
            label='Trip'
            options={availableTrips}
            value={formData.trip_id}
            onValueChange={value => updateFormData('trip_id', value)}
            placeholder='Select a trip...'
            error={errors.trip_id}
            required
          />

          <TextInput
            label='Total Fare *'
            value={formData.total_fare?.toString() || ''}
            onChangeText={value =>
              updateFormData('total_fare', parseFloat(value) || 0)
            }
            placeholder='0.00'
            keyboardType='decimal-pad'
            error={errors.total_fare}
            required
          />

          <View style={styles.checkboxContainer}>
            <Text style={styles.label}>Round Trip</Text>
            <View style={styles.checkbox}>
              <Text style={styles.checkboxText}>
                {formData.is_round_trip ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        {/* Passenger Information */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Passenger Information</Text>
            <Button
              title='Add Passenger'
              variant='outline'
              size='small'
              icon={<Plus size={16} color={colors.primary} />}
              onPress={addPassenger}
            />
          </View>

          {errors.passengers && (
            <Text style={styles.errorText}>{errors.passengers}</Text>
          )}

          {formData.passengers?.map((passenger, index) => (
            <View key={index} style={styles.passengerCard}>
              <View style={styles.passengerHeader}>
                <Text style={styles.passengerTitle}>Passenger {index + 1}</Text>
                {formData.passengers!.length > 1 && (
                  <Button
                    title=''
                    variant='danger'
                    size='small'
                    icon={<Trash2 size={16} color='#FFFFFF' />}
                    onPress={() => removePassenger(index)}
                  />
                )}
              </View>

              <TextInput
                label='Full Name *'
                value={passenger.passenger_name || ''}
                onChangeText={value =>
                  updatePassenger(index, 'passenger_name', value)
                }
                placeholder='Enter full name'
                error={errors[`passenger_${index}_name`]}
              />

              <TextInput
                label='Contact Number *'
                value={passenger.passenger_contact_number || ''}
                onChangeText={value =>
                  updatePassenger(index, 'passenger_contact_number', value)
                }
                placeholder='Enter contact number'
                keyboardType='phone-pad'
                error={errors[`passenger_${index}_contact`]}
              />

              <TextInput
                label='Special Assistance (Optional)'
                value={passenger.special_assistance_request || ''}
                onChangeText={value =>
                  updatePassenger(index, 'special_assistance_request', value)
                }
                placeholder='Any special requirements'
                multiline
              />
            </View>
          ))}

          {(!formData.passengers || formData.passengers.length === 0) && (
            <View style={styles.emptyPassengers}>
              <Text style={styles.emptyText}>No passengers added yet</Text>
              <Text style={styles.emptySubtext}>
                Click "Add Passenger" to add passenger information
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.actionBarContent}>
          <Button
            title='Cancel'
            variant='outline'
            size='large'
            icon={<X size={20} color={colors.primary} />}
            onPress={handleCancel}
            style={styles.cancelButton}
          />
          <Button
            title='Save Booking'
            variant='primary'
            size='large'
            icon={<Save size={20} color='#FFFFFF' />}
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100, // Space for action bar
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  checkbox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxText: {
    fontSize: 14,
    color: colors.text,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 12,
  },
  passengerCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyPassengers: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBarContent: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
  },
  saveButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
  },
});
