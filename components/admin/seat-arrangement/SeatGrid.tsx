import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminManagement } from '@/types';
import {
    User,
    Crown,
    Anchor,
    UserCheck,
    Plus,
    Minus,
} from 'lucide-react-native';

type Seat = AdminManagement.Seat;
type SeatCell = { seat: Seat | null; position: { row: number; col: number } };

interface SeatGridProps {
    seatGrid: SeatCell[][];
    selectedSeats: string[];
    onSeatPress: (row: number, col: number) => void;
    showSeatNumbers?: boolean;
    showSeatTypes?: boolean;
    disabled?: boolean;
    mode?: 'view' | 'edit' | 'arrange';
    // Aisle management props
    aisles?: number[];
    rowAisles?: number[];
    onAddAisle?: (afterColumn: number) => void;
    onRemoveAisle?: (aislePosition: number) => void;
    onAddRowAisle?: (afterRow: number) => void;
    onRemoveRowAisle?: (aislePosition: number) => void;
}

export default function SeatGrid({
    seatGrid,
    selectedSeats,
    onSeatPress,
    showSeatNumbers = true,
    showSeatTypes = true,
    disabled = false,
    mode = 'view',
    aisles = [],
    rowAisles = [],
    onAddAisle,
    onRemoveAisle,
    onAddRowAisle,
    onRemoveRowAisle,
}: SeatGridProps) {
    const getSeatColor = (seat: Seat): string => {
        if (seat.is_disabled) return colors.danger;
        if (seat.seat_type === 'crew') return colors.warning;
        if (seat.is_premium) return colors.primary;
        return colors.success;
    };

    const getSeatIcon = (seat: Seat) => {
        if (seat.seat_type === 'crew') return Anchor;
        if (seat.is_premium) return Crown;
        if (seat.is_disabled) return UserCheck;
        return User;
    };

    const renderSeat = (cell: SeatCell) => {
        const { seat, position } = cell;
        const isSelected = seat && selectedSeats.includes(seat.id);

        if (!seat) {
            // Render empty space
            return (
                <TouchableOpacity
                    key={`empty_${position.row}_${position.col}`}
                    style={[
                        styles.emptySeat,
                        mode === 'edit' && styles.emptySeatEditable,
                    ]}
                    onPress={() => !disabled && mode === 'edit' && onSeatPress(position.row, position.col)}
                    disabled={disabled || mode !== 'edit'}
                    activeOpacity={0.7}
                >
                    <Plus size={16} color={colors.textSecondary} />
                </TouchableOpacity>
            );
        }

        const Icon = getSeatIcon(seat);
        const seatColor = getSeatColor(seat);

        return (
            <TouchableOpacity
                key={seat.id}
                style={[
                    styles.seat,
                    { backgroundColor: seatColor },
                    isSelected && styles.selectedSeat,
                    seat.is_disabled && styles.disabledSeat,
                ]}
                onPress={() => !disabled && onSeatPress(position.row, position.col)}
                disabled={disabled}
                activeOpacity={0.7}
            >
                {showSeatTypes && (
                    <Icon size={12} color={colors.white} style={styles.seatIcon} />
                )}
                {showSeatNumbers && (
                    <Text style={styles.seatNumber}>{seat.seat_number}</Text>
                )}
                {seat.is_window && <View style={styles.windowIndicator} />}
                {seat.is_aisle && <View style={styles.aisleIndicator} />}
            </TouchableOpacity>
        );
    };

    const renderAisleControl = (afterColumn: number) => {
        const aislePosition = afterColumn + 1;
        const hasAisle = aisles.includes(aislePosition);

        return (
            <View key={`aisle_${afterColumn}`} style={styles.aisleControl}>
                <View style={styles.aisleControlContent}>
                    <Text style={styles.aisleLabel}>Col {afterColumn}</Text>
                    <TouchableOpacity
                        style={[
                            styles.aisleButton,
                            hasAisle && styles.aisleButtonActive
                        ]}
                        onPress={() => {
                            if (hasAisle && onRemoveAisle) {
                                onRemoveAisle(aislePosition);
                            } else if (!hasAisle && onAddAisle) {
                                onAddAisle(afterColumn);
                            }
                        }}
                        disabled={disabled}
                    >
                        {hasAisle ? (
                            <Minus size={12} color={colors.white} />
                        ) : (
                            <Plus size={12} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.aisleLabel}>Col {afterColumn + 1}</Text>
                </View>
                {hasAisle && <View style={styles.aisleVisual} />}
            </View>
        );
    };

    const renderRowAisleControl = (afterRow: number) => {
        const aislePosition = afterRow + 1;
        const hasAisle = rowAisles.includes(aislePosition);

        return (
            <View key={`row_aisle_${afterRow}`} style={styles.rowAisleControl}>
                <View style={styles.rowAisleControlContent}>
                    <Text style={styles.rowAisleLabel}>Row {afterRow}</Text>
                    <TouchableOpacity
                        style={[
                            styles.rowAisleButton,
                            hasAisle && styles.rowAisleButtonActive
                        ]}
                        onPress={() => {
                            if (hasAisle && onRemoveRowAisle) {
                                onRemoveRowAisle(aislePosition);
                            } else if (!hasAisle && onAddRowAisle) {
                                onAddRowAisle(afterRow);
                            }
                        }}
                        disabled={disabled}
                    >
                        {hasAisle ? (
                            <Minus size={12} color={colors.white} />
                        ) : (
                            <Plus size={12} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.rowAisleLabel}>Row {afterRow + 1}</Text>
                </View>
                {hasAisle && <View style={styles.rowAisleVisual} />}
            </View>
        );
    };

    const renderColumnHeaders = () => {
        if (seatGrid.length === 0) return null;

        return (
            <View style={styles.headerRow}>
                <View style={styles.rowLabel} />
                {seatGrid[0].map((_, colIndex) => (
                    <React.Fragment key={`header_${colIndex}`}>
                        <View style={styles.columnHeader}>
                            <Text style={styles.columnNumber}>{colIndex + 1}</Text>
                        </View>
                        {colIndex < seatGrid[0].length - 1 && renderAisleControl(colIndex)}
                    </React.Fragment>
                ))}
            </View>
        );
    };

    const renderRow = (rowIndex: number, rowCells: SeatCell[]) => {
        return (
            <React.Fragment key={`row_${rowIndex}`}>
                <View style={styles.row}>
                    <View style={styles.rowLabel}>
                        <Text style={styles.rowNumber}>{rowIndex + 1}</Text>
                    </View>
                    {rowCells.map((cell, colIndex) => (
                        <React.Fragment key={`cell_${rowIndex}_${colIndex}`}>
                            {renderSeat(cell)}
                            {colIndex < rowCells.length - 1 && renderAisleControl(colIndex)}
                        </React.Fragment>
                    ))}
                </View>
                {rowIndex < seatGrid.length - 1 && renderRowAisleControl(rowIndex)}
            </React.Fragment>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                <View style={styles.gridContainer}>
                    {renderColumnHeaders()}
                    {seatGrid.map((row, rowIndex) => renderRow(rowIndex, row))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    gridContainer: {
        minWidth: '100%',
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    rowLabel: {
        width: 40,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    columnHeader: {
        width: 40,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
    },
    columnNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 8,
        alignItems: 'center',
    },
    rowNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    seat: {
        width: 40,
        height: 40,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
        position: 'relative',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
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
    disabledSeat: {
        opacity: 0.5,
    },
    seatIcon: {
        position: 'absolute',
        top: 2,
        right: 2,
    },
    seatNumber: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.white,
        textAlign: 'center',
    },
    windowIndicator: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.white,
    },
    aisleIndicator: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.white,
    },
    emptySeat: {
        width: 40,
        height: 40,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
        backgroundColor: colors.backgroundSecondary,
    },
    emptySeatEditable: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight,
    },
    // Aisle control styles
    aisleControl: {
        width: 60,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    aisleControlContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    aisleLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    aisleButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aisleButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    aisleVisual: {
        width: 2,
        height: 40,
        backgroundColor: colors.primary,
        marginTop: 4,
        borderRadius: 1,
    },
    // Row aisle control styles
    rowAisleControl: {
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    rowAisleControlContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    rowAisleLabel: {
        fontSize: 10,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    rowAisleButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rowAisleButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    rowAisleVisual: {
        width: '100%',
        height: 2,
        backgroundColor: colors.primary,
        marginTop: 4,
        borderRadius: 1,
    },
}); 