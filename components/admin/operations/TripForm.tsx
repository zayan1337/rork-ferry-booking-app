import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { colors } from '@/constants/adminColors';
import { useTripManagement } from '@/hooks/useTripManagement';
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { AdminManagement } from '@/types';
import {
  Calendar,
  Clock,
  MapPin,
  Ship,
  AlertCircle,
  Save,
  RotateCcw,
  Info,
  Activity,
  Settings,
  DollarSign,
} from 'lucide-react-native';

// Components
import TextInput from '@/components/admin/TextInput';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/admin/Dropdown';
import DatePicker from '@/components/admin/DatePicker';
import TimePicker from '@/components/admin/TimePicker';
import Switch from '@/components/admin/Switch';

type TripFormData = AdminManagement.TripFormData;

interface TripFormProps {
  tripId?: string;
  onSave?: (trip: TripFormData) => void;
  onCancel?: () => void;
  initialData?: {
    route_id?: string;
    vessel_id?: string;
  };
}

interface FormData {
  route_id: string;
  vessel_id: string;
  travel_date: string;
  departure_time: string;
  arrival_time?: string;
  status:
    | 'scheduled'
    | 'boarding'
    | 'departed'
    | 'arrived'
    | 'cancelled'
    | 'delayed'
    | 'completed';
  delay_reason?: string;
  fare_multiplier: number;
  weather_conditions?: string;
  captain_id?: string;
  crew_ids?: string[];
  notes?: string;
  is_active: boolean;
}

interface ValidationErrors {
  route_id?: string;
  vessel_id?: string;
  travel_date?: string;
  departure_time?: string;
  arrival_time?: string;
  status?: string;
  delay_reason?: string;
  fare_multiplier?: string;
  weather_conditions?: string;
  captain_id?: string;
  crew_ids?: string;
  notes?: string;
  general?: string;
}

export default function TripForm({
  tripId,
  onSave,
  onCancel,
  initialData,
}: TripFormProps) {
  const {
    trips,
    getById,
    create,
    update,
    loading: tripLoading,
  } = useTripManagement();
  const { routes, loadAll: loadRoutes } = useRouteManagement();
  const { vessels, loadAll: loadVessels } = useVesselManagement();

  // Find current trip data for editing
  const currentTrip = tripId ? getById(tripId) : null;

  const [formData, setFormData] = useState<FormData>({
    route_id: currentTrip?.route_id || initialData?.route_id || '',
    vessel_id: currentTrip?.vessel_id || initialData?.vessel_id || '',
    travel_date: currentTrip?.travel_date || '',
    departure_time: currentTrip?.departure_time || '',
    arrival_time: currentTrip?.arrival_time || '',
    status: currentTrip?.status || 'scheduled',
    delay_reason: currentTrip?.delay_reason || '',
    fare_multiplier: currentTrip?.fare_multiplier || 1.0,
    weather_conditions: currentTrip?.weather_conditions || '',
    captain_id: currentTrip?.captain_id || '',
    crew_ids: currentTrip?.crew_ids || [],
    notes: currentTrip?.notes || '',
    is_active: currentTrip?.is_active ?? true,
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load routes and vessels on component mount
  useEffect(() => {
    loadRoutes();
    loadVessels();
  }, []);

  // Track form changes
  useEffect(() => {
    if (currentTrip) {
      const hasFormChanges =
        formData.route_id !== (currentTrip.route_id || '') ||
        formData.vessel_id !== (currentTrip.vessel_id || '') ||
        formData.travel_date !== (currentTrip.travel_date || '') ||
        formData.departure_time !== (currentTrip.departure_time || '') ||
        formData.arrival_time !== (currentTrip.arrival_time || '') ||
        formData.status !== (currentTrip.status || 'scheduled') ||
        formData.delay_reason !== (currentTrip.delay_reason || '') ||
        formData.fare_multiplier !== (currentTrip.fare_multiplier || 1.0) ||
        formData.weather_conditions !==
          (currentTrip.weather_conditions || '') ||
        formData.captain_id !== (currentTrip.captain_id || '') ||
        JSON.stringify(formData.crew_ids) !==
          JSON.stringify(currentTrip.crew_ids || []) ||
        formData.notes !== (currentTrip.notes || '') ||
        formData.is_active !== (currentTrip.is_active ?? true);
      setHasChanges(hasFormChanges);
    } else {
      // For new trips, check if any field has been filled
      const hasAnyData = Object.values(formData).some(
        value =>
          value !== '' &&
          value !== 1.0 &&
          value !== true &&
          (Array.isArray(value) ? value.length > 0 : true)
      );
      setHasChanges(hasAnyData);
    }
  }, [formData, currentTrip]);

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!formData.route_id) {
      errors.route_id = 'Route is required';
    }

    if (!formData.vessel_id) {
      errors.vessel_id = 'Vessel is required';
    }

    if (!formData.travel_date) {
      errors.travel_date = 'Travel date is required';
    }

    if (!formData.departure_time) {
      errors.departure_time = 'Departure time is required';
    }

    if (formData.fare_multiplier <= 0) {
      errors.fare_multiplier = 'Fare multiplier must be greater than 0';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const tripFormData: TripFormData = {
        route_id: formData.route_id,
        vessel_id: formData.vessel_id,
        travel_date: formData.travel_date,
        departure_time: formData.departure_time,
        arrival_time: formData.arrival_time,
        status: formData.status,
        delay_reason: formData.delay_reason,
        fare_multiplier: formData.fare_multiplier,
        weather_conditions: formData.weather_conditions,
        captain_id: formData.captain_id,
        crew_ids: formData.crew_ids,
        notes: formData.notes,
        is_active: formData.is_active,
      };

      if (currentTrip) {
        await update(currentTrip.id, tripFormData);
        Alert.alert('Success', 'Trip updated successfully');
      } else {
        await create(tripFormData);
        Alert.alert('Success', 'Trip created successfully');
      }

      if (onSave) {
        onSave(tripFormData);
      }
    } catch (error) {
      console.error('Error saving trip:', error);
      Alert.alert('Error', 'Failed to save trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Continue Editing', style: 'cancel' },
          { text: 'Discard Changes', style: 'destructive', onPress: onCancel },
        ]
      );
    } else {
      onCancel?.();
    }
  };

  const handleReset = () => {
    if (currentTrip) {
      setFormData({
        route_id: currentTrip.route_id || '',
        vessel_id: currentTrip.vessel_id || '',
        travel_date: currentTrip.travel_date || '',
        departure_time: currentTrip.departure_time || '',
        arrival_time: currentTrip.arrival_time || '',
        status: currentTrip.status || 'scheduled',
        delay_reason: currentTrip.delay_reason || '',
        fare_multiplier: currentTrip.fare_multiplier || 1.0,
        weather_conditions: currentTrip.weather_conditions || '',
        captain_id: currentTrip.captain_id || '',
        crew_ids: currentTrip.crew_ids || [],
        notes: currentTrip.notes || '',
        is_active: currentTrip.is_active ?? true,
      });
    } else {
      setFormData({
        route_id: initialData?.route_id || '',
        vessel_id: initialData?.vessel_id || '',
        travel_date: '',
        departure_time: '',
        arrival_time: '',
        status: 'scheduled',
        delay_reason: '',
        fare_multiplier: 1.0,
        weather_conditions: '',
        captain_id: '',
        crew_ids: [],
        notes: '',
        is_active: true,
      });
    }
    setValidationErrors({});
    setHasChanges(false);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Trip is planned and ready for boarding';
      case 'boarding':
        return 'Passengers are currently boarding the vessel';
      case 'departed':
        return 'Trip has left the origin and is in transit';
      case 'arrived':
        return 'Trip has reached its destination';
      case 'cancelled':
        return 'Trip has been cancelled';
      case 'delayed':
        return 'Trip is delayed from its scheduled time';
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return colors.info;
      case 'boarding':
        return colors.warning;
      case 'departed':
        return colors.primary;
      case 'arrived':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'delayed':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const routeOptions = (routes || []).map(route => ({
    label: route.name || `${route.from_island_name} → ${route.to_island_name}`,
    value: route.id,
  }));

  const vesselOptions = (vessels || [])
    .filter(vessel => vessel.is_active)
    .map(vessel => ({
      label: `${vessel.name} (${vessel.seating_capacity} seats)`,
      value: vessel.id,
    }));

  const statusOptions = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Boarding', value: 'boarding' },
    { label: 'Departed', value: 'departed' },
    { label: 'Arrived', value: 'arrived' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Delayed', value: 'delayed' },
  ];

  if (loading || tripLoading.data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading trip data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header (scrolls with content like other forms) */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Calendar size={24} color={colors.primary} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {currentTrip ? 'Edit Trip' : 'Create New Trip'}
            </Text>
            <Text style={styles.subtitle}>
              {currentTrip
                ? 'Update trip information and settings'
                : 'Add a new ferry trip to the system'}
            </Text>
          </View>
        </View>
        {/* Route & Vessel Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <MapPin size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Route & Vessel</Text>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Route'
              value={formData.route_id}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, route_id: value }))
              }
              options={routeOptions}
              placeholder='Select route'
              error={validationErrors.route_id}
              required
            />
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Vessel'
              value={formData.vessel_id}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, vessel_id: value }))
              }
              options={vesselOptions}
              placeholder='Select vessel'
              error={validationErrors.vessel_id}
              required
            />
          </View>

          {/* Route Preview */}
          {formData.route_id && formData.vessel_id && (
            <View style={styles.routePreview}>
              <View style={styles.routePreviewIcon}>
                <Ship size={16} color={colors.primary} />
              </View>
              <Text style={styles.routePreviewText}>
                {routes?.find(r => r.id === formData.route_id)?.name ||
                  'Selected Route'}{' '}
                •{' '}
                {vessels?.find(v => v.id === formData.vessel_id)?.name ||
                  'Selected Vessel'}
              </Text>
            </View>
          )}
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>

          <View style={styles.formGroup}>
            <DatePicker
              label='Travel Date'
              value={formData.travel_date}
              onChange={(value: string) =>
                setFormData(prev => ({ ...prev, travel_date: value }))
              }
              placeholder='Select travel date'
              error={validationErrors.travel_date}
              required
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TimePicker
                label='Departure Time'
                value={formData.departure_time}
                onChange={time =>
                  setFormData(prev => ({ ...prev, departure_time: time }))
                }
                placeholder='HH:MM (24-hour)'
                error={validationErrors.departure_time}
                required
              />
            </View>

            <View style={styles.formHalf}>
              <TimePicker
                label='Arrival Time'
                value={formData.arrival_time || ''}
                onChange={time =>
                  setFormData(prev => ({ ...prev, arrival_time: time }))
                }
                placeholder='HH:MM (24-hour)'
                error={validationErrors.arrival_time}
              />
            </View>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Activity size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Trip Details</Text>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Status'
              value={formData.status}
              onValueChange={(value: string) =>
                setFormData(prev => ({ ...prev, status: value as any }))
              }
              options={statusOptions}
              placeholder='Select status'
              error={validationErrors.status}
            />
          </View>

          {/* Status Description */}
          {formData.status && (
            <View
              style={[
                styles.statusDescription,
                {
                  backgroundColor: getStatusColor(formData.status) + '10',
                  borderLeftColor: getStatusColor(formData.status),
                },
              ]}
            >
              <View
                style={[
                  styles.statusDescriptionIcon,
                  {
                    backgroundColor: getStatusColor(formData.status) + '20',
                  },
                ]}
              >
                <Info size={16} color={getStatusColor(formData.status)} />
              </View>
              <Text
                style={[
                  styles.statusDescriptionText,
                  {
                    color: getStatusColor(formData.status),
                  },
                ]}
              >
                {getStatusDescription(formData.status)}
              </Text>
            </View>
          )}

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TextInput
                label='Fare Multiplier'
                value={formData.fare_multiplier.toString()}
                onChangeText={text => {
                  const numericValue = parseFloat(text) || 1.0;
                  setFormData(prev => ({
                    ...prev,
                    fare_multiplier: numericValue,
                  }));
                }}
                placeholder='Enter fare multiplier'
                keyboardType='decimal-pad'
                error={validationErrors.fare_multiplier}
                required
              />
            </View>

            <View style={styles.formHalf}>
              <TextInput
                label='Weather Conditions'
                value={formData.weather_conditions || ''}
                onChangeText={text =>
                  setFormData(prev => ({ ...prev, weather_conditions: text }))
                }
                placeholder='Enter weather conditions'
                error={validationErrors.weather_conditions}
              />
            </View>
          </View>

          {formData.status === 'delayed' && (
            <View style={styles.formGroup}>
              <TextInput
                label='Delay Reason'
                value={formData.delay_reason || ''}
                onChangeText={text =>
                  setFormData(prev => ({ ...prev, delay_reason: text }))
                }
                placeholder='Enter reason for delay'
                multiline
                numberOfLines={2}
                error={validationErrors.delay_reason}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <TextInput
              label='Notes'
              value={formData.notes || ''}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, notes: text }))
              }
              placeholder='Enter trip notes (optional)'
              multiline
              numberOfLines={3}
              error={validationErrors.notes}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Settings</Text>
          </View>

          <View style={styles.switchContainer}>
            <Switch
              label='Active Trip'
              value={formData.is_active}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, is_active: value }))
              }
              description={
                formData.is_active
                  ? 'Trip is active and available for booking'
                  : 'Trip is inactive and hidden from booking'
              }
            />
          </View>
        </View>

        {/* Error Display */}
        {validationErrors.general && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={16} color={colors.error} />
            </View>
            <Text style={styles.errorText}>{validationErrors.general}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title={currentTrip ? 'Update Trip' : 'Create Trip'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            variant='primary'
            icon={<Save size={18} color={colors.white} />}
          />

          {onCancel && (
            <Button
              title='Cancel'
              onPress={handleCancel}
              variant='outline'
              disabled={loading}
            />
          )}

          {hasChanges && (
            <Button
              title='Reset'
              onPress={handleReset}
              variant='ghost'
              disabled={loading}
              icon={<RotateCcw size={18} color={colors.textSecondary} />}
            />
          )}
        </View>

        {/* Unsaved Changes Indicator */}
        {hasChanges && (
          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <AlertCircle size={14} color={colors.warning} />
            </View>
            <Text style={styles.statusText}>You have unsaved changes</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formHalf: {
    flex: 1,
  },
  routePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  routePreviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routePreviewText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.primary,
  },
  statusDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  statusDescriptionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDescriptionText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.errorLight,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
  },
  switchContainer: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
});
