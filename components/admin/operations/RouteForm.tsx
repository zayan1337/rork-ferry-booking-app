import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { useRouteManagement } from '@/hooks/useRouteManagement';
import { useIslandStore } from '@/store/admin/islandStore';
import { AdminManagement } from '@/types';
import {
  Route as RouteIcon,
  MapPin,
  AlertCircle,
  Save,
  RotateCcw,
  Info,
  Plus,
  Trash2,
  DollarSign,
  Sparkles,
  Settings,
  Ship,
  Flag,
} from 'lucide-react-native';

// Components
import TextInput from '@/components/admin/TextInput';
import UnitInput from '@/components/admin/UnitInput';
import Button from '@/components/admin/Button';
import Dropdown from '@/components/admin/Dropdown';
import Switch from '@/components/admin/Switch';
import Input from '@/components/Input';

type RouteFormData = AdminManagement.RouteFormData;

interface RouteFormProps {
  routeId?: string;
  onSave?: (route: RouteFormData) => void;
  onCancel?: () => void;
}

interface RouteStopData {
  id: string; // Temporary UI ID or database ID
  island_id: string;
  stop_type: 'pickup' | 'dropoff' | 'both';
  estimated_travel_time_from_previous: number | null;
  notes?: string;
}

interface FormData {
  name: string;
  base_fare: number;
  distance: string;
  duration: string;
  description: string;
  status: 'active' | 'inactive' | 'maintenance';
  is_active: boolean;
  route_stops: RouteStopData[];
  segment_fares: Map<string, number>;
}

interface ValidationErrors {
  name?: string;
  base_fare?: string;
  route_stops?: string;
  segment_fares?: string;
  general?: string;
}

export default function RouteForm({
  routeId,
  onSave,
  onCancel,
}: RouteFormProps) {
  const {
    routes,
    getById,
    create,
    update,
    loading: routeLoading,
  } = useRouteManagement();
  const { data: islands, fetchAll: fetchIslands } = useIslandStore();

  const currentRoute = routeId ? getById(routeId) : null;

  const [formData, setFormData] = useState<FormData>({
    name: currentRoute?.name || '',
    base_fare: currentRoute?.base_fare || 50,
    distance: currentRoute?.distance || '',
    duration: currentRoute?.duration || '',
    description: currentRoute?.description || '',
    status: currentRoute?.status || 'active',
    is_active: currentRoute?.is_active ?? true,
    route_stops: [],
    segment_fares: new Map(),
  });

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialStopsSnapshot, setInitialStopsSnapshot] = useState<string>('');
  const [initialFaresSnapshot, setInitialFaresSnapshot] = useState<string>('');

  // Load islands on mount
  useEffect(() => {
    if (!islands || islands.length === 0) {
      fetchIslands();
    }
  }, []);

  // Initialize form data
  useEffect(() => {
    if (currentRoute && routeId) {
      initializeFormData();
    } else if (!routeId) {
      initializeNewRoute();
    }
  }, [routeId, currentRoute]);

  const initializeFormData = async () => {
    if (!routeId) return;

    setLoading(true);
    try {
      // Import the utility functions
      const { getRouteStops, getRouteSegmentFares } = await import(
        '@/utils/multiStopRouteUtils'
      );

      // Load route stops from database
      const stops = await getRouteStops(routeId);

      // Load segment fares from database
      const fares = await getRouteSegmentFares(routeId);

      // Convert stops to form data format
      const routeStops: RouteStopData[] = stops.map((stop, index) => ({
        id: stop.id,
        island_id: stop.island_id,
        stop_type: stop.stop_type as 'pickup' | 'dropoff' | 'both',
        estimated_travel_time_from_previous:
          stop.estimated_travel_time_from_previous,
        notes: stop.notes || '',
      }));

      // Convert fares to Map format
      const segmentFares = new Map<string, number>();
      fares.forEach(fare => {
        // Find the index of from and to stops
        const fromIndex = stops.findIndex(s => s.id === fare.from_stop_id);
        const toIndex = stops.findIndex(s => s.id === fare.to_stop_id);

        if (fromIndex !== -1 && toIndex !== -1) {
          const key = `${fromIndex}-${toIndex}`;
          segmentFares.set(key, fare.fare_amount);
        }
      });

      // Update form data with loaded data
      setFormData(prev => {
        const newStops = routeStops.length > 0 ? routeStops : prev.route_stops;
        const newFares =
          segmentFares.size > 0 ? segmentFares : prev.segment_fares;

        // Create snapshots of initial state for change detection
        setInitialStopsSnapshot(JSON.stringify(newStops));
        setInitialFaresSnapshot(
          JSON.stringify(Array.from(newFares.entries()).sort())
        );

        return {
          ...prev,
          name: currentRoute?.name || prev.name,
          base_fare: currentRoute?.base_fare || prev.base_fare,
          distance: currentRoute?.distance || prev.distance,
          duration: currentRoute?.duration || prev.duration,
          description: currentRoute?.description || prev.description,
          status: currentRoute?.status || prev.status,
          is_active: currentRoute?.is_active ?? prev.is_active,
          route_stops: newStops,
          segment_fares: newFares,
        };
      });
    } catch (error) {
      console.error('Error loading route data:', error);
      Alert.alert(
        'Error Loading Route',
        'Failed to load route stops and fares. Please try again.'
      );
      // Initialize with default data as fallback
      setFormData(prev => ({
        ...prev,
        route_stops: [
          {
            id: 'stop_1',
            island_id: '',
            stop_type: 'pickup',
            estimated_travel_time_from_previous: null,
            notes: '',
          },
          {
            id: 'stop_2',
            island_id: '',
            stop_type: 'dropoff',
            estimated_travel_time_from_previous: 30,
            notes: '',
          },
        ],
      }));
    } finally {
      setLoading(false);
    }
  };

  const initializeNewRoute = () => {
    setFormData(prev => ({
      ...prev,
      route_stops: [
        {
          id: `stop_${Date.now()}_1`,
          island_id: '',
          stop_type: 'pickup',
          estimated_travel_time_from_previous: null,
          notes: '',
        },
        {
          id: `stop_${Date.now()}_2`,
          island_id: '',
          stop_type: 'dropoff',
          estimated_travel_time_from_previous: 30,
          notes: '',
        },
      ],
    }));
  };

  // Track form changes
  useEffect(() => {
    if (currentRoute) {
      // Check basic field changes
      const hasBasicChanges =
        formData.name !== (currentRoute.name || '') ||
        formData.base_fare !== (currentRoute.base_fare || 0) ||
        formData.distance !== (currentRoute.distance || '') ||
        formData.duration !== (currentRoute.duration || '') ||
        formData.description !== (currentRoute.description || '') ||
        formData.status !== (currentRoute.status || 'active') ||
        formData.is_active !== (currentRoute.is_active ?? true);

      // Check if stops have changed by comparing snapshots
      const currentStopsSnapshot = JSON.stringify(formData.route_stops);
      const hasStopsChanges =
        initialStopsSnapshot !== '' &&
        currentStopsSnapshot !== initialStopsSnapshot;

      // Check if fares have changed by comparing snapshots
      const currentFaresSnapshot = JSON.stringify(
        Array.from(formData.segment_fares.entries()).sort()
      );
      const hasFaresChanges =
        initialFaresSnapshot !== '' &&
        currentFaresSnapshot !== initialFaresSnapshot;

      setHasChanges(hasBasicChanges || hasStopsChanges || hasFaresChanges);
    } else {
      // For new routes
      const hasFormChanges =
        formData.name.trim() !== '' ||
        formData.base_fare !== 50 ||
        formData.distance.trim() !== '' ||
        formData.duration.trim() !== '' ||
        formData.description.trim() !== '' ||
        formData.route_stops.length > 0 ||
        formData.segment_fares.size > 0;
      setHasChanges(hasFormChanges);
    }
  }, [formData, currentRoute, initialStopsSnapshot, initialFaresSnapshot]);

  // ========================================================================
  // STOP MANAGEMENT
  // ========================================================================

  const addStop = () => {
    setFormData(prev => {
      const currentStops = [...prev.route_stops];

      // If there are existing stops, update the previous last stop to 'both'
      // if (currentStops.length > 0) {
      //   const lastIndex = currentStops.length - 1;
      //   currentStops[lastIndex] = {
      //     ...currentStops[lastIndex],
      //     stop_type: 'both',
      //   };
      // }

      // Create new stop as the last stop (dropoff)
      const newStop: RouteStopData = {
        id: `stop_${Date.now()}`,
        island_id: '',
        stop_type: 'dropoff',
        estimated_travel_time_from_previous: 30,
        notes: '',
      };

      return {
        ...prev,
        route_stops: [...currentStops, newStop],
      };
    });
  };

  const removeStop = (stopId: string) => {
    if (formData.route_stops.length <= 2) {
      Alert.alert('Minimum Stops', 'A route must have at least 2 stops');
      return;
    }

    setFormData(prev => {
      const updatedStops = prev.route_stops.filter(s => s.id !== stopId);

      // After removing, ensure the last stop is set to 'dropoff'
      if (updatedStops.length > 0) {
        const lastIndex = updatedStops.length - 1;
        updatedStops[lastIndex] = {
          ...updatedStops[lastIndex],
          stop_type: 'dropoff',
        };
      }

      return {
        ...prev,
        route_stops: updatedStops,
      };
    });
  };

  const updateStop = (stopId: string, updates: Partial<RouteStopData>) => {
    setFormData(prev => ({
      ...prev,
      route_stops: prev.route_stops.map(s =>
        s.id === stopId ? { ...s, ...updates } : s
      ),
    }));
  };

  const moveStop = (stopId: string, direction: 'up' | 'down') => {
    const index = formData.route_stops.findIndex(s => s.id === stopId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.route_stops.length - 1)
    ) {
      return;
    }

    const newStops = [...formData.route_stops];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newStops[index], newStops[swapIndex]] = [
      newStops[swapIndex],
      newStops[index],
    ];

    setFormData(prev => ({ ...prev, route_stops: newStops }));
  };

  // ========================================================================
  // SEGMENT FARES
  // ========================================================================

  const autoGenerateFares = () => {
    if (formData.route_stops.length < 2) {
      Alert.alert('Not Enough Stops', 'Add at least 2 stops to generate fares');
      return;
    }

    // Check if all stops have islands selected
    const missingIslands = formData.route_stops.filter(s => !s.island_id);
    if (missingIslands.length > 0) {
      Alert.alert(
        'Missing Islands',
        'Please select an island for all stops before generating fares'
      );
      return;
    }

    const newFares = new Map<string, number>();
    const stops = formData.route_stops;

    // Generate fares for all valid segments
    for (let i = 0; i < stops.length; i++) {
      const fromStop = stops[i];
      if (fromStop.stop_type === 'dropoff') continue;

      for (let j = i + 1; j < stops.length; j++) {
        const toStop = stops[j];
        if (toStop.stop_type === 'pickup') continue;

        const segments = j - i;
        const fare = formData.base_fare * segments;
        newFares.set(`${i}-${j}`, fare);
      }
    }

    setFormData(prev => ({
      ...prev,
      segment_fares: newFares,
    }));

    Alert.alert(
      'Fares Generated',
      `Generated ${newFares.size} segment fares based on MVR ${formData.base_fare} per segment`
    );
  };

  const updateSegmentFare = (key: string, fare: number) => {
    setFormData(prev => {
      const newFares = new Map(prev.segment_fares);
      newFares.set(key, fare);
      return { ...prev, segment_fares: newFares };
    });
  };

  // ========================================================================
  // VALIDATION
  // ========================================================================

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Route name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Route name must be at least 3 characters';
    } else if (formData.name.trim().length > 255) {
      errors.name = 'Route name must be less than 255 characters';
    }

    // Base fare validation
    if (!formData.base_fare || formData.base_fare <= 0) {
      errors.base_fare = 'Base fare must be greater than 0';
    } else if (formData.base_fare > 10000) {
      errors.base_fare = 'Base fare seems too high (max: 10,000 MVR)';
    }

    // Stops validation
    if (formData.route_stops.length < 2) {
      errors.route_stops = 'Route must have at least 2 stops';
    } else {
      // Check for duplicate islands
      const islandIds = formData.route_stops.map(s => s.island_id);
      if (islandIds.some(id => !id)) {
        errors.route_stops = 'All stops must have an island selected';
      } else if (new Set(islandIds).size !== islandIds.length) {
        errors.route_stops = 'Each stop must be at a different island';
      }

      // Check stop types
      const firstStop = formData.route_stops[0];
      const lastStop = formData.route_stops[formData.route_stops.length - 1];

      if (firstStop.stop_type !== 'pickup' && firstStop.stop_type !== 'both') {
        errors.route_stops =
          'First stop must allow passenger pickup (pickup or both)';
      }
      if (lastStop.stop_type !== 'dropoff' && lastStop.stop_type !== 'both') {
        errors.route_stops =
          'Last stop must allow passenger dropoff (dropoff or both)';
      }
    }

    // Segment fares validation
    if (formData.segment_fares.size === 0) {
      errors.segment_fares = 'Please generate or add segment fares';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ========================================================================
  // SUBMIT
  // ========================================================================

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setValidationErrors({});

    try {
      // Extract first and last stop island IDs for backward compatibility
      const firstStop = formData.route_stops[0];
      const lastStop = formData.route_stops[formData.route_stops.length - 1];
      const from_island_id = firstStop?.island_id;
      const to_island_id = lastStop?.island_id;

      // Prepare route data
      const routeData: RouteFormData = {
        name: formData.name.trim(),
        base_fare: formData.base_fare,
        distance: formData.distance.trim() || undefined,
        duration: formData.duration.trim() || undefined,
        description: formData.description.trim() || undefined,
        status: formData.status,
        is_active: formData.is_active,
        // Set from_island_id and to_island_id from first and last stops
        from_island_id: from_island_id,
        to_island_id: to_island_id,
        route_stops: formData.route_stops.map((stop, index) => ({
          island_id: stop.island_id,
          stop_sequence: index + 1, // 1-based sequence
          stop_type: stop.stop_type,
          estimated_travel_time:
            index === 0 ? null : stop.estimated_travel_time_from_previous,
          notes: stop.notes || '',
        })),
        segment_fares: Array.from(formData.segment_fares.entries()).map(
          ([key, fare]) => {
            const [fromIndex, toIndex] = key.split('-').map(Number);
            return {
              from_index: fromIndex,
              to_index: toIndex,
              fare_amount: fare,
            };
          }
        ),
      };

      if (currentRoute) {
        // Update existing route
        await update(currentRoute.id, routeData);
        Alert.alert('Success', 'Route updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (onSave) {
                onSave(routeData);
              }
            },
          },
        ]);
      } else {
        // Create new route
        await create(routeData);
        Alert.alert('Success', 'Route created successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (onSave) {
                onSave(routeData);
              }
            },
          },
        ]);

        // Reset form
        initializeNewRoute();
        setFormData(prev => ({
          ...prev,
          name: '',
          base_fare: 50,
          distance: '',
          duration: '',
          description: '',
          segment_fares: new Map(),
        }));
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error saving route:', error);
      let errorMessage =
        'Failed to save route. Please check your connection and try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setValidationErrors({ general: errorMessage });
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (currentRoute) {
      initializeFormData();
    } else {
      initializeNewRoute();
      setFormData(prev => ({
        ...prev,
        name: '',
        base_fare: 50,
        distance: '',
        duration: '',
        description: '',
        status: 'active',
        is_active: true,
        segment_fares: new Map(),
      }));
    }
    setValidationErrors({});
    setHasChanges(false);
  };

  // ========================================================================
  // HELPERS
  // ========================================================================

  const getAvailableIslands = (currentStopId: string) => {
    const selectedIslandIds = formData.route_stops
      .filter(stop => stop.id !== currentStopId && stop.island_id)
      .map(stop => stop.island_id);

    return (islands || [])
      .filter(island => !selectedIslandIds.includes(island.id))
      .map(island => ({
        label: island.name,
        value: island.id,
      }));
  };

  const getIslandName = (islandId: string) => {
    return islands?.find(i => i.id === islandId)?.name || 'Unknown';
  };

  // Calculate expected segments
  const expectedSegments = useMemo(() => {
    const stops = formData.route_stops;
    let count = 0;
    for (let i = 0; i < stops.length; i++) {
      if (stops[i].stop_type === 'dropoff') continue;
      for (let j = i + 1; j < stops.length; j++) {
        if (stops[j].stop_type === 'pickup') continue;
        count++;
      }
    }
    return count;
  }, [formData.route_stops]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <RouteIcon size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {currentRoute ? 'Edit Route' : 'Create New Route'}
          </Text>
          <Text style={styles.subtitle}>
            Define a multi-stop ferry route with segment-based pricing
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <Info size={20} color={colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Route Information</Text>
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Route Name'
              value={formData.name}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, name: text }))
              }
              placeholder='Enter route name (e.g., Malé Circle Route)'
              error={validationErrors.name}
              required
            />
          </View>

          <View style={styles.formGroup}>
            <TextInput
              label='Description'
              value={formData.description}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, description: text }))
              }
              placeholder='Enter route description (optional)'
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <TextInput
                label='Base Fare per Segment (MVR)'
                value={formData.base_fare.toString()}
                onChangeText={text => {
                  const numericValue = parseFloat(text) || 0;
                  setFormData(prev => ({ ...prev, base_fare: numericValue }));
                }}
                placeholder='Enter base fare per segment'
                keyboardType='numeric'
                error={validationErrors.base_fare}
                required
              />
              <Text style={styles.fieldHint}>
                Used to auto-calculate segment fares (e.g., 2 segments = 2x base
                fare)
              </Text>
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <UnitInput
                label='Total Distance'
                value={formData.distance}
                onChangeText={text =>
                  setFormData(prev => ({ ...prev, distance: text }))
                }
                placeholder='Enter distance'
                units={[
                  { label: 'Kilometers', value: 'km', suffix: 'km' },
                  { label: 'Miles', value: 'mi', suffix: 'mi' },
                ]}
                defaultUnit='km'
                keyboardType='numeric'
              />
            </View>
          </View>
        </View>

        {/* Route Stops */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderIcon}>
              <MapPin size={20} color={colors.primary} />
            </View>
            <View style={styles.sectionHeaderContent}>
              <Text style={styles.sectionTitle}>
                Route Stops ({formData.route_stops.length})
              </Text>
              <Text style={styles.sectionSubtitle}>
                {expectedSegments} possible journey segments
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Info size={16} color={colors.info} />
            <Text style={styles.infoText}>
              Define the islands this route visits in order. The first stop
              should allow pickup, the last stop should allow dropoff, and
              intermediate stops can be set to both. All stop types are
              editable.
            </Text>
          </View>

          {formData.route_stops.map((stop, index) => (
            <View key={stop.id} style={styles.stopCard}>
              {/* Stop Header */}
              <View style={styles.stopHeader}>
                <View style={styles.stopBadge}>
                  <Text style={styles.stopNumber}>{index + 1}</Text>
                </View>
                <View style={styles.stopLabelContainer}>
                  {index === 0 && stop.stop_type === 'pickup' ? (
                    <Ship size={16} color={colors.primary} />
                  ) : index === formData.route_stops.length - 1 &&
                    stop.stop_type === 'dropoff' ? (
                    <Flag size={16} color={colors.primary} />
                  ) : null}
                  <Text style={styles.stopLabel}>
                    {index === 0 && stop.stop_type === 'pickup'
                      ? 'Starting Point'
                      : index === formData.route_stops.length - 1 &&
                          stop.stop_type === 'dropoff'
                        ? 'Final Destination'
                        : `Stop ${index + 1}`}
                  </Text>
                </View>

                {/* Reorder & Delete Actions */}
                <View style={styles.stopActions}>
                  {index > 0 && (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => moveStop(stop.id, 'up')}
                    >
                      <Text style={styles.actionIcon}>↑</Text>
                    </Pressable>
                  )}
                  {index < formData.route_stops.length - 1 && (
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => moveStop(stop.id, 'down')}
                    >
                      <Text style={styles.actionIcon}>↓</Text>
                    </Pressable>
                  )}

                  {formData.route_stops.length > 2 && (
                    <Pressable
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => removeStop(stop.id)}
                    >
                      <Trash2 size={14} color={colors.error} />
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Stop Content */}
              <View style={styles.stopContent}>
                <View style={styles.formGroup}>
                  <Dropdown
                    label='Island'
                    value={stop.island_id}
                    onValueChange={value =>
                      updateStop(stop.id, { island_id: value })
                    }
                    options={getAvailableIslands(stop.id)}
                    placeholder='Select island'
                    required
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formHalf}>
                    <Dropdown
                      label='Stop Type'
                      value={stop.stop_type}
                      onValueChange={value =>
                        updateStop(stop.id, {
                          stop_type: value as 'pickup' | 'dropoff' | 'both',
                        })
                      }
                      options={[
                        { label: 'Pickup', value: 'pickup' },
                        { label: 'Dropoff', value: 'dropoff' },
                        { label: 'Both', value: 'both' },
                      ]}
                    />
                    {index === 0 && stop.stop_type !== 'pickup' && (
                      <Text style={styles.fieldHint}>
                        First stop should typically allow pickup
                      </Text>
                    )}
                    {index === formData.route_stops.length - 1 &&
                      stop.stop_type !== 'dropoff' && (
                        <Text style={styles.fieldHint}>
                          Last stop should typically allow dropoff
                        </Text>
                      )}
                  </View>
                </View>
                {index > 0 && (
                  <View style={styles.formHalf}>
                    <Input
                      label='Travel Time (min)'
                      value={
                        stop.estimated_travel_time_from_previous?.toString() ||
                        '30'
                      }
                      onChangeText={text => {
                        const time = parseInt(text) || 30;
                        updateStop(stop.id, {
                          estimated_travel_time_from_previous: time,
                        });
                      }}
                      placeholder='30'
                      keyboardType='numeric'
                      inputStyle={styles.travelTimeInput}
                    />
                  </View>
                )}

                {/* Notes field */}
                <View style={styles.formGroup}>
                  <Input
                    label='Notes'
                    value={stop.notes || ''}
                    onChangeText={text => updateStop(stop.id, { notes: text })}
                    placeholder={
                      index === 0 && stop.stop_type === 'pickup'
                        ? 'Starting point notes (optional)'
                        : index === formData.route_stops.length - 1 &&
                            stop.stop_type === 'dropoff'
                          ? 'Final destination notes (optional)'
                          : `Stop ${index + 1} notes (optional)`
                    }
                    multiline
                    numberOfLines={2}
                  />
                </View>
              </View>
            </View>
          ))}

          <Button
            title='Add Another Stop'
            onPress={addStop}
            variant='outline'
            icon={<Plus size={16} color={colors.primary} />}
            style={styles.addStopButton}
          />

          {validationErrors.route_stops && (
            <Text style={styles.errorText}>{validationErrors.route_stops}</Text>
          )}
        </View>

        {/* Segment Fares */}
        {formData.route_stops.length >= 2 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <DollarSign size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>Segment Fares</Text>
                <Text style={styles.sectionSubtitle}>
                  {formData.segment_fares.size} of {expectedSegments} configured
                </Text>
              </View>
            </View>

            <Text style={styles.sectionDescription}>
              Set the fare for each possible journey segment. Click
              "Auto-Generate" to calculate based on base fare × number of
              segments.
            </Text>

            <Button
              title='Auto-Generate All Fares'
              onPress={autoGenerateFares}
              variant='outline'
              icon={<Sparkles size={16} color={colors.primary} />}
              style={styles.autoGenerateButton}
            />

            {/* Display segment fares */}
            <View style={styles.faresList}>
              {Array.from(formData.segment_fares.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, fare]) => {
                  const [fromIdx, toIdx] = key.split('-').map(Number);
                  const fromStop = formData.route_stops[fromIdx];
                  const toStop = formData.route_stops[toIdx];

                  if (!fromStop || !toStop) return null;

                  const fromIsland = getIslandName(fromStop.island_id);
                  const toIsland = getIslandName(toStop.island_id);
                  const segmentCount = toIdx - fromIdx;

                  return (
                    <View key={key} style={styles.fareCard}>
                      <View style={styles.fareInfo}>
                        <View style={styles.fareRoute}>
                          <View style={styles.fareBadge}>
                            <Text style={styles.fareBadgeText}>
                              {fromIdx + 1}
                            </Text>
                          </View>
                          <Text style={styles.fareArrow}>→</Text>
                          <View style={styles.fareBadge}>
                            <Text style={styles.fareBadgeText}>
                              {toIdx + 1}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.fareIslands}>
                          {fromIsland} → {toIsland}
                        </Text>
                        <Text style={styles.fareSegments}>
                          {segmentCount} segment{segmentCount > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.fareInputGroup}>
                        <Input
                          value={fare.toString()}
                          onChangeText={text => {
                            const newFare = parseFloat(text) || 0;
                            updateSegmentFare(key, newFare);
                          }}
                          placeholder='0'
                          keyboardType='numeric'
                          style={styles.fareInput}
                        />
                        <Text style={styles.fareCurrency}>MVR</Text>
                      </View>
                    </View>
                  );
                })}
            </View>

            {validationErrors.segment_fares && (
              <Text style={styles.errorText}>
                {validationErrors.segment_fares}
              </Text>
            )}
          </View>
        )}

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
              label='Active Status'
              value={formData.is_active}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, is_active: value }))
              }
              description='Enable this route for trip scheduling and booking operations'
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
            title={currentRoute ? 'Update Route' : 'Create Route'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || !hasChanges}
            variant='primary'
            icon={
              <Save
                size={20}
                color={hasChanges ? colors.white : colors.textSecondary}
              />
            }
          />

          {hasChanges && (
            <Button
              title='Reset Changes'
              onPress={handleReset}
              variant='outline'
              disabled={loading}
              icon={<RotateCcw size={20} color={colors.primary} />}
            />
          )}

          {onCancel && (
            <Button
              title='Cancel'
              onPress={onCancel}
              variant='outline'
              disabled={loading}
            />
          )}
        </View>

        {/* Form Status */}
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
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
    fontWeight: '500',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
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
  sectionHeaderContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.info,
    lineHeight: 16,
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
  fieldHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  stopCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  stopLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stopLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtn: {
    backgroundColor: colors.errorLight,
  },
  stopContent: {
    gap: 12,
  },
  addStopButton: {
    marginTop: 8,
  },
  autoGenerateButton: {
    marginBottom: 16,
  },
  faresList: {
    gap: 12,
  },
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fareInfo: {
    flex: 1,
  },
  fareRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  fareBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  fareArrow: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fareIslands: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  fareSegments: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  fareInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fareInput: {
    width: 90,
  },
  fareCurrency: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
    backgroundColor: `${colors.warning}20`,
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
  travelTimeInput: {
    minHeight: 48,
    paddingVertical: 14,
    textAlignVertical: 'center',
    lineHeight: 20,
    fontSize: 16,
  },
});
