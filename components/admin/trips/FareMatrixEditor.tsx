/**
 * Fare Matrix Editor Component
 *
 * Allows admins to manually set fares for each segment combination
 * in a multi-stop trip
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Edit2, Check, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import type { TripStopFormData } from '@/types/multiStopTrip';

interface FareMatrixEditorProps {
  stops: TripStopFormData[];
  islands: { id: string; name: string }[];
  customFares: Map<string, number>;
  onFareChange: (fromIndex: number, toIndex: number, fare: number) => void;
  baseFarePerStop?: number;
}

export default function FareMatrixEditor({
  stops,
  islands,
  customFares,
  onFareChange,
  baseFarePerStop = 50,
}: FareMatrixEditorProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  const getIslandName = (islandId: string) => {
    return islands.find(i => i.id === islandId)?.name || 'Unknown';
  };

  const getFare = (fromIndex: number, toIndex: number): number => {
    const key = `${fromIndex}-${toIndex}`;
    return customFares.get(key) || 0;
  };

  const startEditing = (fromIndex: number, toIndex: number) => {
    const key = `${fromIndex}-${toIndex}`;
    setEditingCell(key);
    setTempValue(getFare(fromIndex, toIndex).toString());
  };

  const saveEdit = (fromIndex: number, toIndex: number) => {
    const fare = parseFloat(tempValue) || 0;
    onFareChange(fromIndex, toIndex, fare);
    setEditingCell(null);
    setTempValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setTempValue('');
  };

  // Get all valid segment combinations
  const getSegments = () => {
    const segments: {
      fromIndex: number;
      toIndex: number;
      fromStop: TripStopFormData;
      toStop: TripStopFormData;
      distance: number;
    }[] = [];

    for (let i = 0; i < stops.length; i++) {
      const fromStop = stops[i];

      // Skip if dropoff only
      if (fromStop.stop_type === 'dropoff') continue;

      for (let j = i + 1; j < stops.length; j++) {
        const toStop = stops[j];

        // Skip if pickup only
        if (toStop.stop_type === 'pickup') continue;

        segments.push({
          fromIndex: i,
          toIndex: j,
          fromStop,
          toStop,
          distance: toStop.stop_sequence - fromStop.stop_sequence,
        });
      }
    }

    return segments;
  };

  const segments = getSegments();

  if (stops.length < 2) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          Add at least 2 stops to configure fares
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Fare for Each Segment</Text>
      <Text style={styles.subtitle}>
        {segments.length} possible route combinations
      </Text>

      <ScrollView style={styles.matrixContainer}>
        {segments.map(segment => {
          const key = `${segment.fromIndex}-${segment.toIndex}`;
          const isEditing = editingCell === key;
          const fare = getFare(segment.fromIndex, segment.toIndex);
          const fromIsland = getIslandName(segment.fromStop.island_id);
          const toIsland = getIslandName(segment.toStop.island_id);

          return (
            <Card key={key} variant='outlined' style={styles.segmentCard}>
              <View style={styles.segmentHeader}>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeText}>
                    {fromIsland} → {toIsland}
                  </Text>
                  <Text style={styles.routeMeta}>
                    Stop {segment.fromStop.stop_sequence} to Stop{' '}
                    {segment.toStop.stop_sequence} • {segment.distance} stop
                    {segment.distance > 1 ? 's' : ''}
                  </Text>
                </View>

                {isEditing ? (
                  <View style={styles.editingContainer}>
                    <View style={styles.fareInputContainer}>
                      <Text style={styles.currencyLabel}>MVR</Text>
                      <Input
                        value={tempValue}
                        onChangeText={setTempValue}
                        placeholder='0.00'
                        keyboardType='decimal-pad'
                        style={styles.fareInput}
                        autoFocus
                      />
                    </View>
                    <View style={styles.editActions}>
                      <Pressable
                        style={[styles.actionButton, styles.saveButton]}
                        onPress={() =>
                          saveEdit(segment.fromIndex, segment.toIndex)
                        }
                      >
                        <Check size={16} color={Colors.success} />
                      </Pressable>
                      <Pressable
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={cancelEdit}
                      >
                        <X size={16} color={Colors.error} />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.fareDisplay}>
                    <View style={styles.fareValueContainer}>
                      <Text
                        style={[
                          styles.fareValue,
                          fare === 0 && styles.fareValueEmpty,
                        ]}
                      >
                        MVR {fare.toFixed(2)}
                      </Text>
                      {fare === 0 && (
                        <Text style={styles.fareWarning}>Not set</Text>
                      )}
                    </View>
                    <Pressable
                      style={styles.editButton}
                      onPress={() =>
                        startEditing(segment.fromIndex, segment.toIndex)
                      }
                    >
                      <Edit2 size={16} color={Colors.primary} />
                    </Pressable>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>

      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Segments:</Text>
          <Text style={styles.summaryValue}>{segments.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Configured:</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  segments.filter(s => getFare(s.fromIndex, s.toIndex) > 0)
                    .length === segments.length
                    ? Colors.success
                    : Colors.warning,
              },
            ]}
          >
            {segments.filter(s => getFare(s.fromIndex, s.toIndex) > 0).length}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Missing:</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color:
                  segments.filter(s => getFare(s.fromIndex, s.toIndex) === 0)
                    .length > 0
                    ? Colors.error
                    : Colors.success,
              },
            ]}
          >
            {segments.filter(s => getFare(s.fromIndex, s.toIndex) === 0).length}
          </Text>
        </View>
      </Card>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  matrixContainer: {
    maxHeight: 400,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  segmentCard: {
    padding: 12,
    marginBottom: 8,
    backgroundColor: Colors.background,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeInfo: {
    flex: 1,
    marginRight: 12,
  },
  routeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  routeMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  fareDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fareValueContainer: {
    alignItems: 'flex-end',
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  fareValueEmpty: {
    color: Colors.error,
  },
  fareWarning: {
    fontSize: 10,
    color: Colors.error,
    marginTop: 2,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fareInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  fareInput: {
    width: 100,
    textAlign: 'right',
  },
  editActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.success + '20',
  },
  cancelButton: {
    backgroundColor: Colors.error + '20',
  },
  summaryCard: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.primary + '10',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
});
