import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { Plus, Minus, Settings, AlertCircle } from "lucide-react-native";

interface SeatLayoutConfig {
  rows: number;
  columns: number;
  aisles: number[];
  rowAisles: number[];
  premium_rows: number[];
  disabled_seats: string[];
  crew_seats: string[];
}

interface SeatLayoutConfigProps {
  config: SeatLayoutConfig;
  onConfigChange: (config: SeatLayoutConfig) => void;
  maxCapacity?: number;
}

export default function SeatLayoutConfig({
  config,
  onConfigChange,
  maxCapacity = 200,
}: SeatLayoutConfigProps) {
  const [editingRows, setEditingRows] = useState(false);
  const [editingColumns, setEditingColumns] = useState(false);
  const [tempRows, setTempRows] = useState(config.rows.toString());
  const [tempColumns, setTempColumns] = useState(config.columns.toString());
  const rowsInputRef = useRef<TextInput>(null);
  const columnsInputRef = useRef<TextInput>(null);
  const updateConfig = (updates: Partial<SeatLayoutConfig>) => {
    // Only update if there are actual changes
    const hasChanges = Object.keys(updates).some((key) => {
      const currentValue = config[key as keyof SeatLayoutConfig];
      const newValue = updates[key as keyof SeatLayoutConfig];

      if (Array.isArray(currentValue) && Array.isArray(newValue)) {
        return JSON.stringify(currentValue) !== JSON.stringify(newValue);
      }
      return currentValue !== newValue;
    });

    if (hasChanges) {
      onConfigChange({ ...config, ...updates });
    }
  };

  const addAisle = () => {
    // Find the middle column if no aisles exist
    if (config.aisles.length === 0) {
      const newAisle = Math.ceil(config.columns / 2);
      updateConfig({
        aisles: [newAisle],
      });
    } else {
      // Add aisle to the right of the last aisle
      const lastAisle = Math.max(...config.aisles);
      if (lastAisle < config.columns) {
        updateConfig({
          aisles: [...config.aisles, lastAisle + 1].sort((a, b) => a - b),
        });
      }
    }
  };

  const removeAisle = (aislePosition: number) => {
    updateConfig({
      aisles: config.aisles.filter((a) => a !== aislePosition),
    });
  };

  const removeRowAisle = (aislePosition: number) => {
    updateConfig({
      rowAisles: config.rowAisles.filter((a) => a !== aislePosition),
    });
  };

  const addAisleBetweenColumns = (afterColumn: number) => {
    const newAislePosition = afterColumn;
    if (
      newAislePosition <= config.columns &&
      !config.aisles.includes(newAislePosition)
    ) {
      updateConfig({
        aisles: [...config.aisles, newAislePosition].sort((a, b) => a - b),
      });
    }
  };

  const addAisleBetweenRows = (afterRow: number) => {
    const newAislePosition = afterRow;
    if (
      newAislePosition <= config.rows &&
      !config.rowAisles.includes(newAislePosition)
    ) {
      updateConfig({
        rowAisles: [...config.rowAisles, newAislePosition].sort(
          (a, b) => a - b
        ),
      });
    }
  };

  const togglePremiumRow = (rowNumber: number) => {
    const isPremium = config.premium_rows.includes(rowNumber);
    updateConfig({
      premium_rows: isPremium
        ? config.premium_rows.filter((r) => r !== rowNumber)
        : [...config.premium_rows, rowNumber].sort((a, b) => a - b),
    });
  };

  const totalSeats = config.rows * config.columns;
  const isOverCapacity = totalSeats > maxCapacity;
  const isUnderCapacity = totalSeats < maxCapacity;

  // Calculate maximum rows and columns based on capacity
  const maxRows = Math.min(50, Math.ceil(maxCapacity / 2)); // Allow up to 50 rows
  const maxColumns = Math.min(20, Math.ceil(maxCapacity / 5)); // Allow up to 20 columns

  // Update temp values when config changes
  React.useEffect(() => {
    setTempRows(config.rows.toString());
    setTempColumns(config.columns.toString());
  }, [config.rows, config.columns]);

  const handleRowsSubmit = () => {
    const newRows = parseInt(tempRows);
    if (!isNaN(newRows) && newRows >= 1 && newRows <= maxRows) {
      updateConfig({ rows: newRows });
    } else {
      setTempRows(config.rows.toString());
    }
    setEditingRows(false);
  };

  const handleColumnsSubmit = () => {
    const newColumns = parseInt(tempColumns);
    if (!isNaN(newColumns) && newColumns >= 2 && newColumns <= maxColumns) {
      updateConfig({ columns: newColumns });
    } else {
      setTempColumns(config.columns.toString());
    }
    setEditingColumns(false);
  };

  const startEditingRows = () => {
    setEditingRows(true);
    setTempRows(config.rows.toString());
    // Auto-focus after a short delay to ensure the input is rendered
    setTimeout(() => {
      rowsInputRef.current?.focus();
    }, 50);
  };

  const startEditingColumns = () => {
    setEditingColumns(true);
    setTempColumns(config.columns.toString());
    // Auto-focus after a short delay to ensure the input is rendered
    setTimeout(() => {
      columnsInputRef.current?.focus();
    }, 50);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Settings size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Layout Configuration</Text>
        </View>

        {/* Capacity Info */}
        <View style={styles.capacityInfo}>
          <Text style={styles.capacityLabel}>
            Vessel Capacity: {maxCapacity} seats
          </Text>
          <Text style={styles.capacitySubtext}>
            Configure rows and columns to match your vessel's seating capacity
          </Text>
        </View>

        {/* Rows and Columns */}
        <View style={styles.configGroup}>
          <Text style={styles.configLabel}>Rows & Columns</Text>

          <View style={styles.numberInput}>
            <Text style={styles.inputLabel}>Rows:</Text>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() =>
                updateConfig({ rows: Math.max(1, config.rows - 1) })
              }
            >
              <Minus size={16} color={colors.primary} />
            </TouchableOpacity>
            {editingRows ? (
              <TextInput
                ref={rowsInputRef}
                style={styles.numberInputField}
                value={tempRows}
                onChangeText={setTempRows}
                onBlur={handleRowsSubmit}
                onSubmitEditing={handleRowsSubmit}
                keyboardType="numeric"
                selectTextOnFocus
                maxLength={3}
              />
            ) : (
              <TouchableOpacity
                style={styles.numberValueContainer}
                onPress={startEditingRows}
              >
                <Text style={styles.numberValue}>{config.rows}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() =>
                updateConfig({ rows: Math.min(maxRows, config.rows + 1) })
              }
            >
              <Plus size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.numberInput}>
            <Text style={styles.inputLabel}>Columns:</Text>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() =>
                updateConfig({ columns: Math.max(2, config.columns - 1) })
              }
            >
              <Minus size={16} color={colors.primary} />
            </TouchableOpacity>
            {editingColumns ? (
              <TextInput
                ref={columnsInputRef}
                style={styles.numberInputField}
                value={tempColumns}
                onChangeText={setTempColumns}
                onBlur={handleColumnsSubmit}
                onSubmitEditing={handleColumnsSubmit}
                keyboardType="numeric"
                selectTextOnFocus
                maxLength={3}
              />
            ) : (
              <TouchableOpacity
                style={styles.numberValueContainer}
                onPress={startEditingColumns}
              >
                <Text style={styles.numberValue}>{config.columns}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() =>
                updateConfig({
                  columns: Math.min(maxColumns, config.columns + 1),
                })
              }
            >
              <Plus size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Total Seats: {totalSeats}</Text>
            {isOverCapacity && (
              <View style={styles.warningContainer}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.warningText}>
                  Exceeds vessel capacity ({maxCapacity})
                </Text>
              </View>
            )}
            {isUnderCapacity && (
              <View style={styles.infoContainer}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={styles.infoText}>
                  Under vessel capacity ({maxCapacity})
                </Text>
              </View>
            )}
            {!isOverCapacity && !isUnderCapacity && (
              <View style={styles.successContainer}>
                <AlertCircle size={16} color={colors.success} />
                <Text style={styles.successText}>
                  Matches vessel capacity perfectly
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Aisles */}
        <View style={styles.configGroup}>
          <Text style={styles.configLabel}>Aisles</Text>
          <Text style={styles.configDescription}>
            Add aisles between columns for better passenger flow
          </Text>

          {/* Add Aisle Between Columns */}
          <View style={styles.addAisleSection}>
            <Text style={styles.addAisleLabel}>Add Aisle Between Columns:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.aisleSelector}>
                {Array.from(
                  { length: config.columns - 1 },
                  (_, i) => i + 1
                ).map((col) => {
                  const nextCol = col + 1;
                  const isAisle = config.aisles.includes(col);
                  return (
                    <TouchableOpacity
                      key={col}
                      style={[
                        styles.aisleButton,
                        isAisle && styles.aisleButtonActive,
                      ]}
                      onPress={() => {
                        if (isAisle) {
                          removeAisle(col);
                        } else {
                          addAisleBetweenColumns(col);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.aisleButtonText,
                          isAisle && styles.aisleButtonTextActive,
                        ]}
                      >
                        {col} → {nextCol}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
          <View style={styles.addAisleSection}>
            <Text style={styles.addAisleLabel}>Add Aisle Between Rows:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.aisleSelector}>
                {Array.from({ length: config.rows - 1 }, (_, i) => i + 1).map(
                  (row) => {
                    const nextRow = row + 1;
                    const isAisle = config.rowAisles.includes(row);
                    return (
                      <TouchableOpacity
                        key={row}
                        style={[
                          styles.aisleButton,
                          isAisle && styles.aisleButtonActive,
                        ]}
                        onPress={() => {
                          if (isAisle) {
                            removeRowAisle(row);
                          } else {
                            addAisleBetweenRows(row);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.aisleButtonText,
                            isAisle && styles.aisleButtonTextActive,
                          ]}
                        >
                          {row} → {nextRow}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Premium Rows */}
        <View style={styles.configGroup}>
          <Text style={styles.configLabel}>Premium Rows</Text>
          <Text style={styles.configDescription}>
            Select rows to designate as premium seats
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.rowSelector}>
              {Array.from({ length: config.rows }, (_, i) => i + 1).map(
                (row) => {
                  const isPremium = config.premium_rows.includes(row);
                  return (
                    <TouchableOpacity
                      key={row}
                      style={[
                        styles.rowButton,
                        isPremium && styles.premiumRowButton,
                      ]}
                      onPress={() => togglePremiumRow(row)}
                    >
                      <Text
                        style={[
                          styles.rowButtonText,
                          isPremium && styles.premiumRowButtonText,
                        ]}
                      >
                        Row {row}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </ScrollView>
        </View>
        {/* Layout Preview */}
        <View style={styles.configGroup}>
          <Text style={styles.configLabel}>Layout Preview</Text>
          <Text style={styles.configDescription}>
            Visual representation of the seat layout configuration
          </Text>

          {/* Preview Legend */}
          <View style={styles.previewLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.previewSeat]} />
              <Text style={styles.legendText}>Regular Seat</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.previewPremium]} />
              <Text style={styles.legendText}>Premium Seat</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendBox, styles.previewAisleGap]} />
              <Text style={styles.legendText}>Column/Row Aisle</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.previewContainer}
          >
            <View style={styles.preview}>
              {Array.from(
                { length: Math.min(config.rows, 12) },
                (_, rowIndex) => {
                  const rowNumber = rowIndex + 1;
                  const isRowAisle = config.rowAisles.includes(rowNumber);

                  return (
                    <React.Fragment key={rowIndex}>
                      <View style={styles.previewRow}>
                        {Array.from(
                          { length: Math.min(config.columns, 10) },
                          (_, colIndex) => {
                            const colNumber = colIndex + 1;
                            const isAisle = config.aisles.includes(colNumber);
                            const isPremium =
                              config.premium_rows.includes(rowNumber);

                            return (
                              <React.Fragment key={colIndex}>
                                <View
                                  style={[
                                    styles.previewSeat,
                                    isPremium && styles.previewPremium,
                                  ]}
                                />
                                {/* Render column aisle gap after the seat if it's an aisle column */}
                                {isAisle &&
                                  colIndex <
                                    Math.min(config.columns, 10) - 1 && (
                                    <View style={styles.previewAisleGap} />
                                  )}
                              </React.Fragment>
                            );
                          }
                        )}
                      </View>
                      {/* Render row aisle gap after the row if it's an aisle row */}
                      {isRowAisle &&
                        rowIndex < Math.min(config.rows, 12) - 1 && (
                          <View style={styles.previewRowAisleGap} />
                        )}
                    </React.Fragment>
                  );
                }
              )}
              {(config.rows > 12 || config.columns > 10) && (
                <View style={styles.previewInfo}>
                  <Text style={styles.previewNote}>
                    Showing first 12 rows × 10 columns
                  </Text>
                  <Text style={styles.previewNote}>
                    Full layout: {config.rows} rows × {config.columns} columns
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: 8,
  },
  capacityInfo: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  capacityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  capacitySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  configGroup: {
    marginBottom: 24,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  configDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  numberInput: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    width: 80,
  },
  numberButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
  },
  numberValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    minWidth: 30,
    textAlign: "center",
  },
  numberValueContainer: {
    minWidth: 30,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  numberInputField: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    minWidth: 30,
    height: 40,
    textAlign: "center",
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginHorizontal: 8,
    paddingHorizontal: 8,
  },
  summary: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "500",
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: "500",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  successText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  currentAisles: {
    marginBottom: 16,
  },
  currentAislesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  aisleList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  aisleItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  aisleItemText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
    marginRight: 4,
  },
  removeAisleButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  noAislesText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  addAisleSection: {
    marginBottom: 12,
  },
  addAisleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  aisleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    paddingRight: 16,
    overflow: "hidden", // Prevent content from overflowing
  },
  aisleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    minWidth: 60, // Ensure minimum width
  },
  aisleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  aisleButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
  },
  aisleButtonTextActive: {
    color: colors.white,
  },
  addAisleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  addAisleButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
  },
  rowSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingRight: 16,
    overflow: "hidden", // Prevent content from overflowing
  },
  rowButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60, // Ensure minimum width
  },
  premiumRowButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rowButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
  },
  premiumRowButtonText: {
    color: colors.white,
  },
  aisleRowButton: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  aisleRowButtonText: {
    color: colors.white,
  },
  preview: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 16,
    minWidth: 330,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 4,
    alignItems: "center",
  },
  previewSeat: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.success,
    marginHorizontal: 1,
  },
  previewAisle: {
    backgroundColor: colors.border,
    width: 16,
  },
  previewPremium: {
    backgroundColor: colors.primary,
  },
  previewRowAisle: {
    backgroundColor: colors.warning,
    width: 16,
  },
  previewNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  previewContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  previewInfo: {
    marginTop: 12,
    alignItems: "center",
  },
  previewAisleGap: {
    width: 8,
    height: 16,
    backgroundColor: colors.warningLight,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  previewRowAisleGap: {
    height: 8,
    backgroundColor: "transparent",
    marginVertical: 2,
    borderRadius: 2,
    alignSelf: "stretch",
    width: "100%",
  },
  previewAisleText: {
    fontSize: 8,
    color: colors.warning,
    fontWeight: "600",
  },
  previewLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendBoxRowAisle: {
    width: 20,
    height: 4,
    borderRadius: 2,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.warningLight,
    borderStyle: "dashed",
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
});
