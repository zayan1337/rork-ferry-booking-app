import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useTripManagement } from '@/hooks/useTripManagement';
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useVesselManagement } from '@/hooks/useVesselManagement';
import { useUserStore } from '@/store/admin/userStore';
import { supabase } from '@/utils/supabase';
import { RouteStop } from '@/types/multiStopRoute';
import {
  TripGenerationRequest,
  getCommonTimeSlots,
  getDaysOfWeek,
  getNextWeekdaysOnly,
  getWeekendOnly,
  calculateTripCount,
  getDateRange,
  formatDateForDisplay,
} from '@/utils/admin/tripUtils';
import {
  Calendar,
  Clock,
  Plus,
  X,
  Check,
  AlertTriangle,
  Users,
  Settings,
  Zap,
  Filter,
  MapPin,
  Ship,
  Info,
  Activity,
  Trash2,
} from 'lucide-react-native';

// Components
import Button from '@/components/admin/Button';
import TextInput from '@/components/admin/TextInput';
import TimePicker from '@/components/admin/TimePicker';
import Dropdown from '@/components/admin/Dropdown';
import DatePicker from '@/components/admin/DatePicker';

interface TripGeneratorProps {
  visible: boolean;
  onClose: () => void;
  onGenerate?: (result: any) => void;
  initialRoute?: string;
  initialVessel?: string;
}

export default function TripGenerator({
  visible,
  onClose,
  onGenerate,
  initialRoute,
  initialVessel,
}: TripGeneratorProps) {
  const tripMgmt = useTripManagement();
  const { routes, loadAll: loadRoutes } = useRouteManagement();
  const { vessels, loadAll: loadVessels } = useVesselManagement();
  const { users, fetchAll: fetchUsers } = useUserStore();

  // Form state
  const [formData, setFormData] = useState<Partial<TripGenerationRequest>>({
    route_id: initialRoute || '',
    vessel_id: initialVessel || '',
    start_date: '',
    end_date: '',
    selected_days: getNextWeekdaysOnly(), // Default to weekdays
    time_slots: [],
    fare_multiplier: 1.0,
    vessel_capacity: 50,
    captain_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [customTimeSlots, setCustomTimeSlots] = useState<string[]>([]);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [routeStops, setRouteStops] = useState<Record<string, RouteStop[]>>({});
  const [loadingRouteStops, setLoadingRouteStops] = useState(false);

  // Load data and clear errors when modal opens
  useEffect(() => {
    if (visible) {
      loadRoutes();
      loadVessels();
      fetchUsers();
      setErrors({}); // Clear any previous errors
    }
  }, [visible]);

  // Load route stops when routes are loaded
  useEffect(() => {
    if (routes.length > 0) {
      loadAllRouteStops();
    }
  }, [routes]);

  // Load route stops for all routes
  const loadAllRouteStops = async () => {
    setLoadingRouteStops(true);
    try {
      const { data, error } = await supabase
        .from('route_stops')
        .select(
          `
          id,
          route_id,
          island_id,
          stop_sequence,
          stop_type,
          estimated_travel_time,
          notes,
          created_at,
          updated_at,
          island:islands (
            id,
            name,
            zone
          )
        `
        )
        .order('stop_sequence', { ascending: true });

      if (error) throw error;

      // Group stops by route_id
      const stopsByRoute: Record<string, RouteStop[]> = {};
      data?.forEach((stop: any) => {
        if (!stopsByRoute[stop.route_id]) {
          stopsByRoute[stop.route_id] = [];
        }
        stopsByRoute[stop.route_id].push({
          id: stop.id,
          route_id: stop.route_id,
          island_id: stop.island_id,
          island_name: stop.island?.name || 'Unknown',
          island_zone: stop.island?.zone,
          stop_sequence: stop.stop_sequence,
          stop_type: stop.stop_type,
          estimated_travel_time_from_previous: stop.estimated_travel_time,
          notes: stop.notes,
          created_at: stop.created_at,
          updated_at: stop.updated_at,
        });
      });

      setRouteStops(stopsByRoute);
    } catch (error) {
      console.error('Error loading route stops:', error);
    } finally {
      setLoadingRouteStops(false);
    }
  };

  // Update vessel capacity when vessel changes
  useEffect(() => {
    if (formData.vessel_id) {
      const selectedVessel = vessels.find(v => v.id === formData.vessel_id);
      if (selectedVessel) {
        setFormData(prev => ({
          ...prev,
          vessel_capacity: selectedVessel.seating_capacity || 50,
        }));
      }
    }
  }, [formData.vessel_id, vessels]);

  // Static data
  const timeSlots = getCommonTimeSlots();
  const daysOfWeek = getDaysOfWeek();

  // Helper function to format route name with stops
  const getRouteLabel = (route: any): string => {
    // Check if route has custom name
    if (route.name && route.name !== '') {
      return route.name;
    }

    // Check if we have route stops loaded
    const stops = routeStops[route.id];
    if (stops && stops.length > 0) {
      // Multi-stop route: show all stops
      const stopNames = stops.map(stop => stop.island_name);
      return stopNames.join(' → ');
    }

    // Fallback to from_island_name and to_island_name (for legacy routes)
    if (route.from_island_name && route.to_island_name) {
      return `${route.from_island_name} → ${route.to_island_name}`;
    }

    return 'Unnamed Route';
  };

  // Captain options
  const captainOptions = [
    { label: 'No Captain Assigned', value: '' },
    ...(users || [])
      .filter(user => user.role === 'captain' && user.status === 'active')
      .map(captain => ({
        label: captain.name || captain.email,
        value: captain.id,
      })),
  ];

  // Track changes for unsaved state
  useEffect(() => {
    const hasFormData =
      formData.route_id ||
      formData.vessel_id ||
      formData.start_date ||
      formData.end_date ||
      (formData.selected_days && formData.selected_days.length > 0) ||
      (formData.time_slots && formData.time_slots.length > 0) ||
      formData.fare_multiplier !== 1.0 ||
      formData.captain_id;

    setHasChanges(!!hasFormData);
  }, [formData]);

  // Helper function to format time labels
  const formatTimeLabel = (time: string) => {
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const minute = parseInt(minutes);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    } catch {
      return time;
    }
  };

  // Combine predefined and custom time slots
  const allTimeSlots = useMemo(() => {
    const predefined = getCommonTimeSlots();
    const custom = customTimeSlots.map(slot => ({
      label: formatTimeLabel(slot),
      value: slot,
      category: 'Custom',
    }));
    return [...predefined, ...custom];
  }, [customTimeSlots]);

  // Group time slots by category including custom ones
  const timeSlotsByCategory = useMemo(() => {
    const grouped: Record<string, typeof allTimeSlots> = {};
    allTimeSlots.forEach(slot => {
      if (!grouped[slot.category]) {
        grouped[slot.category] = [];
      }
      grouped[slot.category].push(slot);
    });
    return grouped;
  }, [allTimeSlots]);

  const addCustomTimeSlot = () => {
    if (!newTimeSlot) return;

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTimeSlot)) {
      Alert.alert(
        'Invalid Time',
        'Please enter time in HH:MM format (24-hour)'
      );
      return;
    }

    // Check if already exists
    if (allTimeSlots.some(slot => slot.value === newTimeSlot)) {
      Alert.alert('Duplicate Time', 'This time slot already exists');
      return;
    }

    setCustomTimeSlots(prev => [...prev, newTimeSlot].sort());
    setNewTimeSlot('');
    setHasChanges(true);
  };

  const removeCustomTimeSlot = (timeSlot: string) => {
    setCustomTimeSlots(prev => prev.filter(slot => slot !== timeSlot));
    // Also remove from selected slots
    handleUpdateField(
      'time_slots',
      (formData.time_slots || []).filter(slot => slot !== timeSlot)
    );
  };

  // Calculate preview data
  const tripCount = calculateTripCount(formData);
  const dateRangeInfo =
    formData.start_date && formData.end_date
      ? getDateRange(formData.start_date, formData.end_date)
      : null;

  const handleUpdateField = (
    field: keyof TripGenerationRequest,
    value: any
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove the error key completely instead of setting to empty string
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
    setHasChanges(true);
  };

  const handleDayToggle = (dayValue: number) => {
    const currentDays = formData.selected_days || [];
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(d => d !== dayValue)
      : [...currentDays, dayValue];
    handleUpdateField('selected_days', newDays);
  };

  const handleTimeSlotToggle = (timeValue: string) => {
    const currentSlots = formData.time_slots || [];
    const newSlots = currentSlots.includes(timeValue)
      ? currentSlots.filter(t => t !== timeValue)
      : [...currentSlots, timeValue];
    handleUpdateField('time_slots', newSlots);
  };

  const handleQuickDaySelection = (
    type: 'weekdays' | 'weekends' | 'all' | 'none'
  ) => {
    switch (type) {
      case 'weekdays':
        handleUpdateField('selected_days', getNextWeekdaysOnly());
        break;
      case 'weekends':
        handleUpdateField('selected_days', getWeekendOnly());
        break;
      case 'all':
        handleUpdateField(
          'selected_days',
          daysOfWeek.map(d => d.value)
        );
        break;
      case 'none':
        handleUpdateField('selected_days', []);
        break;
    }
  };

  const handleQuickTimeSelection = (category: string) => {
    const categorySlots = timeSlotsByCategory[category];
    if (categorySlots) {
      const currentSlots = formData.time_slots || [];
      const categoryValues = categorySlots.map(s => s.value);
      const hasAllCategory = categoryValues.every(v =>
        currentSlots.includes(v)
      );

      if (hasAllCategory) {
        // Remove all from this category
        handleUpdateField(
          'time_slots',
          currentSlots.filter(t => !categoryValues.includes(t))
        );
      } else {
        // Add all from this category
        const newSlots = [...new Set([...currentSlots, ...categoryValues])];
        handleUpdateField('time_slots', newSlots);
      }
    }
  };

  const handlePreview = () => {
    if (!formData.route_id || !formData.vessel_id) {
      Alert.alert('Error', 'Please select both route and vessel');
      return;
    }

    const preview = tripMgmt.previewTripGeneration(
      formData as TripGenerationRequest
    );
    setPreviewData(preview);
    setShowPreview(true);
  };

  const handleGenerate = async () => {
    if (!formData.route_id || !formData.vessel_id) {
      Alert.alert('Error', 'Please select both route and vessel');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await tripMgmt.generateTripsFromSchedule(
        formData as TripGenerationRequest
      );

      if (result.success) {
        const message =
          result.message || `Generated ${result.generated} trips successfully!`;
        Alert.alert('Success', message, [{ text: 'OK', onPress: onClose }]);
        onGenerate?.(result);
      } else {
        Alert.alert('Error', result.error || 'Failed to generate trips');
      }
    } catch (error) {
      console.error('Trip generation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate trips';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <Zap size={28} color={colors.primary} />
      </View>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Generate Trips</Text>
        <Text style={styles.subtitle}>
          Bulk create trips across multiple dates and time slots
        </Text>
      </View>
    </View>
  );

  const renderRouteVesselSelection = () => (
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
          value={formData.route_id || ''}
          onValueChange={(value: string) =>
            handleUpdateField('route_id', value)
          }
          options={routes.map(route => ({
            label: getRouteLabel(route),
            value: route.id,
          }))}
          placeholder='Select route'
          error={errors.route_id}
          required
        />
      </View>

      <View style={styles.formGroup}>
        <Dropdown
          label='Vessel'
          value={formData.vessel_id || ''}
          onValueChange={(value: string) =>
            handleUpdateField('vessel_id', value)
          }
          options={vessels
            .filter(v => v.is_active)
            .map(vessel => ({
              label: `${vessel.name} (${vessel.seating_capacity} seats)`,
              value: vessel.id,
            }))}
          placeholder='Select vessel'
          error={errors.vessel_id}
          required
        />
      </View>

      {/* Route Preview */}
      {formData.route_id && formData.vessel_id && (
        <View style={styles.selectionPreview}>
          <View style={styles.selectionPreviewIcon}>
            <Ship size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectionPreviewText}>
              {getRouteLabel(
                routes.find(r => r.id === formData.route_id) || {}
              )}
              {' • '}
              {vessels.find(v => v.id === formData.vessel_id)?.name ||
                'Selected Vessel'}
            </Text>
            {routeStops[formData.route_id] &&
              routeStops[formData.route_id].length > 2 && (
                <Text style={styles.multiStopIndicator}>
                  Multi-stop route with {routeStops[formData.route_id].length}{' '}
                  stops
                </Text>
              )}
          </View>
        </View>
      )}
    </View>
  );

  const renderDateSelection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderIcon}>
          <Calendar size={20} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>Date Range</Text>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <DatePicker
            label='Start Date'
            value={formData.start_date || ''}
            onChange={(value: string) => handleUpdateField('start_date', value)}
            placeholder='Select start date'
            error={errors.start_date}
            required
          />
        </View>

        <View style={styles.formHalf}>
          <DatePicker
            label='End Date'
            value={formData.end_date || ''}
            onChange={(value: string) => handleUpdateField('end_date', value)}
            placeholder='Select end date'
            error={errors.end_date}
            required
          />
        </View>
      </View>

      {dateRangeInfo && (
        <View style={styles.infoPreview}>
          <View style={styles.infoPreviewIcon}>
            <Calendar size={16} color={colors.info} />
          </View>
          <Text style={styles.infoPreviewText}>
            {dateRangeInfo.totalDays} days total • {dateRangeInfo.weekdays}{' '}
            weekdays • {dateRangeInfo.weekends} weekends
          </Text>
        </View>
      )}
    </View>
  );

  const renderDaySelection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderIcon}>
          <Activity size={20} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>Days of Week</Text>
      </View>

      <View style={styles.quickActionsContainer}>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => handleQuickDaySelection('weekdays')}
        >
          <Text style={styles.quickActionText}>Weekdays</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => handleQuickDaySelection('weekends')}
        >
          <Text style={styles.quickActionText}>Weekends</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => handleQuickDaySelection('all')}
        >
          <Text style={styles.quickActionText}>All</Text>
        </Pressable>
        <Pressable
          style={styles.quickActionButton}
          onPress={() => handleQuickDaySelection('none')}
        >
          <Text style={styles.quickActionText}>Clear</Text>
        </Pressable>
      </View>

      <View style={styles.daysGrid}>
        {daysOfWeek.map(day => {
          const isSelected = formData.selected_days?.includes(day.value);
          return (
            <Pressable
              key={day.value}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => handleDayToggle(day.value)}
            >
              <Text
                style={[
                  styles.dayChipText,
                  isSelected && styles.dayChipTextSelected,
                ]}
              >
                {day.short}
              </Text>
              <Text
                style={[
                  styles.dayChipLabel,
                  isSelected && styles.dayChipLabelSelected,
                ]}
              >
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errors.selected_days && (
        <Text style={styles.errorText}>{errors.selected_days}</Text>
      )}
    </View>
  );

  const renderTimeSlotSelection = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderIcon}>
            <Clock size={20} color={colors.primary} />
          </View>
          <Text style={styles.sectionTitle}>Time Slots</Text>
        </View>

        {/* Custom Time Slot Input */}
        <View style={styles.customTimeSlotContainer}>
          <Text style={styles.customTimeSlotLabel}>Add Custom Time Slot</Text>
          <View style={styles.customTimeSlotInput}>
            <View style={{ flex: 1 }}>
              <TimePicker
                label={undefined}
                value={newTimeSlot}
                onChange={setNewTimeSlot}
                placeholder='HH:MM (24-hour)'
                compact
              />
            </View>
            <Pressable
              style={[
                styles.addTimeButton,
                !newTimeSlot && styles.addTimeButtonDisabled,
              ]}
              onPress={addCustomTimeSlot}
              disabled={!newTimeSlot}
            >
              <Plus
                size={16}
                color={newTimeSlot ? colors.white : colors.textTertiary}
              />
            </Pressable>
          </View>
        </View>

        {/* Time Slot Categories */}
        {Object.entries(timeSlotsByCategory).map(([category, slots]) => {
          const selectedInCategory = slots.filter(slot =>
            formData.time_slots?.includes(slot.value)
          ).length;
          const allSelected = selectedInCategory === slots.length;

          return (
            <View key={category} style={styles.timeCategory}>
              <Pressable
                style={styles.timeCategoryHeader}
                onPress={() => handleQuickTimeSelection(category)}
              >
                <Text style={styles.timeCategoryTitle}>{category}</Text>
                <View style={styles.timeCategoryInfo}>
                  <Text style={styles.timeCategoryCount}>
                    {selectedInCategory}/{slots.length}
                  </Text>
                  <Check
                    size={16}
                    color={allSelected ? colors.primary : colors.textTertiary}
                  />
                </View>
              </Pressable>

              <View style={styles.timeSlotsGrid}>
                {slots.map(slot => {
                  const isSelected = formData.time_slots?.includes(slot.value);
                  const isCustom = category === 'Custom';

                  return (
                    <View key={slot.value} style={styles.timeSlotWrapper}>
                      <Pressable
                        style={[
                          styles.timeSlotChip,
                          isCustom && !isSelected && styles.customTimeSlotChip,
                          isSelected && styles.timeSlotChipSelected,
                        ]}
                        onPress={() => handleTimeSlotToggle(slot.value)}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                          ]}
                        >
                          {slot.label}
                        </Text>
                        {isCustom && (
                          <Pressable
                            style={styles.removeTimeSlotButton}
                            onPress={() => removeCustomTimeSlot(slot.value)}
                          >
                            <Trash2 size={12} color={colors.textTertiary} />
                          </Pressable>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {errors.time_slots && (
          <Text style={styles.errorText}>{errors.time_slots}</Text>
        )}
      </View>
    );
  };

  const renderSettings = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderIcon}>
          <Settings size={20} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>Trip Settings</Text>
      </View>

      <View style={styles.formGroup}>
        <Dropdown
          label='Captain'
          value={formData.captain_id || ''}
          onValueChange={(value: string) =>
            handleUpdateField('captain_id', value)
          }
          options={captainOptions}
          placeholder='Select captain (optional)'
          error={errors.captain_id}
        />
      </View>

      <View style={styles.formRow}>
        <View style={styles.formHalf}>
          <TextInput
            label='Fare Multiplier'
            value={formData.fare_multiplier?.toString()}
            onChangeText={text =>
              handleUpdateField('fare_multiplier', parseFloat(text) || 1.0)
            }
            placeholder='1.0'
            keyboardType='decimal-pad'
            error={errors.fare_multiplier}
          />
        </View>

        <View style={styles.formHalf}>
          <TextInput
            label='Available Seats'
            value={formData.vessel_capacity?.toString()}
            onChangeText={text =>
              handleUpdateField('vessel_capacity', parseInt(text) || 50)
            }
            placeholder='50'
            keyboardType='number-pad'
            error={errors.vessel_capacity}
          />
        </View>
      </View>

      <View style={styles.infoPreview}>
        <View style={styles.infoPreviewIcon}>
          <Info size={16} color={colors.success} />
        </View>
        <Text style={styles.infoPreviewText}>
          Fare multiplier adjusts base route fare • Vessel capacity overrides
          default seating
        </Text>
      </View>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionHeaderIcon,
            { backgroundColor: colors.successLight },
          ]}
        >
          <Check size={20} color={colors.success} />
        </View>
        <Text style={styles.sectionTitle}>Generation Summary</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Calendar size={20} color={colors.primary} />
          <Text style={styles.summaryText}>
            Will generate{' '}
            <Text style={styles.summaryHighlight}>{tripCount}</Text> trips
          </Text>
        </View>

        {dateRangeInfo && (
          <View style={styles.summaryRow}>
            <Clock size={20} color={colors.info} />
            <Text style={styles.summaryText}>
              From {formatDateForDisplay(formData.start_date!)} to{' '}
              {formatDateForDisplay(formData.end_date!)}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Users size={20} color={colors.success} />
          <Text style={styles.summaryText}>
            {formData.vessel_capacity} seats per trip •{' '}
            {formData.selected_days?.length || 0} days •{' '}
            {formData.time_slots?.length || 0} time slots
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPreviewModal = () => (
    <Modal
      visible={showPreview}
      animationType='slide'
      presentationStyle='pageSheet'
    >
      <View style={styles.previewContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Trip Generation Preview</Text>
          <Pressable onPress={() => setShowPreview(false)}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        {previewData && (
          <ScrollView style={styles.previewContent}>
            <View style={styles.previewStats}>
              <View style={styles.previewStatItem}>
                <Text style={styles.previewStatValue}>
                  {previewData.safeTrips.length}
                </Text>
                <Text style={styles.previewStatLabel}>Safe to Generate</Text>
              </View>
              <View style={styles.previewStatItem}>
                <Text
                  style={[styles.previewStatValue, { color: colors.warning }]}
                >
                  {previewData.conflicts.length}
                </Text>
                <Text style={styles.previewStatLabel}>Conflicts</Text>
              </View>
            </View>

            {previewData.conflicts.length > 0 && (
              <View style={styles.conflictsSection}>
                <Text style={styles.conflictsTitle}>Conflicting Trips</Text>
                {previewData.conflicts
                  .slice(0, 5)
                  .map((conflict: any, index: number) => (
                    <View key={index} style={styles.conflictItem}>
                      <AlertTriangle size={16} color={colors.warning} />
                      <Text style={styles.conflictText}>
                        {conflict.trip.travel_date} at{' '}
                        {conflict.trip.departure_time}
                      </Text>
                    </View>
                  ))}
                {previewData.conflicts.length > 5 && (
                  <Text style={styles.conflictMore}>
                    ...and {previewData.conflicts.length - 5} more
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        )}

        <View style={styles.previewActions}>
          <Button
            title='Cancel'
            variant='outline'
            onPress={() => setShowPreview(false)}
          />
          <Button
            title='Generate Trips'
            variant='primary'
            onPress={() => {
              setShowPreview(false);
              handleGenerate();
            }}
            loading={isGenerating}
          />
        </View>
      </View>
    </Modal>
  );

  if (!visible) return null;

  const renderErrorDisplay = () => {
    const errorKeys = Object.keys(errors).filter(
      key => errors[key] && errors[key].trim() !== ''
    );

    if (errorKeys.length === 0) return null;

    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <AlertTriangle size={16} color={colors.error} />
        </View>
        <Text style={styles.errorText}>{errors[errorKeys[0]]}</Text>
      </View>
    );
  };

  const renderActionButtons = () => (
    <View style={styles.buttonContainer}>
      <Button
        title='Preview Generation'
        variant='outline'
        onPress={handlePreview}
        disabled={tripCount === 0}
        loading={false}
        icon={<Filter size={18} color={colors.primary} />}
      />
      <Button
        title={`Generate ${tripCount} Trip${tripCount !== 1 ? 's' : ''}`}
        variant='primary'
        onPress={handleGenerate}
        disabled={tripCount === 0 || isGenerating}
        loading={isGenerating}
        icon={<Zap size={18} color={colors.white} />}
      />
    </View>
  );

  const renderStatusIndicator = () => {
    if (!hasChanges) return null;

    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusIcon}>
          <AlertTriangle size={14} color={colors.warning} />
        </View>
        <Text style={styles.statusText}>Form ready for generation</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
    >
      <View style={styles.container}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHeaderLeft}>
            <Zap size={24} color={colors.primary} />
            <Text style={styles.modalTitle}>Generate Trips</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderRouteVesselSelection()}
          {renderDateSelection()}
          {renderDaySelection()}
          {renderTimeSlotSelection()}
          {renderSettings()}
          {renderSummary()}
          {renderErrorDisplay()}
          {renderActionButtons()}
          {renderStatusIndicator()}
        </ScrollView>

        {renderPreviewModal()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  // Header Section (RouteForm style)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
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
  // Section Styles (RouteForm style)
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
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
  // Preview Styles (RouteForm style)
  selectionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${colors.primary}10`,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  selectionPreviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.primary,
  },
  multiStopIndicator: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary,
    opacity: 0.8,
    marginTop: 4,
  },
  infoPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${colors.info}10`,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  infoPreviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.info}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoPreviewText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
    color: colors.info,
  },
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickActionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  quickActionText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  // Days Grid
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dayChip: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minWidth: 70,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  dayChipTextSelected: {
    color: colors.white,
  },
  dayChipLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  dayChipLabelSelected: {
    color: colors.white,
  },
  // Custom Time Slots
  customTimeSlotContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  customTimeSlotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  customTimeSlotInput: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  addTimeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTimeButtonDisabled: {
    backgroundColor: colors.backgroundTertiary,
  },
  // Time Categories
  timeCategory: {
    marginBottom: 20,
  },
  timeCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: 8,
  },
  timeCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  timeCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeCategoryCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotWrapper: {
    position: 'relative',
  },
  timeSlotChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSlotChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  customTimeSlotChip: {
    backgroundColor: `${colors.primary}15`,
    borderColor: `${colors.primary}50`,
  },
  timeSlotText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  timeSlotTextSelected: {
    color: colors.white,
  },
  removeTimeSlotButton: {
    padding: 2,
  },
  // Summary
  summaryCard: {
    backgroundColor: `${colors.primary}10`,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  summaryHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  // Error Styles (RouteForm style)
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
  // Button Styles (RouteForm style)
  buttonContainer: {
    gap: 16,
    marginBottom: 20,
  },
  // Status Styles (RouteForm style)
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.successLight,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  statusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewStats: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  previewStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  previewStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  previewStatLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  conflictsSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  conflictsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 12,
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  conflictText: {
    fontSize: 14,
    color: colors.text,
  },
  conflictMore: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
