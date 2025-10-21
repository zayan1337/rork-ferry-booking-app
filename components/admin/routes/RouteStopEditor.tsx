/**
 * Route Stop Editor Component
 *
 * Allows admins to add, edit, reorder, and remove stops in a multi-stop route
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
} from 'lucide-react-native';
import Dropdown from '@/components/admin/Dropdown';
import Input from '@/components/Input';
import Button from '@/components/admin/Button';
import type { RouteStopFormData } from '@/types/multiStopRoute';

interface RouteStopEditorProps {
  stops: RouteStopFormData[];
  islands: { id: string; name: string; zone?: string }[];
  onChange: (stops: RouteStopFormData[]) => void;
  onValidate?: (isValid: boolean, errors: string[]) => void;
}

export default function RouteStopEditor({
  stops,
  islands,
  onChange,
  onValidate,
}: RouteStopEditorProps) {
  const [errors, setErrors] = useState<string[]>([]);

  // Validate stops whenever they change
  const validate = (currentStops: RouteStopFormData[]) => {
    const newErrors: string[] = [];

    // Check minimum stops
    if (currentStops.length < 2) {
      newErrors.push('Route must have at least 2 stops');
    }

    // Check for duplicate islands
    const islandIds = currentStops.map(s => s.island_id).filter(Boolean);
    const uniqueIslands = new Set(islandIds);
    if (uniqueIslands.size !== islandIds.length) {
      newErrors.push('Route cannot have duplicate islands');
    }

    // Check all stops have islands selected
    const incompleteStops = currentStops.filter(s => !s.island_id);
    if (incompleteStops.length > 0) {
      newErrors.push(`${incompleteStops.length} stop(s) need island selection`);
    }

    // Check at least one pickup and one dropoff
    const hasPickup = currentStops.some(
      s => s.stop_type === 'pickup' || s.stop_type === 'both'
    );
    const hasDropoff = currentStops.some(
      s => s.stop_type === 'dropoff' || s.stop_type === 'both'
    );

    if (!hasPickup) {
      newErrors.push('Route must have at least one pickup stop');
    }
    if (!hasDropoff) {
      newErrors.push('Route must have at least one dropoff stop');
    }

    setErrors(newErrors);
    const isValid = newErrors.length === 0;
    onValidate?.(isValid, newErrors);

    return isValid;
  };

  // Add new stop
  const handleAddStop = () => {
    const newStop: RouteStopFormData = {
      island_id: '',
      stop_sequence: stops.length + 1,
      stop_type: 'both',
      estimated_travel_time_from_previous: null,
      notes: '',
    };

    const updatedStops = [...stops, newStop];
    onChange(updatedStops);
    validate(updatedStops);
  };

  // Update stop
  const handleUpdateStop = (
    index: number,
    updates: Partial<RouteStopFormData>
  ) => {
    const updatedStops = stops.map((stop, i) =>
      i === index ? { ...stop, ...updates } : stop
    );
    onChange(updatedStops);
    validate(updatedStops);
  };

  // Delete stop
  const handleDeleteStop = (index: number) => {
    if (stops.length <= 2) {
      Alert.alert('Cannot Delete', 'Route must have at least 2 stops');
      return;
    }

    Alert.alert('Delete Stop', 'Are you sure you want to delete this stop?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updatedStops = stops
            .filter((_, i) => i !== index)
            .map((stop, i) => ({ ...stop, stop_sequence: i + 1 }));
          onChange(updatedStops);
          validate(updatedStops);
        },
      },
    ]);
  };

  // Move stop up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const updatedStops = [...stops];
    [updatedStops[index - 1], updatedStops[index]] = [
      updatedStops[index],
      updatedStops[index - 1],
    ];

    // Update sequences
    updatedStops.forEach((stop, i) => {
      stop.stop_sequence = i + 1;
    });

    onChange(updatedStops);
    validate(updatedStops);
  };

  // Move stop down
  const handleMoveDown = (index: number) => {
    if (index === stops.length - 1) return;

    const updatedStops = [...stops];
    [updatedStops[index], updatedStops[index + 1]] = [
      updatedStops[index + 1],
      updatedStops[index],
    ];

    // Update sequences
    updatedStops.forEach((stop, i) => {
      stop.stop_sequence = i + 1;
    });

    onChange(updatedStops);
    validate(updatedStops);
  };

  // Get available islands (exclude already selected)
  const getAvailableIslands = (currentIndex: number) => {
    const selectedIslandIds = stops
      .map((s, i) => (i !== currentIndex ? s.island_id : null))
      .filter(Boolean);

    return islands.filter(island => !selectedIslandIds.includes(island.id));
  };

  // Get island name
  const getIslandName = (islandId: string) => {
    const island = islands.find(i => i.id === islandId);
    return island ? island.name : 'Unknown';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Route Stops</Text>
        <Text style={styles.subtitle}>
          Add and configure all stops in this route (minimum 2)
        </Text>
      </View>

      {/* Error messages */}
      {errors.length > 0 && (
        <View style={styles.errorsContainer}>
          {errors.map((error, index) => (
            <Text key={index} style={styles.errorText}>
              • {error}
            </Text>
          ))}
        </View>
      )}

      {/* Stops list */}
      <ScrollView style={styles.stopsList} nestedScrollEnabled>
        {stops.map((stop, index) => (
          <View key={index} style={styles.stopCard}>
            {/* Stop header */}
            <View style={styles.stopHeader}>
              <View style={styles.stopHeaderLeft}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stopTitle}>Stop {index + 1}</Text>
              </View>

              <View style={styles.stopActions}>
                <Pressable
                  onPress={() => handleMoveUp(index)}
                  disabled={index === 0}
                  style={[
                    styles.actionButton,
                    index === 0 && styles.actionButtonDisabled,
                  ]}
                >
                  <ChevronUp
                    size={16}
                    color={index === 0 ? colors.textTertiary : colors.primary}
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleMoveDown(index)}
                  disabled={index === stops.length - 1}
                  style={[
                    styles.actionButton,
                    index === stops.length - 1 && styles.actionButtonDisabled,
                  ]}
                >
                  <ChevronDown
                    size={16}
                    color={
                      index === stops.length - 1
                        ? colors.textTertiary
                        : colors.primary
                    }
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleDeleteStop(index)}
                  disabled={stops.length <= 2}
                  style={[
                    styles.actionButton,
                    styles.deleteButton,
                    stops.length <= 2 && styles.actionButtonDisabled,
                  ]}
                >
                  <Trash2
                    size={16}
                    color={
                      stops.length <= 2 ? colors.textTertiary : colors.error
                    }
                  />
                </Pressable>
              </View>
            </View>

            {/* Stop content */}
            <View style={styles.stopContent}>
              {/* Island selection */}
              <Dropdown
                label='Island'
                value={stop.island_id}
                onValueChange={value =>
                  handleUpdateStop(index, { island_id: value })
                }
                options={[
                  { label: 'Select island...', value: '' },
                  ...getAvailableIslands(index).map(island => ({
                    label: island.name,
                    value: island.id,
                  })),
                ]}
                placeholder='Select island'
              />

              {/* Stop type */}
              <Dropdown
                label='Stop Type'
                value={stop.stop_type}
                onValueChange={value =>
                  handleUpdateStop(index, {
                    stop_type: value as 'pickup' | 'dropoff' | 'both',
                  })
                }
                options={[
                  { label: 'Both (Pickup & Dropoff)', value: 'both' },
                  { label: 'Pickup Only', value: 'pickup' },
                  { label: 'Dropoff Only', value: 'dropoff' },
                ]}
              />

              {/* Travel time (only for stops after the first) */}
              {index > 0 && (
                <View style={styles.travelTimeContainer}>
                  <View style={styles.travelTimeIcon}>
                    <Clock size={16} color={colors.info} />
                  </View>
                  <Input
                    label={`Travel time from ${getIslandName(stops[index - 1].island_id)}`}
                    value={
                      stop.estimated_travel_time_from_previous?.toString() || ''
                    }
                    onChangeText={value =>
                      handleUpdateStop(index, {
                        estimated_travel_time_from_previous: value
                          ? parseInt(value, 10)
                          : null,
                      })
                    }
                    keyboardType='numeric'
                    placeholder='Minutes'
                    style={styles.travelTimeInput}
                  />
                </View>
              )}

              {/* Notes */}
              <Input
                label='Notes (Optional)'
                value={stop.notes}
                onChangeText={value =>
                  handleUpdateStop(index, { notes: value })
                }
                placeholder='Any special notes for this stop...'
                multiline
                numberOfLines={2}
              />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add stop button */}
      <View style={styles.addButtonContainer}>
        <Button
          title='Add Stop'
          onPress={handleAddStop}
          variant='outline'
          icon={<Plus size={20} color={colors.primary} />}
        />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Stops</Text>
          <Text style={styles.summaryValue}>{stops.length}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Configured</Text>
          <Text style={styles.summaryValue}>
            {stops.filter(s => s.island_id).length}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text
            style={[
              styles.summaryValue,
              errors.length === 0 ? styles.statusValid : styles.statusInvalid,
            ]}
          >
            {errors.length === 0 ? '✓ Valid' : '✗ Invalid'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorsContainer: {
    backgroundColor: colors.errorLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginBottom: 4,
  },
  stopsList: {
    maxHeight: 500,
  },
  stopCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  stopTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  stopActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  deleteButton: {
    backgroundColor: colors.errorLight,
  },
  stopContent: {
    gap: 16,
  },
  travelTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  travelTimeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  travelTimeInput: {
    flex: 1,
  },
  addButtonContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 16,
    gap: 24,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statusValid: {
    color: colors.success,
  },
  statusInvalid: {
    color: colors.error,
  },
});
