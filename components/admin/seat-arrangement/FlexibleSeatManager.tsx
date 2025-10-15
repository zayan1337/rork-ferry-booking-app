import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminManagement } from '@/types';
import Button from '@/components/admin/Button';
import SeatEditModal from './SeatEditModal';
import {
  Plus,
  Minus,
  Save,
  RotateCcw,
  Ship,
  Trash2,
} from 'lucide-react-native';

type Seat = AdminManagement.Seat;
type FlexibleRow = {
  id: string;
  rowNumber: number;
  rowName: string;
  seatCount: number;
  seats: Seat[];
  rowType: 'bow' | 'main' | 'stern' | 'crew';
  maxWidth: number; // Maximum width for this row (for ferry shape)
  aisles: number[]; // Aisle positions within this row (after which seat position)
  hasRowAisleAfter?: boolean; // Whether there's a row aisle after this row
};

interface FlexibleSeatManagerProps {
  vesselId: string;
  initialSeats?: Seat[];
  seatingCapacity?: number;
  vesselType?: string;
  onSave: (seats: Seat[]) => Promise<void>;
  onChange?: (seats: Seat[]) => void;
  onCancel?: () => void;
  loading?: boolean;
}

export default function FlexibleSeatManager({
  vesselId,
  initialSeats = [],
  seatingCapacity = 0,
  vesselType = 'ferry',
  onSave,
  onChange,
  onCancel,
  loading = false,
}: FlexibleSeatManagerProps) {
  const [rows, setRows] = useState<FlexibleRow[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastVesselId, setLastVesselId] = useState<string>('');
  const [userHasModified, setUserHasModified] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
  const [showSeatEditModal, setShowSeatEditModal] = useState(false);

  const generateFerryTemplate = useCallback(() => {
    // Calculate optimal layout based on seating capacity
    const capacity = Number(seatingCapacity) || 36; // Ensure it's a number, default to 36 if not provided

    // Optimal ferry layout: 4 seats per row with center aisle (2+2 configuration)
    const seatsPerRow = 4;
    const totalRows = Math.ceil(capacity / seatsPerRow);

    const ferryRows: FlexibleRow[] = [];

    for (let i = 1; i <= totalRows; i++) {
      const rowName = String.fromCharCode(64 + i); // A, B, C, etc.
      const isFirstRow = i === 1;
      const isLastRow = i === totalRows;

      // Calculate seats for this row (handle remainder for last row)
      const remainingSeats = capacity - (i - 1) * seatsPerRow;
      const currentRowSeats = Math.min(seatsPerRow, remainingSeats);

      // Determine row type based on position
      let rowType: 'bow' | 'main' | 'stern' | 'crew' = 'main';
      let maxWidth = 8;

      if (isFirstRow && totalRows > 3) {
        rowType = 'bow';
        maxWidth = 6;
      } else if (isLastRow && totalRows > 3) {
        rowType = 'stern';
        maxWidth = 6;
      }

      // Add center aisle after 2nd seat if we have 3+ seats
      const aisles = currentRowSeats >= 3 ? [2] : [];

      // Add row aisle after every 3rd row (for larger ferries)
      const hasRowAisleAfter = totalRows > 6 && i % 3 === 0 && i < totalRows;

      ferryRows.push({
        id: `row_${i}`,
        rowNumber: i,
        rowName,
        seatCount: currentRowSeats,
        seats: [],
        rowType,
        maxWidth,
        aisles,
        hasRowAisleAfter,
      });
    }

    // Generate seats for each row
    ferryRows.forEach(row => {
      row.seats = generateSeatsForRow(row);
    });

    setRows(ferryRows);
    setIsInitialized(true);
    setLastVesselId(vesselId);
  }, [vesselId, seatingCapacity]);

  const loadExistingSeats = useCallback(() => {
    if (!initialSeats || initialSeats.length === 0) {
      generateFerryTemplate();
      return;
    }

    // Group existing seats by row
    const seatsByRow = new Map<number, Seat[]>();
    initialSeats.forEach(seat => {
      if (!seatsByRow.has(seat.row_number)) {
        seatsByRow.set(seat.row_number, []);
      }
      seatsByRow.get(seat.row_number)!.push(seat);
    });

    // Convert to flexible row structure
    const flexibleRows: FlexibleRow[] = [];
    const sortedRowNumbers = Array.from(seatsByRow.keys()).sort(
      (a, b) => a - b
    );

    sortedRowNumbers.forEach((rowNumber, index) => {
      const rowSeats = seatsByRow.get(rowNumber)!;
      rowSeats.sort((a, b) => a.position_x - b.position_x);

      // Determine row type based on seat types only (not position)
      const hasCrewSeats = rowSeats.some(seat => seat.seat_type === 'crew');
      const hasPremiumSeats = rowSeats.some(seat => seat.is_premium);

      // Only assign special row types if seats actually have those properties
      const rowType: 'bow' | 'main' | 'stern' | 'crew' = hasCrewSeats
        ? 'crew'
        : hasPremiumSeats && index < 2
          ? 'bow'
          : hasPremiumSeats && index >= sortedRowNumbers.length - 2
            ? 'stern'
            : 'main';

      // Generate row name (A, B, C, etc.)
      const rowName = String.fromCharCode(65 + index); // A=65, B=66, etc.

      // Determine aisles based on is_aisle property of seats
      // Logic: A seat has is_aisle=true if there's an aisle AFTER this position
      // So we can directly use the position_x of seats with is_aisle=true
      const aisles: number[] = [];

      // Find all seats with is_aisle=true - these indicate aisle positions
      rowSeats.forEach(seat => {
        if (seat.is_aisle) {
          const aislePosition = seat.position_x;
          if (!aisles.includes(aislePosition)) {
            aisles.push(aislePosition);
          }
        }
      });

      // Sort aisles
      aisles.sort((a, b) => a - b);

      // Determine max width based on row type
      const maxWidth =
        rowType === 'bow'
          ? 6
          : rowType === 'stern'
            ? 6
            : rowType === 'crew'
              ? 4
              : 8;

      // Check if any seat in this row has is_row_aisle = true
      const hasRowAisleAfter = rowSeats.some(
        seat => seat.is_row_aisle === true
      );

      const flexibleRow: FlexibleRow = {
        id: `row_${rowNumber}`,
        rowNumber,
        rowName,
        seatCount: rowSeats.length,
        seats: rowSeats,
        rowType,
        maxWidth,
        aisles,
        hasRowAisleAfter,
      };

      flexibleRows.push(flexibleRow);
    });

    setRows(flexibleRows);
    setIsInitialized(true);
    setLastVesselId(vesselId);
    setHasLoadedInitialData(true);

    // Trigger onChange with existing seats
    if (onChange) {
      onChange(initialSeats);
    }
  }, [initialSeats, onChange, generateFerryTemplate, vesselId]);

  // Handle vessel changes - reset when vessel changes
  useEffect(() => {
    if (lastVesselId !== vesselId) {
      setIsInitialized(false);
      setUserHasModified(false);
      setHasLoadedInitialData(false);
      setLastVesselId(vesselId);
      setRows([]); // Clear existing rows when switching vessels
    }
  }, [vesselId, lastVesselId]);

  // Initialize with existing seats or ferry template
  useEffect(() => {
    // Don't re-initialize if user has made modifications (to prevent losing changes)
    if (userHasModified) {
      return;
    }

    // Don't re-initialize if we've already loaded initial data for this vessel
    if (hasLoadedInitialData && lastVesselId === vesselId) {
      return;
    }

    // If we have initial seats, load them
    if (initialSeats && initialSeats.length > 0) {
      loadExistingSeats();
      return;
    }

    // If no initial seats and no rows, generate template
    if (rows.length === 0) {
      generateFerryTemplate();
    }
  }, [
    initialSeats,
    loadExistingSeats,
    generateFerryTemplate,
    isInitialized,
    userHasModified,
    rows.length,
    vesselId,
    lastVesselId,
    hasLoadedInitialData,
  ]);

  const generateSeatsForRow = useCallback(
    (row: FlexibleRow): Seat[] => {
      const seats: Seat[] = [];

      for (let i = 1; i <= row.seatCount; i++) {
        const seatNumber = `${row.rowName}${i}`;
        // A seat is marked as aisle seat if there's an aisle AFTER this position (left side of aisle)
        const isNextToAisle = row.aisles.includes(i);

        seats.push({
          id: `${row.id}_seat_${i}`,
          seat_number: seatNumber,
          row_number: row.rowNumber,
          position_x: i,
          position_y: row.rowNumber,
          is_window: i === 1 || i === row.seatCount, // First and last seats are window seats
          is_aisle: isNextToAisle,
          is_row_aisle: row.hasRowAisleAfter || false, // Mark all seats in this row if row has aisle after
          seat_type: row.rowType === 'crew' ? 'crew' : 'standard',
          seat_class: 'economy',
          is_premium: row.rowType === 'bow' || row.rowType === 'stern',
          is_disabled: false,
          price_multiplier:
            row.rowType === 'crew'
              ? 0
              : row.rowType === 'bow' || row.rowType === 'stern'
                ? 1.5
                : 1.0,
          vessel_id: vesselId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return seats;
    },
    [vesselId]
  );

  const addRow = useCallback(() => {
    setUserHasModified(true);
    const newRowNumber = Math.max(...rows.map(r => r.rowNumber)) + 1;
    const newRowLetter = String.fromCharCode(64 + newRowNumber); // A=1, B=2, etc.
    const newRow: FlexibleRow = {
      id: `row_${Date.now()}`,
      rowNumber: newRowNumber,
      rowName: newRowLetter,
      seatCount: 4,
      seats: [],
      rowType: 'main',
      maxWidth: 8,
      aisles: [2], // Default center aisle
    };

    newRow.seats = generateSeatsForRow(newRow);
    setRows(prev => {
      const updatedRows = [...prev, newRow];

      // Trigger onChange callback with updated seats
      if (onChange) {
        const allSeats = updatedRows.flatMap(row => row.seats);
        onChange(allSeats);
      }

      return updatedRows;
    });
  }, [rows, generateSeatsForRow, onChange]);

  const removeRow = useCallback(
    (rowId: string) => {
      setUserHasModified(true);
      Alert.alert(
        'Remove Row',
        'Are you sure you want to remove this row and all its seats?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setRows(prev => {
                const updatedRows = prev.filter(r => r.id !== rowId);

                // Trigger onChange callback with updated seats
                if (onChange) {
                  const allSeats = updatedRows.flatMap(row => row.seats);
                  onChange(allSeats);
                }

                return updatedRows;
              });
            },
          },
        ]
      );
    },
    [onChange]
  );

  const updateRowSeatCount = useCallback(
    (rowId: string, newCount: number) => {
      setUserHasModified(true);
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === rowId) {
            const updatedRow = {
              ...row,
              seatCount: Math.max(1, Math.min(newCount, 12)),
            };
            updatedRow.seats = generateSeatsForRow(updatedRow);
            return updatedRow;
          }
          return row;
        });

        // Trigger onChange callback with updated seats
        if (onChange) {
          const allSeats = updatedRows.flatMap(row => row.seats);
          onChange(allSeats);
        }

        return updatedRows;
      });
    },
    [generateSeatsForRow, onChange]
  );

  const updateRowName = useCallback(
    (rowId: string, newName: string) => {
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === rowId) {
            const updatedRow = { ...row, rowName: newName };
            updatedRow.seats = generateSeatsForRow(updatedRow);
            return updatedRow;
          }
          return row;
        });

        // Trigger onChange callback with updated seats
        if (onChange) {
          const allSeats = updatedRows.flatMap(row => row.seats);
          onChange(allSeats);
        }

        return updatedRows;
      });
    },
    [generateSeatsForRow, onChange]
  );

  const addAisleToRow = useCallback(
    (rowId: string, afterSeat: number) => {
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === rowId) {
            const updatedAisles = [...row.aisles, afterSeat]
              .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
              .sort((a, b) => a - b); // Sort ascending
            const updatedRow = { ...row, aisles: updatedAisles };
            updatedRow.seats = generateSeatsForRow(updatedRow);
            return updatedRow;
          }
          return row;
        });

        // Trigger onChange callback with updated seats
        if (onChange) {
          const allSeats = updatedRows.flatMap(row => row.seats);
          onChange(allSeats);
        }

        return updatedRows;
      });
    },
    [generateSeatsForRow, onChange]
  );

  const removeAisleFromRow = useCallback(
    (rowId: string, aislePosition: number) => {
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === rowId) {
            const updatedAisles = row.aisles.filter(a => a !== aislePosition);
            const updatedRow = { ...row, aisles: updatedAisles };
            updatedRow.seats = generateSeatsForRow(updatedRow);
            return updatedRow;
          }
          return row;
        });

        // Trigger onChange callback with updated seats
        if (onChange) {
          const allSeats = updatedRows.flatMap(row => row.seats);
          onChange(allSeats);
        }

        return updatedRows;
      });
    },
    [generateSeatsForRow, onChange]
  );

  const addRowAisle = useCallback(
    (rowId: string) => {
      setUserHasModified(true);
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === rowId) {
            const updatedRow = { ...row, hasRowAisleAfter: true };
            updatedRow.seats = generateSeatsForRow(updatedRow);
            return updatedRow;
          }
          return row;
        });

        // Trigger onChange callback with updated seats
        if (onChange) {
          const allSeats = updatedRows.flatMap(row => row.seats);
          onChange(allSeats);
        }

        return updatedRows;
      });
    },
    [generateSeatsForRow, onChange]
  );

  const removeRowAisle = useCallback(
    (rowId: string) => {
      setUserHasModified(true);
      setRows(prev => {
        const updatedRows = prev.map(row => {
          if (row.id === rowId) {
            const updatedRow = { ...row, hasRowAisleAfter: false };
            updatedRow.seats = generateSeatsForRow(updatedRow);
            return updatedRow;
          }
          return row;
        });

        // Trigger onChange callback with updated seats
        if (onChange) {
          const allSeats = updatedRows.flatMap(row => row.seats);
          onChange(allSeats);
        }

        return updatedRows;
      });
    },
    [generateSeatsForRow, onChange]
  );

  const getAllSeats = useCallback((): Seat[] => {
    return rows.flatMap(row => row.seats);
  }, [rows]);

  const handleSave = useCallback(async () => {
    try {
      const allSeats = getAllSeats();
      await onSave(allSeats);
    } catch (error) {
      Alert.alert('Error', 'Failed to save seat layout');
    }
  }, [getAllSeats, onSave]);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset Layout',
      'Are you sure you want to reset to the ferry template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setRows([]);
            setIsInitialized(false);
            generateFerryTemplate();
          },
        },
      ]
    );
  }, [generateFerryTemplate]);

  // Seat editing functions
  const handleSeatClick = useCallback((seat: Seat) => {
    setEditingSeat(seat);
    setShowSeatEditModal(true);
  }, []);

  const handleSeatSave = useCallback(
    (updatedSeat: Seat) => {
      setRows(prevRows => {
        const newRows = prevRows.map(row => ({
          ...row,
          seats: row.seats.map(seat =>
            seat.id === updatedSeat.id ? updatedSeat : seat
          ),
        }));

        // Trigger onChange with updated seats
        const allSeats = newRows.flatMap(row => row.seats);
        onChange?.(allSeats);
        setUserHasModified(true);

        return newRows;
      });

      setShowSeatEditModal(false);
      setEditingSeat(null);
    },
    [onChange]
  );

  const handleSeatDelete = useCallback(
    (seatId: string) => {
      Alert.alert('Delete Seat', 'Are you sure you want to delete this seat?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setRows(prevRows => {
              const newRows = prevRows.map(row => ({
                ...row,
                seats: row.seats.filter(seat => seat.id !== seatId),
                seatCount: row.seats.filter(seat => seat.id !== seatId).length,
              }));

              // Trigger onChange with updated seats
              const allSeats = newRows.flatMap(row => row.seats);
              onChange?.(allSeats);
              setUserHasModified(true);

              return newRows;
            });

            setShowSeatEditModal(false);
            setEditingSeat(null);
          },
        },
      ]);
    },
    [onChange]
  );

  const handleSeatEditCancel = useCallback(() => {
    setShowSeatEditModal(false);
    setEditingSeat(null);
  }, []);

  const renderRowEditor = (row: FlexibleRow) => {
    const isEditing = editingRow === row.id;

    return (
      <View
        key={row.id}
        style={[styles.rowContainer, getRowStyle(row.rowType)]}
      >
        <View style={styles.rowHeader}>
          <View style={styles.rowInfo}>
            {isEditing ? (
              <TextInput
                style={styles.rowNameInput}
                value={row.rowName}
                onChangeText={text => updateRowName(row.id, text)}
                onBlur={() => setEditingRow(null)}
                autoFocus
              />
            ) : (
              <Pressable onPress={() => setEditingRow(row.id)}>
                <Text style={styles.rowName}>{row.rowName}</Text>
              </Pressable>
            )}
            <Text style={styles.rowType}>{row.rowType.toUpperCase()}</Text>
            {row.aisles.length > 0 && (
              <Text style={styles.aisleInfo}>
                Aisles after: {row.aisles.join(', ')}
              </Text>
            )}
          </View>

          <View style={styles.rowControls}>
            <View style={styles.seatCountControl}>
              <Pressable
                style={styles.countButton}
                onPress={() => updateRowSeatCount(row.id, row.seatCount - 1)}
                disabled={row.seatCount <= 1}
              >
                <Minus
                  size={16}
                  color={
                    row.seatCount <= 1 ? colors.textSecondary : colors.primary
                  }
                />
              </Pressable>

              <Text style={styles.seatCount}>{row.seatCount}</Text>

              <Pressable
                style={styles.countButton}
                onPress={() => updateRowSeatCount(row.id, row.seatCount + 1)}
                disabled={row.seatCount >= 12}
              >
                <Plus
                  size={16}
                  color={
                    row.seatCount >= 12 ? colors.textSecondary : colors.primary
                  }
                />
              </Pressable>
            </View>

            <Pressable
              style={styles.removeButton}
              onPress={() => removeRow(row.id)}
            >
              <Trash2 size={16} color={colors.error} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.seatsContainer, { maxWidth: row.maxWidth * 50 }]}>
          {row.seats.map((seat, index) => {
            const seatPosition = seat.position_x;
            const hasAisleAfter = row.aisles.includes(seatPosition);
            const isLastSeat = index === row.seats.length - 1;

            return (
              <React.Fragment key={seat.id}>
                <Pressable
                  style={[
                    styles.seat,
                    getSeatStyle(seat),
                    selectedSeat === seat.id && styles.selectedSeat,
                  ]}
                  onPress={() => handleSeatClick(seat)}
                  onLongPress={() =>
                    setSelectedSeat(selectedSeat === seat.id ? null : seat.id)
                  }
                >
                  <Text style={styles.seatNumber}>{seat.seat_number}</Text>
                </Pressable>

                {/* Aisle controls between seats (after each seat except the last one) */}
                {!isLastSeat && (
                  <View style={styles.aisleControl}>
                    {hasAisleAfter ? (
                      <Pressable
                        style={styles.aisleRemoveButton}
                        onPress={() => removeAisleFromRow(row.id, seatPosition)}
                      >
                        <Text style={styles.aisleText}>|</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.aisleAddButton}
                        onPress={() => addAisleToRow(row.id, seatPosition)}
                      >
                        <Plus size={14} color={colors.primary} />
                      </Pressable>
                    )}
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>
    );
  };

  const getRowStyle = (rowType: FlexibleRow['rowType']) => {
    switch (rowType) {
      case 'bow':
        return styles.bowRow;
      case 'crew':
        return styles.crewRow;
      case 'stern':
        return styles.sternRow;
      default:
        return styles.mainRow;
    }
  };

  const getSeatStyle = (seat: Seat) => {
    if (seat.seat_type === 'crew') return styles.crewSeat;
    if (seat.is_premium) return styles.premiumSeat;
    if (seat.is_disabled) return styles.disabledSeat;
    return styles.standardSeat;
  };

  const totalSeats = getAllSeats().length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ship size={24} color={colors.primary} />
          <Text style={styles.title}>Ferry Seat Layout</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.seatCounter}>{totalSeats} seats</Text>
        </View>
      </View>

      {/* Ferry Shape Indicator */}
      <View style={styles.ferryIndicator}>
        <Text style={styles.bowLabel}>⬆️ BOW (Front of Ferry)</Text>
        <Text style={styles.ferryNote}>
          Visual indicator only - no seats here
        </Text>
      </View>

      {/* Rows */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, index) => (
          <React.Fragment key={row.id}>
            {renderRowEditor(row)}

            {/* Row Aisle Control - Show between rows (not after the last row) */}
            {index < rows.length - 1 && (
              <View style={styles.rowAisleControl}>
                {row.hasRowAisleAfter ? (
                  <Pressable
                    style={styles.rowAisleRemoveButton}
                    onPress={() => removeRowAisle(row.id)}
                  >
                    <Text style={styles.rowAisleText}>━━━━━━━</Text>
                    <Text style={styles.rowAisleLabel}>Row Aisle</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.rowAisleAddButton}
                    onPress={() => addRowAisle(row.id)}
                  >
                    <Plus size={16} color={colors.primary} />
                    <Text style={styles.rowAisleAddText}>Add Row Aisle</Text>
                  </Pressable>
                )}
              </View>
            )}
          </React.Fragment>
        ))}

        <Pressable style={styles.addRowButton} onPress={addRow}>
          <Plus size={20} color={colors.primary} />
          <Text style={styles.addRowText}>Add Row</Text>
        </Pressable>
      </ScrollView>

      {/* Ferry Shape Indicator */}
      <View style={styles.ferryIndicator}>
        <Text style={styles.sternLabel}>⬇️ STERN (Back of Ferry)</Text>
        <Text style={styles.ferryNote}>
          Visual indicator only - no seats here
        </Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title='Reset'
          onPress={handleReset}
          icon={<RotateCcw size={16} color={colors.primary} />}
          variant='outline'
        />
        <Button
          title='Save Layout'
          onPress={handleSave}
          icon={<Save size={16} color={colors.white} />}
          variant='primary'
          loading={loading}
        />
      </View>
      {/* Seat Edit Modal */}
      <SeatEditModal
        seat={editingSeat}
        visible={showSeatEditModal}
        onSave={handleSeatSave}
        onDelete={handleSeatDelete}
        onCancel={handleSeatEditCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  seatCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  ferryIndicator: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  bowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  sternLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  ferryNote: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  rowContainer: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bowRow: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  crewRow: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
    borderWidth: 1,
  },
  mainRow: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  sternRow: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderWidth: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowNameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
    minWidth: 100,
  },
  rowType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aisleInfo: {
    fontSize: 10,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '500',
  },
  rowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  seatCountControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 4,
  },
  countButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  seatCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: colors.errorLight,
  },
  seatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'center',
  },
  seat: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  standardSeat: {
    backgroundColor: colors.success,
  },
  premiumSeat: {
    backgroundColor: colors.primary,
  },
  crewSeat: {
    backgroundColor: colors.warning,
  },
  disabledSeat: {
    backgroundColor: colors.textSecondary,
  },
  selectedSeat: {
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  seatNumber: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
    marginTop: 8,
  },
  addRowText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  // Row Aisle Styles
  rowAisleControl: {
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 4,
  },
  rowAisleAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primaryLight,
    gap: 6,
  },
  rowAisleAddText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  rowAisleRemoveButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  rowAisleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 2,
  },
  rowAisleLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.warning,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: 12,
  },
  aisleControl: {
    width: 24,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  aisleAddButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  aisleRemoveButton: {
    width: 20,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  aisleText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
