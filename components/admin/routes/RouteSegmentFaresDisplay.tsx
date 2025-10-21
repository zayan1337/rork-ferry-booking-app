/**
 * Route Segment Fares Display Component
 *
 * Shows all segment fares for a multi-stop route
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { ArrowRight, Edit, Check, X, DollarSign } from 'lucide-react-native';
import type { RouteSegmentFare } from '@/types/multiStopRoute';
import { formatCurrency } from '@/utils/currencyUtils';

interface RouteSegmentFaresDisplayProps {
  segmentFares: RouteSegmentFare[];
  editable?: boolean;
  onEditFare?: (fareId: string, newAmount: number) => Promise<void>;
}

export default function RouteSegmentFaresDisplay({
  segmentFares,
  editable = false,
  onEditFare,
}: RouteSegmentFaresDisplayProps) {
  const [editingFareId, setEditingFareId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  if (segmentFares.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No segment fares configured</Text>
      </View>
    );
  }

  const handleStartEdit = (fare: RouteSegmentFare) => {
    setEditingFareId(fare.id);
    setEditValue(fare.fare_amount.toString());
  };

  const handleSaveEdit = async (fareId: string) => {
    const newAmount = parseFloat(editValue);

    if (isNaN(newAmount) || newAmount <= 0) {
      Alert.alert('Invalid Amount', 'Fare must be a positive number');
      return;
    }

    setSaving(true);
    try {
      await onEditFare?.(fareId, newAmount);
      setEditingFareId(null);
      setEditValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update fare');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingFareId(null);
    setEditValue('');
  };

  // Sort by from_stop_sequence then to_stop_sequence
  const sortedFares = [...segmentFares].sort((a, b) => {
    if (a.from_stop_sequence !== b.from_stop_sequence) {
      return (a.from_stop_sequence || 0) - (b.from_stop_sequence || 0);
    }
    return (a.to_stop_sequence || 0) - (b.to_stop_sequence || 0);
  });

  return (
    <View style={styles.container}>
      {sortedFares.map(fare => {
        const isEditing = editingFareId === fare.id;

        return (
          <View key={fare.id} style={styles.fareRow}>
            {/* Route segment */}
            <View style={styles.segmentInfo}>
              <Text style={styles.fromIsland}>{fare.from_island_name}</Text>
              <ArrowRight size={14} color={colors.textSecondary} />
              <Text style={styles.toIsland}>{fare.to_island_name}</Text>

              {/* Metadata */}
              <View style={styles.metadata}>
                <Text style={styles.metadataText}>
                  {fare.stops_between || 0} stop
                  {(fare.stops_between || 0) > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Fare amount */}
            <View style={styles.fareContainer}>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.editInput}
                    value={editValue}
                    onChangeText={setEditValue}
                    keyboardType='numeric'
                    placeholder='0.00'
                    autoFocus
                  />
                  <Pressable
                    onPress={() => handleSaveEdit(fare.id)}
                    style={[styles.editButton, styles.saveButton]}
                    disabled={saving}
                  >
                    <Check size={16} color={colors.success} />
                  </Pressable>
                  <Pressable
                    onPress={handleCancelEdit}
                    style={[styles.editButton, styles.cancelButton]}
                    disabled={saving}
                  >
                    <X size={16} color={colors.error} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.fareAmount}>
                    {formatCurrency(fare.fare_amount, 'MVR')}
                  </Text>
                  {editable && (
                    <Pressable
                      onPress={() => handleStartEdit(fare)}
                      style={styles.editIconButton}
                    >
                      <Edit size={14} color={colors.primary} />
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <DollarSign size={16} color={colors.primary} />
        </View>
        <Text style={styles.summaryText}>
          {segmentFares.length} segment{segmentFares.length > 1 ? 's' : ''}{' '}
          configured
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  segmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  fromIsland: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  toIsland: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  metadata: {
    marginLeft: 4,
  },
  metadataText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  fareContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fareAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    minWidth: 80,
    textAlign: 'right',
  },
  editIconButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    width: 80,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
  },
  saveButton: {
    backgroundColor: colors.successLight,
  },
  cancelButton: {
    backgroundColor: colors.errorLight,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  summaryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});


