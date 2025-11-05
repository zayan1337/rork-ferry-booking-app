import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import { AdminManagement } from '@/types';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/admin/Dropdown';
import TextInput from '@/components/admin/TextInput';
import Switch from '@/components/admin/Switch';
import DatePicker from '@/components/admin/DatePicker';
import SeatArrangementManager from '../seat-arrangement/SeatArrangementManager';
import { useVesselStore } from '@/store/admin/vesselStore';
// Removed unused vessel utilities - using only flexible ferry layout
import {
  Ship,
  Users,
  Settings,
  Save,
  RotateCcw,
  FileText,
  Shield,
  Grid3X3,
  Info,
  Activity,
  AlertCircle,
  Smartphone,
} from 'lucide-react-native';

type VesselFormData = AdminManagement.VesselFormData;
type Vessel = AdminManagement.Vessel;
type VesselWithDetails = AdminManagement.VesselWithDetails;

interface VesselFormProps {
  initialData?: VesselWithDetails & {
    seatLayout?: AdminManagement.SeatLayout | null;
    seats?: AdminManagement.Seat[];
  };
  onSave: (data: VesselFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

interface ValidationErrors {
  name?: string;
  seating_capacity?: string;
  vessel_type?: string;
  make?: string;
  model?: string;
  registration_number?: string;
  captain_name?: string;
  contact_number?: string;
  description?: string;
  general?: string;
}

export default function VesselForm({
  initialData,
  onSave,
  onCancel,
  loading = false,
}: VesselFormProps) {
  const { showError } = useAlertContext();
  const {
    generateFerryLayout,
    getLayoutStatistics,
    fetchSeatLayout,
    fetchSeats,
    generateAutomaticSeatLayout,
  } = useVesselStore();

  const [formData, setFormData] = useState<VesselFormData>({
    name: initialData?.name || '',
    seating_capacity: initialData?.seating_capacity || 0,
    status: initialData?.status || 'active',
    is_active: initialData?.is_active ?? true,
    vessel_type: initialData?.vessel_type || 'passenger',
    make: initialData?.make || '',
    model: initialData?.model || '',
    registration_number: initialData?.registration_number || '',
    captain_name: initialData?.captain_name || '',
    contact_number: initialData?.contact_number || '',
    maintenance_schedule: initialData?.maintenance_schedule || '',
    last_maintenance_date: initialData?.last_maintenance_date || '',
    next_maintenance_date: initialData?.next_maintenance_date || '',
    insurance_expiry_date: initialData?.insurance_expiry_date || '',
    license_expiry_date: initialData?.license_expiry_date || '',
    max_speed: initialData?.max_speed || 0,
    fuel_capacity: initialData?.fuel_capacity || 0,
    description: initialData?.description || '',
    notes: initialData?.notes || '',
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [existingSeatLayout, setExistingSeatLayout] = useState<any>(null);
  const [existingSeats, setExistingSeats] = useState<any[]>([]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Removed auto-generation - using only flexible ferry layout
  const [customLayoutModified, setCustomLayoutModified] = useState(false);
  const [customLayoutData, setCustomLayoutData] = useState<{
    layout: any;
    seats: any[];
  } | null>(null);

  const vesselTypes = [
    { label: 'Passenger', value: 'passenger' },
    { label: 'Cargo', value: 'cargo' },
    { label: 'Mixed', value: 'mixed' },
    { label: 'Luxury', value: 'luxury' },
    { label: 'Speedboat', value: 'speedboat' },
  ];

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Inactive', value: 'inactive' },
  ];

  // Check for existing seat layout when editing
  useEffect(() => {
    const checkExistingSeatLayout = async () => {
      if (initialData?.id) {
        let hasExistingSeats = false;
        let hasExistingLayout = false;

        // First, check if seats data is already available in initialData
        if (initialData.seats && initialData.seats.length > 0) {
          setExistingSeats(initialData.seats);
          hasExistingSeats = true;
        } else {
          // Fallback: fetch seats separately if not available in initialData
          try {
            const seats = await fetchSeats(initialData.id);
            if (seats && seats.length > 0) {
              setExistingSeats(seats);
              hasExistingSeats = true;
            }
          } catch (error) {
            // No existing seats
          }
        }

        // Check if seat layout data is already available in initialData
        if (initialData.seatLayout) {
          setExistingSeatLayout(initialData.seatLayout);
          hasExistingLayout = true;
        } else {
          // Fallback: fetch layout separately if not available in initialData
          try {
            const layout = await fetchSeatLayout(initialData.id);
            if (layout) {
              setExistingSeatLayout(layout);
              hasExistingLayout = true;
            }
          } catch (error) {
            // No existing layout
          }
        }

        // Seat layout will be shown automatically when capacity > 0
      }
    };

    checkExistingSeatLayout();
  }, [initialData?.id, initialData?.seatLayout, initialData?.seats]);

  // Seat layout is automatically shown when capacity > 0 (no toggle needed)

  // Track form changes
  useEffect(() => {
    if (initialData) {
      const hasFormChanges =
        formData.name !== (initialData.name || '') ||
        formData.seating_capacity !== (initialData.seating_capacity || 0) ||
        formData.status !== (initialData.status || 'active') ||
        formData.is_active !== (initialData.is_active ?? true) ||
        formData.vessel_type !== (initialData.vessel_type || 'passenger') ||
        formData.registration_number !==
          (initialData.registration_number || '') ||
        formData.captain_name !== (initialData.captain_name || '') ||
        formData.contact_number !== (initialData.contact_number || '') ||
        formData.maintenance_schedule !==
          (initialData.maintenance_schedule || '') ||
        formData.last_maintenance_date !==
          (initialData.last_maintenance_date || '') ||
        formData.next_maintenance_date !==
          (initialData.next_maintenance_date || '') ||
        formData.insurance_expiry_date !==
          (initialData.insurance_expiry_date || '') ||
        formData.license_expiry_date !==
          (initialData.license_expiry_date || '') ||
        formData.max_speed !== (initialData.max_speed || 0) ||
        formData.fuel_capacity !== (initialData.fuel_capacity || 0) ||
        formData.description !== (initialData.description || '') ||
        formData.notes !== (initialData.notes || '');
      setHasChanges(hasFormChanges || customLayoutModified);
    } else {
      const hasFormChanges =
        formData.name.trim() !== '' ||
        formData.seating_capacity !== 0 ||
        formData.status !== 'active' ||
        formData.is_active !== true ||
        formData.vessel_type !== 'passenger' ||
        (formData.registration_number || '').trim() !== '' ||
        (formData.captain_name || '').trim() !== '' ||
        (formData.contact_number || '').trim() !== '' ||
        (formData.maintenance_schedule || '').trim() !== '' ||
        (formData.last_maintenance_date || '').trim() !== '' ||
        (formData.next_maintenance_date || '').trim() !== '' ||
        (formData.insurance_expiry_date || '').trim() !== '' ||
        (formData.license_expiry_date || '').trim() !== '' ||
        formData.max_speed !== 0 ||
        formData.fuel_capacity !== 0 ||
        (formData.description || '').trim() !== '' ||
        (formData.notes || '').trim() !== '';
      setHasChanges(hasFormChanges || customLayoutModified);
    }
  }, [formData, initialData, customLayoutModified]);

  // Removed layout preview generation - using only flexible ferry layout

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Vessel name validation
    if (!formData.name.trim()) {
      errors.name = 'Vessel name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Vessel name must be at least 3 characters long';
    } else if (formData.name.trim().length > 255) {
      errors.name = 'Vessel name must be less than 255 characters';
    }

    // Seating capacity validation
    if (!formData.seating_capacity || formData.seating_capacity <= 0) {
      errors.seating_capacity = 'Seating capacity must be greater than 0';
    } else if (formData.seating_capacity > 1000) {
      errors.seating_capacity = 'Seating capacity cannot exceed 1000';
    }

    // Vessel type validation
    if (!formData.vessel_type) {
      errors.vessel_type = 'Vessel type is required';
    }

    // Registration number validation
    if (
      formData.registration_number &&
      formData.registration_number.trim().length < 3
    ) {
      errors.registration_number =
        'Registration number must be at least 3 characters';
    }

    // Captain name validation
    if (formData.captain_name && formData.captain_name.trim().length < 2) {
      errors.captain_name = 'Captain name must be at least 2 characters';
    }

    // Contact number validation
    if (
      formData.contact_number &&
      !/^[\+]?[0-9\s\-\(\)]{7,15}$/.test(formData.contact_number)
    ) {
      errors.contact_number = 'Please enter a valid contact number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      // Prepare form data for submission
      const submitData: VesselFormData = {
        name: formData.name.trim(),
        seating_capacity: formData.seating_capacity,
        status: formData.status,
        is_active: formData.is_active,
        vessel_type: formData.vessel_type,
        make: formData.make?.trim() || undefined,
        model: formData.model?.trim() || undefined,
        registration_number: formData.registration_number?.trim() || undefined,
        captain_name: formData.captain_name?.trim() || undefined,
        contact_number: formData.contact_number?.trim() || undefined,
        maintenance_schedule:
          formData.maintenance_schedule?.trim() || undefined,
        last_maintenance_date:
          formData.last_maintenance_date?.trim() || undefined,
        next_maintenance_date:
          formData.next_maintenance_date?.trim() || undefined,
        insurance_expiry_date:
          formData.insurance_expiry_date?.trim() || undefined,
        license_expiry_date: formData.license_expiry_date?.trim() || undefined,
        max_speed: formData.max_speed || undefined,
        fuel_capacity: formData.fuel_capacity || undefined,
        description: formData.description?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      // Handle custom layout data for both new and existing vessels
      if (customLayoutData) {
        // Store custom layout data in submitData for the store to handle
        (submitData as any).customSeatLayout = customLayoutData;
      }

      // Removed auto-generation flag - using only flexible ferry layout

      // Save the vessel (store will handle custom layout saving automatically)
      await onSave(submitData);

      // Reset custom layout state after successful save
      setCustomLayoutModified(false);
      setCustomLayoutData(null);
    } catch (error) {
      // Error handling is done by the parent component
    }
  };

  const handleReset = () => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        seating_capacity: initialData.seating_capacity || 0,
        status: initialData.status || 'active',
        is_active: initialData.is_active ?? true,
        vessel_type: initialData.vessel_type || 'passenger',
        registration_number: initialData.registration_number || '',
        captain_name: initialData.captain_name || '',
        contact_number: initialData.contact_number || '',
        maintenance_schedule: initialData.maintenance_schedule || '',
        last_maintenance_date: initialData.last_maintenance_date || '',
        next_maintenance_date: initialData.next_maintenance_date || '',
        insurance_expiry_date: initialData.insurance_expiry_date || '',
        license_expiry_date: initialData.license_expiry_date || '',
        max_speed: initialData.max_speed || 0,
        fuel_capacity: initialData.fuel_capacity || 0,
        description: initialData.description || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        seating_capacity: 0,
        status: 'active',
        is_active: true,
        vessel_type: 'passenger',
        registration_number: '',
        captain_name: '',
        contact_number: '',
        maintenance_schedule: '',
        last_maintenance_date: '',
        next_maintenance_date: '',
        insurance_expiry_date: '',
        license_expiry_date: '',
        max_speed: 0,
        fuel_capacity: 0,
        description: '',
        notes: '',
      });
    }
    setValidationErrors({});
    // Reset custom layout state
    setCustomLayoutModified(false);
    setCustomLayoutData(null);
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'active':
        return 'Vessel is operational and available for trips';
      case 'maintenance':
        return 'Vessel is under maintenance and not available';
      case 'inactive':
        return 'Vessel is temporarily out of service';
      default:
        return 'Vessel status is unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'maintenance':
        return colors.warning;
      case 'inactive':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  // Removed layout preview functions - using only flexible ferry layout

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ship size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {initialData ? 'Edit Vessel' : 'Create New Vessel'}
          </Text>
          <Text style={styles.subtitle}>
            {initialData
              ? 'Update vessel information and settings'
              : 'Add a new ferry vessel to the system'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Error Display */}
        {validationErrors.general && (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={20} color={colors.error} />
            </View>
            <Text style={styles.errorText}>{validationErrors.general}</Text>
          </View>
        )}

        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Info size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Basic Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Vessel Name'
              value={formData.name}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, name: text }))
              }
              placeholder='Enter vessel name (e.g., Crystal Wave)'
              error={validationErrors.name}
              required
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TextInput
                label='Make'
                value={formData.make}
                onChangeText={text =>
                  setFormData(prev => ({ ...prev, make: text }))
                }
                placeholder='Enter vessel make (e.g., Crystal Craft)'
                error={validationErrors.make}
              />
            </View>

            <View style={styles.formHalf}>
              <TextInput
                label='Model'
                value={formData.model}
                onChangeText={text =>
                  setFormData(prev => ({ ...prev, model: text }))
                }
                placeholder='Enter vessel model (e.g., CC42)'
                error={validationErrors.model}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Description'
              value={formData.description}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, description: text }))
              }
              placeholder='Enter vessel description (optional)'
              multiline
              numberOfLines={3}
              error={validationErrors.description}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Dropdown
                label='Vessel Type'
                value={formData.vessel_type}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    vessel_type: value as any,
                  }))
                }
                options={vesselTypes}
                placeholder='Select vessel type'
                error={validationErrors.vessel_type}
                required
              />
            </View>

            <View style={styles.formHalf}>
              <TextInput
                label='Seating Capacity'
                value={formData.seating_capacity.toString()}
                onChangeText={text => {
                  const numericValue = parseInt(text) || 0;
                  setFormData(prev => ({
                    ...prev,
                    seating_capacity: numericValue,
                  }));
                }}
                placeholder='Enter capacity'
                keyboardType='numeric'
                error={validationErrors.seating_capacity}
                required
              />
            </View>
          </View>
        </View>

        {/* Crew Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Users size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Crew Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Captain Name'
              value={formData.captain_name}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, captain_name: text }))
              }
              placeholder="Enter captain's full name"
              error={validationErrors.captain_name}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Contact Number'
              value={formData.contact_number}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, contact_number: text }))
              }
              placeholder='Enter contact number'
              keyboardType='phone-pad'
              error={validationErrors.contact_number}
            />
          </View>
        </View>

        {/* Technical Specifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Activity size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Technical Specifications</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Registration Number'
              value={formData.registration_number}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, registration_number: text }))
              }
              placeholder='Enter registration number'
              error={validationErrors.registration_number}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TextInput
                label='Max Speed (knots)'
                value={(formData.max_speed || 0).toString()}
                onChangeText={text => {
                  const numericValue = parseFloat(text) || 0;
                  setFormData(prev => ({ ...prev, max_speed: numericValue }));
                }}
                placeholder='Enter max speed'
                keyboardType='numeric'
              />
            </View>

            <View style={styles.formHalf}>
              <TextInput
                label='Fuel Capacity (liters)'
                value={(formData.fuel_capacity || 0).toString()}
                onChangeText={text => {
                  const numericValue = parseFloat(text) || 0;
                  setFormData(prev => ({
                    ...prev,
                    fuel_capacity: numericValue,
                  }));
                }}
                placeholder='Enter fuel capacity'
                keyboardType='numeric'
              />
            </View>
          </View>
        </View>

        {/* Maintenance Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Maintenance Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Maintenance Schedule'
              value={formData.maintenance_schedule}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, maintenance_schedule: text }))
              }
              placeholder='Enter maintenance schedule (e.g., Every 6 months)'
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <DatePicker
                label='Last Maintenance Date'
                value={formData.last_maintenance_date || ''}
                onChange={date =>
                  setFormData(prev => ({
                    ...prev,
                    last_maintenance_date: date,
                  }))
                }
                placeholder='Select date'
              />
            </View>

            <View style={styles.formHalf}>
              <DatePicker
                label='Next Maintenance Date'
                value={formData.next_maintenance_date || ''}
                onChange={date =>
                  setFormData(prev => ({
                    ...prev,
                    next_maintenance_date: date,
                  }))
                }
                placeholder='Select date'
              />
            </View>
          </View>
        </View>

        {/* Compliance & Documentation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Shield size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Compliance & Documentation</Text>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <DatePicker
                label='Insurance Expiry Date'
                value={formData.insurance_expiry_date || ''}
                onChange={date =>
                  setFormData(prev => ({
                    ...prev,
                    insurance_expiry_date: date,
                  }))
                }
                placeholder='Select date'
              />
            </View>

            <View style={styles.formHalf}>
              <DatePicker
                label='License Expiry Date'
                value={formData.license_expiry_date || ''}
                onChange={date =>
                  setFormData(prev => ({
                    ...prev,
                    license_expiry_date: date,
                  }))
                }
                placeholder='Select date'
              />
            </View>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <FileText size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Additional Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Notes'
              value={formData.notes}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, notes: text }))
              }
              placeholder='Enter additional notes (optional)'
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Advanced Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Settings size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Advanced Options</Text>
          </View>

          <View style={styles.formGroup}>
            <Dropdown
              label='Status'
              value={formData.status}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, status: value as any }))
              }
              options={statusOptions}
              placeholder='Select status'
            />
          </View>

          {/* Status Description */}
          <View
            style={[
              styles.statusContainer,
              { borderLeftColor: getStatusColor(formData.status) },
            ]}
          >
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: `${getStatusColor(formData.status)}20` },
              ]}
            >
              <AlertCircle size={16} color={getStatusColor(formData.status)} />
            </View>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(formData.status) },
              ]}
            >
              {getStatusDescription(formData.status)}
            </Text>
          </View>

          <View style={styles.switchContainer}>
            <Switch
              label='Active Status'
              value={formData.is_active}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, is_active: value }))
              }
              description='Enable or disable this vessel in the system'
            />
          </View>
        </View>

        {/* Seat Layout Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Grid3X3 size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Seat Layout Configuration</Text>
          </View>

          {/* Seat layout is automatically shown when capacity is entered */}
          {formData.seating_capacity > 0 && (
            <View style={styles.layoutInfo}>
              <Text style={styles.layoutInfoText}>
                💡 Seat layout will be automatically generated based on your
                capacity ({formData.seating_capacity} seats). You can customize
                it below.
              </Text>
            </View>
          )}

          {formData.seating_capacity > 0 && (
            <View style={styles.seatLayoutContainer}>
              <SeatArrangementManager
                key={`seat-layout-${initialData?.id || 'new'}`}
                vesselId={initialData?.id || 'new'}
                seatingCapacity={formData.seating_capacity}
                vesselType={formData.vessel_type}
                initialLayout={existingSeatLayout}
                initialSeats={existingSeats}
                onChange={(layout, seats) => {
                  // Use a more robust debouncing mechanism
                  if ((global as any).vesselFormChangeTimeout) {
                    clearTimeout((global as any).vesselFormChangeTimeout);
                  }

                  (global as any).vesselFormChangeTimeout = setTimeout(() => {
                    // Prevent unnecessary updates by checking if data actually changed
                    const newData = { layout, seats };
                    const currentData = customLayoutData;

                    // Only update if data actually changed
                    const hasChanged =
                      !currentData ||
                      JSON.stringify(currentData.layout.layout_data) !==
                        JSON.stringify(layout.layout_data) ||
                      currentData.seats.length !== seats.length ||
                      JSON.stringify(
                        currentData.seats
                          .map(s => ({
                            id: s.id,
                            seat_number: s.seat_number,
                            row_number: s.row_number,
                            position_x: s.position_x,
                            position_y: s.position_y,
                            seat_type: s.seat_type,
                            seat_class: s.seat_class,
                            is_premium: s.is_premium,
                            is_window: s.is_window,
                            is_aisle: s.is_aisle,
                            is_disabled: s.is_disabled,
                            price_multiplier: s.price_multiplier,
                          }))
                          .sort((a, b) => a.id?.localeCompare(b.id || '') || 0)
                      ) !==
                        JSON.stringify(
                          seats
                            .map(s => ({
                              id: s.id,
                              seat_number: s.seat_number,
                              row_number: s.row_number,
                              position_x: s.position_x,
                              position_y: s.position_y,
                              seat_type: s.seat_type,
                              seat_class: s.seat_class,
                              is_premium: s.is_premium,
                              is_window: s.is_window,
                              is_aisle: s.is_aisle,
                              is_disabled: s.is_disabled,
                              price_multiplier: s.price_multiplier,
                            }))
                            .sort(
                              (a, b) => a.id?.localeCompare(b.id || '') || 0
                            )
                        );

                    if (hasChanged) {
                      setCustomLayoutData(newData);
                      setCustomLayoutModified(true);
                    }
                  }, 500); // 500ms debounce
                }}
                onSave={async (layout, seats) => {
                  try {
                    // Store the custom layout data for later saving
                    setCustomLayoutData({ layout, seats });
                    setCustomLayoutModified(true);

                    if (initialData?.id) {
                      // For existing vessels, check if we have an existing layout to update
                      if (existingSeatLayout?.id) {
                        // Update existing layout using the new simplified approach
                        const { saveCustomSeatLayout } =
                          useVesselStore.getState();
                        await saveCustomSeatLayout(
                          initialData.id,
                          layout.layout_data,
                          seats
                        );
                      } else {
                        // Create new layout for existing vessel
                        const { saveCustomSeatLayout } =
                          useVesselStore.getState();
                        await saveCustomSeatLayout(
                          initialData.id,
                          layout.layout_data,
                          seats
                        );
                      }
                      // Reset modification state after successful save
                      setCustomLayoutModified(false);
                      setCustomLayoutData(null);
                    } else {
                      // For new vessels, the layout will be saved after vessel creation
                    }
                  } catch (error) {
                    console.error('Error saving seat layout:', error);
                    showError('Error', 'Failed to save seat layout');
                  }
                }}
                onCancel={() => {
                  // Reset seat layout data when cancelled
                  setCustomLayoutModified(false);
                  setCustomLayoutData(null);
                }}
                loading={loading}
              />
            </View>
          )}

          {formData.seating_capacity > 0 && (
            <View style={styles.layoutTipsContainer}>
              <View style={styles.layoutTipsHeader}>
                <Smartphone size={16} color={colors.info} />
                <Text style={styles.layoutTipsTitle}>Layout Tips</Text>
              </View>
              <Text style={styles.layoutTipsText}>
                • Use Edit mode to add/remove seats, Arrange mode for bulk
                actions{'\n'}• Window seats are automatically positioned at the
                ends of each row{'\n'}• Aisles are placed between seat columns
                for easy access{'\n'}• Premium sections can be configured in the
                layout editor{'\n'}• The system optimizes for the best
                row-to-column ratio
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title='Save Vessel'
            variant='primary'
            onPress={handleSubmit}
            loading={loading}
            disabled={!hasChanges}
            icon={<Save size={16} color={colors.white} />}
          />

          <Button
            title='Reset Form'
            variant='secondary'
            onPress={handleReset}
            disabled={loading}
            icon={<RotateCcw size={16} color={colors.primary} />}
          />

          {onCancel && (
            <Button
              title='Cancel'
              variant='outline'
              onPress={onCancel}
              disabled={loading}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 20,
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
    backgroundColor: `${colors.error}20`,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    marginBottom: 16,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  switchContainer: {
    marginBottom: 8,
  },
  seatLayoutContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  layoutInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.infoLight,
    borderRadius: 8,
    alignItems: 'center',
  },
  layoutInfoText: {
    fontSize: 13,
    color: colors.info,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  layoutTipsContainer: {
    backgroundColor: colors.infoLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  layoutTipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  layoutTipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.info,
  },
  layoutTipsText: {
    fontSize: 12,
    color: colors.info,
    lineHeight: 16,
  },
});
