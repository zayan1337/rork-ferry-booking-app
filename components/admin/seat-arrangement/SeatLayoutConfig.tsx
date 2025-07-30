import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Plus, Minus, Settings, AlertCircle } from 'lucide-react-native';

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
    const updateConfig = (updates: Partial<SeatLayoutConfig>) => {
        onConfigChange({ ...config, ...updates });
    };

    const addAisle = () => {
        // Find the middle column if no aisles exist
        if (config.aisles.length === 0) {
            const newAisle = Math.ceil(config.columns / 2);
            updateConfig({
                aisles: [newAisle]
            });
        } else {
            // Add aisle to the right of the last aisle
            const lastAisle = Math.max(...config.aisles);
            if (lastAisle < config.columns) {
                updateConfig({
                    aisles: [...config.aisles, lastAisle + 1].sort((a, b) => a - b)
                });
            }
        }
    };

    const removeAisle = (aislePosition: number) => {
        updateConfig({
            aisles: config.aisles.filter(a => a !== aislePosition)
        });
    };

    const addAisleBetweenColumns = (afterColumn: number) => {
        const newAislePosition = afterColumn + 1;
        if (newAislePosition <= config.columns && !config.aisles.includes(newAislePosition)) {
            updateConfig({
                aisles: [...config.aisles, newAislePosition].sort((a, b) => a - b)
            });
        }
    };

    const togglePremiumRow = (rowNumber: number) => {
        const isPremium = config.premium_rows.includes(rowNumber);
        updateConfig({
            premium_rows: isPremium
                ? config.premium_rows.filter(r => r !== rowNumber)
                : [...config.premium_rows, rowNumber].sort((a, b) => a - b)
        });
    };

    const totalSeats = config.rows * config.columns;
    const isOverCapacity = totalSeats > maxCapacity;
    const isUnderCapacity = totalSeats < maxCapacity;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Settings size={20} color={colors.primary} />
                    <Text style={styles.sectionTitle}>Layout Configuration</Text>
                </View>

                {/* Rows and Columns */}
                <View style={styles.configGroup}>
                    <Text style={styles.configLabel}>Rows & Columns</Text>

                    <View style={styles.numberInput}>
                        <Text style={styles.inputLabel}>Rows:</Text>
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={() => updateConfig({ rows: Math.max(1, config.rows - 1) })}
                        >
                            <Minus size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.numberValue}>{config.rows}</Text>
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={() => updateConfig({ rows: Math.min(20, config.rows + 1) })}
                        >
                            <Plus size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.numberInput}>
                        <Text style={styles.inputLabel}>Columns:</Text>
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={() => updateConfig({ columns: Math.max(2, config.columns - 1) })}
                        >
                            <Minus size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.numberValue}>{config.columns}</Text>
                        <TouchableOpacity
                            style={styles.numberButton}
                            onPress={() => updateConfig({ columns: Math.min(10, config.columns + 1) })}
                        >
                            <Plus size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summary}>
                        <Text style={styles.summaryText}>
                            Total Seats: {totalSeats}
                        </Text>
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
                    </View>
                </View>

                {/* Aisles */}
                <View style={styles.configGroup}>
                    <Text style={styles.configLabel}>Aisles</Text>
                    <Text style={styles.configDescription}>
                        Add aisles between columns for better passenger flow
                    </Text>

                    {/* Current Aisles */}
                    <View style={styles.currentAisles}>
                        <Text style={styles.currentAislesLabel}>Current Aisles:</Text>
                        {config.aisles.length > 0 ? (
                            <View style={styles.aisleList}>
                                {config.aisles.map(aisle => (
                                    <View key={aisle} style={styles.aisleItem}>
                                        <Text style={styles.aisleItemText}>Column {aisle}</Text>
                                        <TouchableOpacity
                                            style={styles.removeAisleButton}
                                            onPress={() => removeAisle(aisle)}
                                        >
                                            <Minus size={12} color={colors.danger} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.noAislesText}>No aisles configured</Text>
                        )}
                    </View>

                    {/* Add Aisle Between Columns */}
                    <View style={styles.addAisleSection}>
                        <Text style={styles.addAisleLabel}>Add Aisle Between Columns:</Text>
                        <View style={styles.aisleSelector}>
                            {Array.from({ length: config.columns - 1 }, (_, i) => i + 1).map(col => {
                                const nextCol = col + 1;
                                const isAisle = config.aisles.includes(nextCol);
                                return (
                                    <TouchableOpacity
                                        key={col}
                                        style={[
                                            styles.aisleButton,
                                            isAisle && styles.aisleButtonActive
                                        ]}
                                        onPress={() => {
                                            if (isAisle) {
                                                removeAisle(nextCol);
                                            } else {
                                                addAisleBetweenColumns(col);
                                            }
                                        }}
                                    >
                                        <Text style={[
                                            styles.aisleButtonText,
                                            isAisle && styles.aisleButtonTextActive
                                        ]}>
                                            {col} → {nextCol}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.addAisleButton}
                        onPress={addAisle}
                    >
                        <Plus size={16} color={colors.primary} />
                        <Text style={styles.addAisleButtonText}>Auto Add Aisle</Text>
                    </TouchableOpacity>
                </View>

                {/* Premium Rows */}
                <View style={styles.configGroup}>
                    <Text style={styles.configLabel}>Premium Rows</Text>
                    <Text style={styles.configDescription}>
                        Select rows to designate as premium seats
                    </Text>

                    <View style={styles.rowSelector}>
                        {Array.from({ length: config.rows }, (_, i) => i + 1).map(row => {
                            const isPremium = config.premium_rows.includes(row);
                            return (
                                <TouchableOpacity
                                    key={row}
                                    style={[
                                        styles.rowButton,
                                        isPremium && styles.premiumRowButton
                                    ]}
                                    onPress={() => togglePremiumRow(row)}
                                >
                                    <Text style={[
                                        styles.rowButtonText,
                                        isPremium && styles.premiumRowButtonText
                                    ]}>
                                        Row {row}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Layout Preview */}
                <View style={styles.configGroup}>
                    <Text style={styles.configLabel}>Layout Preview</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.preview}>
                            {Array.from({ length: config.rows }, (_, rowIndex) => (
                                <View key={rowIndex} style={styles.previewRow}>
                                    {Array.from({ length: config.columns }, (_, colIndex) => {
                                        const colNumber = colIndex + 1;
                                        const rowNumber = rowIndex + 1;
                                        const isAisle = config.aisles.includes(colNumber);
                                        const isPremium = config.premium_rows.includes(rowNumber);

                                        return (
                                            <View
                                                key={colIndex}
                                                style={[
                                                    styles.previewSeat,
                                                    isAisle && styles.previewAisle,
                                                    isPremium && styles.previewPremium
                                                ]}
                                            />
                                        );
                                    })}
                                </View>
                            ))}
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
        padding: 16,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginLeft: 8,
    },
    configGroup: {
        marginBottom: 24,
    },
    configLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    configDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    numberInput: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 14,
        color: colors.text,
        width: 80,
    },
    numberButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 8,
    },
    numberValue: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        minWidth: 30,
        textAlign: 'center',
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
        fontWeight: '500',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    warningText: {
        fontSize: 12,
        color: colors.danger,
        fontWeight: '500',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    infoText: {
        fontSize: 12,
        color: colors.warning,
        fontWeight: '500',
    },
    currentAisles: {
        marginBottom: 16,
    },
    currentAislesLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    aisleList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    aisleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    aisleItemText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
        marginRight: 4,
    },
    removeAisleButton: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.danger + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    noAislesText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    addAisleSection: {
        marginBottom: 12,
    },
    addAisleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    aisleSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    aisleButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: colors.border,
    },
    aisleButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    aisleButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
    },
    aisleButtonTextActive: {
        color: colors.white,
    },
    addAisleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
        fontWeight: '500',
    },
    rowSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    rowButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    premiumRowButton: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    rowButtonText: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '500',
    },
    premiumRowButtonText: {
        color: colors.white,
    },
    preview: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        padding: 16,
        minWidth: 300,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 4,
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
}); 