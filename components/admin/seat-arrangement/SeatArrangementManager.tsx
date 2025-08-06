import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminManagement } from '@/types';
import Button from '@/components/admin/Button';
import SeatGrid from './SeatGrid';
import SeatLayoutConfig from './SeatLayoutConfig';
import SeatEditModal from './SeatEditModal';
import {
    generateFerrySeatLayout,
    generateSeatsForFloor,
    calculateOptimalLayout,
    validateFerryLayout,
    calculateOptimalRowColumnRatio,
} from '@/utils/admin/vesselUtils';
import {
    Grid3X3,
    Settings,
    Save,
    RotateCcw,
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Layers,
    Ship,
    Users,
    Zap,
    Minus,
    AlertCircle,
    Crown,
} from 'lucide-react-native';

type Seat = AdminManagement.Seat;
type SeatLayout = AdminManagement.SeatLayout;
type SeatCell = { seat: Seat | null; position: { row: number; col: number } };

interface SeatArrangementManagerProps {
    vesselId: string;
    initialLayout?: SeatLayout;
    initialSeats?: Seat[];
    seatingCapacity?: number;
    vesselType?: string;
    onSave: (layout: SeatLayout, seats: Seat[]) => Promise<void>;
    onChange?: (layout: SeatLayout, seats: Seat[]) => void;
    onCancel?: () => void;
    loading?: boolean;
}

export default function SeatArrangementManager({
    vesselId,
    initialLayout,
    initialSeats = [],
    seatingCapacity = 0,
    vesselType = 'passenger',
    onSave,
    onChange,
    onCancel,
    loading = false,
}: SeatArrangementManagerProps) {
    // Single floor layout configuration
    const [layoutConfig, setLayoutConfig] = useState({
        rows: 0,
        columns: 0,
        aisles: [] as number[],
        rowAisles: [] as number[],
        premium_rows: [] as number[],
        disabled_seats: [] as string[],
        crew_seats: [] as string[],
    });

    // 2D grid representation: grid[row][col] = { seat: Seat | null, position: { row, col } }
    const [seatGrid, setSeatGrid] = useState<SeatCell[][]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [mode, setMode] = useState<'view' | 'edit' | 'arrange'>('view');
    const [isInitialized, setIsInitialized] = useState(false);

    // Add ref to track last layout data to prevent unnecessary onChange calls
    const lastLayoutDataRef = useRef<string>('');
    const lastSeatsDataRef = useRef<string>('');

    // Generate grid from layout config
    const generateGrid = useCallback((config: typeof layoutConfig) => {
        console.log('Generating grid with config:', config);
        const newGrid: SeatCell[][] = [];

        for (let row = 1; row <= config.rows; row++) {
            const newRow: SeatCell[] = [];
            for (let col = 1; col <= config.columns; col++) {
                // Check if there's an existing seat at this position
                const existingSeat = initialSeats.find(seat =>
                    seat.row_number === row && seat.position_x === col
                );

                newRow.push({
                    seat: existingSeat || null,
                    position: { row, col }
                });
            }
            newGrid.push(newRow);
        }

        console.log('Generated grid dimensions:', newGrid.length, 'x', newGrid[0]?.length || 0);
        setSeatGrid(newGrid);
    }, [initialSeats]);

    // Generate default layout
    const generateDefaultLayout = useCallback(() => {
        if (seatingCapacity <= 0) {
            const newConfig = {
                rows: 1,
                columns: 1,
                aisles: [],
                rowAisles: [],
                premium_rows: [],
                disabled_seats: [],
                crew_seats: [],
            };
            setLayoutConfig(newConfig);
            generateGrid(newConfig);
            setIsInitialized(true);
            return;
        }

        // Use the new optimal layout calculation
        const { rows, columns } = calculateOptimalRowColumnRatio(seatingCapacity);
        const aislePosition = Math.ceil(columns / 2);
        const aisles = columns > 4 ? [aislePosition] : [];

        // Determine premium rows based on vessel type
        let premiumRows: number[] = [];
        if (vesselType === 'luxury') {
            premiumRows = [1, 2, 3]; // First 3 rows for luxury
        } else if (vesselType === 'mixed') {
            premiumRows = [1, 2]; // First 2 rows for mixed
        } else {
            premiumRows = [1]; // First row for standard/economy
        }

        const newConfig = {
            rows: Math.min(Math.max(rows, 1), 50), // Limit to 50 rows
            columns: Math.min(Math.max(columns, 1), 20), // Limit to 20 columns
            aisles,
            rowAisles: [], // Not supported in current layout data
            premium_rows: premiumRows,
            disabled_seats: [],
            crew_seats: [],
        };

        setLayoutConfig(newConfig);
        generateGrid(newConfig);
        setIsInitialized(true);
    }, [seatingCapacity, vesselType, generateGrid, calculateOptimalRowColumnRatio]);

    // Initialize layout when capacity changes or when initial data is available
    useEffect(() => {
        if (seatingCapacity > 0 && !isInitialized) {
            console.log('Initializing layout:', {
                hasInitialLayout: !!initialLayout,
                hasInitialSeats: initialSeats.length > 0,
                seatingCapacity,
                vesselType
            });

            // If we have an existing layout, use it
            if (initialLayout && initialLayout.layout_data) {
                const layoutData = initialLayout.layout_data;
                const existingConfig = {
                    rows: layoutData.rows || 0,
                    columns: layoutData.columns || 0,
                    aisles: layoutData.aisles || [],
                    rowAisles: layoutData.rowAisles || [],
                    premium_rows: layoutData.premium_rows || [],
                    disabled_seats: layoutData.disabled_seats || [],
                    crew_seats: layoutData.crew_seats || [],
                };
                console.log('Using existing layout config:', existingConfig);
                setLayoutConfig(existingConfig);
                setIsInitialized(true);
            } else if (initialSeats && initialSeats.length > 0) {
                // Generate layout from existing seats
                const maxRow = Math.max(...initialSeats.map(s => s.row_number));
                const maxCol = Math.max(...initialSeats.map(s => s.position_x));
                const aisles = [...new Set(initialSeats.filter(s => s.is_aisle).map(s => s.position_x))];
                const premiumRows = [...new Set(initialSeats.filter(s => s.is_premium).map(s => s.row_number))];
                const disabledSeats = initialSeats.filter(s => s.is_disabled).map(s => s.seat_number);
                const crewSeats = initialSeats.filter(s => s.seat_type === 'crew').map(s => s.seat_number);

                const existingConfig = {
                    rows: maxRow,
                    columns: maxCol,
                    aisles,
                    rowAisles: [],
                    premium_rows: premiumRows,
                    disabled_seats: disabledSeats,
                    crew_seats: crewSeats,
                };
                console.log('Generated layout config from seats:', existingConfig);
                setLayoutConfig(existingConfig);
                setIsInitialized(true);
            } else {
                // Generate default layout
                console.log('Generating default layout');
                generateDefaultLayout();
            }
        }
    }, [seatingCapacity, vesselType, isInitialized, initialLayout, initialSeats, generateDefaultLayout]);

    // Handle initial seats being loaded after initialization
    useEffect(() => {
        if (isInitialized && initialSeats && initialSeats.length > 0 && !initialLayout) {
            console.log('Re-initializing with initial seats after component was already initialized');
            const maxRow = Math.max(...initialSeats.map(s => s.row_number));
            const maxCol = Math.max(...initialSeats.map(s => s.position_x));
            const aisles = [...new Set(initialSeats.filter(s => s.is_aisle).map(s => s.position_x))];
            const premiumRows = [...new Set(initialSeats.filter(s => s.is_premium).map(s => s.row_number))];
            const disabledSeats = initialSeats.filter(s => s.is_disabled).map(s => s.seat_number);
            const crewSeats = initialSeats.filter(s => s.seat_type === 'crew').map(s => s.seat_number);

            const existingConfig = {
                rows: maxRow,
                columns: maxCol,
                aisles,
                rowAisles: [],
                premium_rows: premiumRows,
                disabled_seats: disabledSeats,
                crew_seats: crewSeats,
            };
            console.log('Re-generated layout config from seats:', existingConfig);
            setLayoutConfig(existingConfig);
        }
    }, [isInitialized, initialSeats, initialLayout]);

    // Generate grid when layout config changes
    useEffect(() => {
        if (layoutConfig.rows > 0 && layoutConfig.columns > 0) {
            generateGrid(layoutConfig);
        }
    }, [layoutConfig, generateGrid]);

    // Auto-populate seats when capacity changes - only run when needed
    useEffect(() => {
        if (seatingCapacity > 0 && seatGrid.length > 0) {
            const currentSeatCount = seatGrid.reduce((count, row) =>
                count + row.filter(cell => cell.seat).length, 0
            );

            if (currentSeatCount < seatingCapacity) {
                console.log('Auto-populating seats:', {
                    currentSeats: currentSeatCount,
                    capacity: seatingCapacity,
                    needed: seatingCapacity - currentSeatCount
                });

                // The memoized grid will handle seat generation automatically
                // No need for manual generation since it's built into the memoized grid
            }
        }
    }, [seatingCapacity, seatGrid.length]);



    // Get all seats from the grid with proper data synchronization
    const getAllSeats = useCallback((): Seat[] => {
        const seats: Seat[] = [];

        for (let row = 0; row < seatGrid.length; row++) {
            for (let col = 0; col < seatGrid[row].length; col++) {
                const cell = seatGrid[row][col];
                if (cell.seat) {
                    // Ensure seat data is properly synchronized with current config
                    const rowNumber = row + 1;
                    const colNumber = col + 1;

                    const isPremium = layoutConfig.premium_rows.includes(rowNumber);
                    const isWindow = colNumber === 1 || colNumber === layoutConfig.columns;
                    const isAisle = layoutConfig.aisles.includes(colNumber);
                    const isRowAisle = layoutConfig.rowAisles.includes(rowNumber);

                    const synchronizedSeat: Seat = {
                        ...cell.seat,
                        row_number: rowNumber,
                        position_x: colNumber,
                        position_y: rowNumber,
                        seat_number: `${String.fromCharCode(64 + colNumber)}${rowNumber}`,
                        is_premium: isPremium,
                        is_window: isWindow,
                        is_aisle: isAisle,
                        seat_type: isPremium ? 'premium' : 'standard',
                        seat_class: isPremium ? 'business' : 'economy',
                        price_multiplier: isPremium ? 1.5 : 1.0,
                        updated_at: new Date().toISOString(),
                    };

                    seats.push(synchronizedSeat);
                }
            }
        }

        console.log('Synchronized seats data:', {
            totalSeats: seats.length,
            premiumSeats: seats.filter(s => s.is_premium).length,
            windowSeats: seats.filter(s => s.is_window).length,
            aisleSeats: seats.filter(s => s.is_aisle).length,
            rowAisleSeats: seats.filter(s => layoutConfig.rowAisles.includes(s.row_number)).length
        });

        return seats;
    }, [seatGrid, layoutConfig]);

    // Handle seat cell press
    const handleSeatPress = useCallback((row: number, col: number) => {
        const cell = seatGrid[row - 1]?.[col - 1];
        if (!cell) return;

        if (mode === 'arrange') {
            if (cell.seat) {
                // Toggle selection of existing seat
                setSelectedSeats(prev =>
                    prev.includes(cell.seat!.id)
                        ? prev.filter(id => id !== cell.seat!.id)
                        : [...prev, cell.seat!.id]
                );
            }
        } else if (mode === 'edit') {
            if (cell.seat) {
                // Edit existing seat
                setEditingSeat(cell.seat);
                setShowEditModal(true);
            } else {
                // Add new seat
                addSeatAtPosition(row, col);
            }
        }
    }, [mode, seatGrid]);

    // Trigger onChange when layout is modified (debounced and optimized)
    const triggerLayoutChange = useCallback(() => {
        if (onChange) {
            // Clear any existing timeout
            if ((global as any).layoutChangeTimeout) {
                clearTimeout((global as any).layoutChangeTimeout);
            }

            // Set a new timeout to debounce the call
            (global as any).layoutChangeTimeout = setTimeout(() => {
                try {
                    const allSeats = getAllSeats();

                    // Create the layout data
                    const layoutData: SeatLayout = {
                        id: initialLayout?.id || '',
                        vessel_id: vesselId,
                        layout_name: `${vesselType.charAt(0).toUpperCase() + vesselType.slice(1)} Layout - ${new Date().toLocaleDateString()}`,
                        layout_data: {
                            rows: layoutConfig.rows,
                            columns: layoutConfig.columns,
                            aisles: layoutConfig.aisles,
                            rowAisles: layoutConfig.rowAisles,
                            premium_rows: layoutConfig.premium_rows,
                            disabled_seats: layoutConfig.disabled_seats,
                            crew_seats: layoutConfig.crew_seats,
                            floors: [{
                                floor_number: 1,
                                floor_name: 'Main Deck',
                                rows: layoutConfig.rows,
                                columns: layoutConfig.columns,
                                aisles: layoutConfig.aisles,
                                rowAisles: layoutConfig.rowAisles,
                                premium_rows: layoutConfig.premium_rows,
                                disabled_seats: layoutConfig.disabled_seats,
                                crew_seats: layoutConfig.crew_seats,
                                is_active: true,
                                seat_count: allSeats.length,
                            }],
                        },
                        is_active: true,
                        created_at: initialLayout?.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };

                    // Create hash of current data to compare with last data
                    const currentLayoutHash = JSON.stringify(layoutData.layout_data);
                    const currentSeatsHash = JSON.stringify(allSeats.map(s => ({ id: s.id, seat_number: s.seat_number, row_number: s.row_number, position_x: s.position_x })));

                    // Only call onChange if data actually changed
                    if (currentLayoutHash !== lastLayoutDataRef.current || currentSeatsHash !== lastSeatsDataRef.current) {
                        lastLayoutDataRef.current = currentLayoutHash;
                        lastSeatsDataRef.current = currentSeatsHash;

                        console.log('Triggering layout change with', allSeats.length, 'seats');
                        onChange(layoutData, allSeats);
                    } else {
                        console.log('Skipping onChange - no meaningful changes detected');
                    }
                } catch (error) {
                    console.warn('Failed to trigger layout change:', error);
                }
            }, 1000); // Increased debounce to 1000ms for better performance
        }
    }, [onChange, layoutConfig, vesselId, vesselType, initialLayout]);

    // Add seat at specific position
    const addSeatAtPosition = useCallback((row: number, col: number) => {
        // Check if we can add more seats based on capacity
        const currentSeatCount = seatGrid.reduce((count, gridRow) =>
            count + gridRow.filter(cell => cell.seat).length, 0
        );

        if (currentSeatCount >= seatingCapacity) {
            Alert.alert(
                'Capacity Limit Reached',
                `Cannot add more seats. Maximum capacity is ${seatingCapacity} seats.`,
                [{ text: 'OK' }]
            );
            return;
        }

        const seatNumber = `${String.fromCharCode(64 + col)}${row}`;
        const isWindow = col === 1 || col === layoutConfig.columns;
        const isAisle = layoutConfig.aisles.includes(col);
        const isPremium = layoutConfig.premium_rows.includes(row);

        const newSeat: Seat = {
            id: `seat_${row}_${col}_${Date.now()}`,
            vessel_id: vesselId,
            layout_id: initialLayout?.id,
            seat_number: seatNumber,
            row_number: row,
            position_x: col,
            position_y: row,
            is_window: isWindow,
            is_aisle: isAisle,
            seat_type: isPremium ? 'premium' : 'standard',
            seat_class: isPremium ? 'business' : 'economy',
            is_disabled: false,
            is_premium: isPremium,
            price_multiplier: isPremium ? 1.5 : 1.0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        setSeatGrid(prev => {
            const newGrid = [...prev];
            newGrid[row - 1][col - 1] = { seat: newSeat, position: { row, col } };
            return newGrid;
        });
    }, [layoutConfig, vesselId, initialLayout?.id, seatGrid, seatingCapacity]);

    // Remove seat at specific position
    const removeSeatAtPosition = useCallback((row: number, col: number) => {
        setSeatGrid(prev => {
            const newGrid = [...prev];
            newGrid[row - 1][col - 1] = { seat: null, position: { row, col } };
            return newGrid;
        });
    }, []);

    // Handle seat edit save
    const handleSeatSave = useCallback((updatedSeat: Seat) => {
        setSeatGrid(prev => {
            const newGrid = [...prev];
            const row = updatedSeat.row_number - 1;
            const col = (updatedSeat.position_x || 1) - 1;
            if (newGrid[row] && newGrid[row][col]) {
                newGrid[row][col] = { seat: updatedSeat, position: { row: updatedSeat.row_number, col: updatedSeat.position_x || 1 } };
            }
            return newGrid;
        });
        setShowEditModal(false);
        setEditingSeat(null);
    }, []);

    // Handle seat deletion
    const handleSeatDelete = useCallback((seatId: string) => {
        setSeatGrid(prev => {
            const newGrid = [...prev];
            for (let row = 0; row < newGrid.length; row++) {
                for (let col = 0; col < newGrid[row].length; col++) {
                    if (newGrid[row][col].seat?.id === seatId) {
                        newGrid[row][col] = { seat: null, position: { row: row + 1, col: col + 1 } };
                        break;
                    }
                }
            }
            return newGrid;
        });
        setShowEditModal(false);
        setEditingSeat(null);
    }, []);

    // Bulk remove selected seats
    const handleRemoveSelectedSeats = useCallback(() => {
        if (selectedSeats.length === 0) {
            Alert.alert('No Seats Selected', 'Please select seats to remove.');
            return;
        }

        Alert.alert(
            'Remove Seats',
            `Are you sure you want to remove ${selectedSeats.length} seat(s)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        setSeatGrid(prev => {
                            const newGrid = [...prev];
                            selectedSeats.forEach(seatId => {
                                for (let row = 0; row < newGrid.length; row++) {
                                    for (let col = 0; col < newGrid[row].length; col++) {
                                        if (newGrid[row][col].seat?.id === seatId) {
                                            newGrid[row][col] = { seat: null, position: { row: row + 1, col: col + 1 } };
                                            break;
                                        }
                                    }
                                }
                            });
                            return newGrid;
                        });
                        setSelectedSeats([]);
                    },
                },
            ]
        );
    }, [selectedSeats.length]);

    // Add aisle between columns
    const addAisleBetweenColumns = (afterColumn: number) => {
        const aislePosition = afterColumn + 1;
        if (!layoutConfig.aisles.includes(aislePosition)) {
            setLayoutConfig(prev => ({
                ...prev,
                aisles: [...prev.aisles, aislePosition].sort((a, b) => a - b)
            }));
        }
    };

    // Remove aisle
    const removeAisle = (aislePosition: number) => {
        setLayoutConfig(prev => ({
            ...prev,
            aisles: prev.aisles.filter(a => a !== aislePosition)
        }));
    };

    const addAisleBetweenRows = (afterRow: number) => {
        const aislePosition = afterRow + 1;
        if (!layoutConfig.rowAisles.includes(aislePosition)) {
            setLayoutConfig(prev => ({
                ...prev,
                rowAisles: [...prev.rowAisles, aislePosition].sort((a, b) => a - b)
            }));
        }
    };

    const removeRowAisle = (aislePosition: number) => {
        setLayoutConfig(prev => ({
            ...prev,
            rowAisles: prev.rowAisles.filter(a => a !== aislePosition)
        }));
    };

    // Add row with auto-adjustment
    const addRow = useCallback(() => {
        setLayoutConfig(prev => ({
            ...prev,
            rows: Math.min(prev.rows + 1, 20)
        }));
    }, []);

    // Remove row with auto-adjustment
    const removeRow = useCallback(() => {
        if (layoutConfig.rows <= 1) return;

        setLayoutConfig(prev => {
            const newRows = prev.rows - 1;
            const newColumns = Math.ceil(seatingCapacity / newRows);

            return {
                ...prev,
                rows: newRows,
                columns: Math.min(Math.max(newColumns, 1), 10)
            };
        });
    }, [layoutConfig.rows, seatingCapacity]);

    // Add column with auto-adjustment
    const addColumn = useCallback(() => {
        setLayoutConfig(prev => ({
            ...prev,
            columns: Math.min(prev.columns + 1, 10)
        }));
    }, []);

    // Remove column with auto-adjustment
    const removeColumn = useCallback(() => {
        if (layoutConfig.columns <= 1) return;

        setLayoutConfig(prev => {
            const newColumns = prev.columns - 1;
            const newRows = Math.ceil(seatingCapacity / newColumns);

            return {
                ...prev,
                columns: newColumns,
                rows: Math.min(Math.max(newRows, 1), 20)
            };
        });
    }, [layoutConfig.columns, seatingCapacity]);

    // Initialize component
    useEffect(() => {
        if (!isInitialized) {
            console.log('Initializing SeatArrangementManager');
            generateDefaultLayout();
        }
    }, [isInitialized, generateDefaultLayout]);

    // Handle save
    const handleSave = useCallback(async () => {
        try {
            const allSeats = getAllSeats();
            const activeSeats = allSeats.filter(s => !s.is_disabled);

            if (activeSeats.length !== seatingCapacity) {
                Alert.alert(
                    'Capacity Mismatch',
                    `You have ${activeSeats.length} active seats but the vessel capacity is ${seatingCapacity}. Do you want to continue?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Continue', onPress: () => saveLayout(allSeats) },
                    ]
                );
            } else {
                saveLayout(allSeats);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save seat layout');
        }
    }, [getAllSeats, seatingCapacity]);

    const saveLayout = async (seats: Seat[]) => {
        const layoutData: SeatLayout = {
            id: initialLayout?.id || '',
            vessel_id: vesselId,
            layout_name: `${vesselType.charAt(0).toUpperCase() + vesselType.slice(1)} Layout - ${new Date().toLocaleDateString()}`,
            layout_data: {
                rows: layoutConfig.rows,
                columns: layoutConfig.columns,
                aisles: layoutConfig.aisles,
                rowAisles: layoutConfig.rowAisles,
                premium_rows: layoutConfig.premium_rows,
                disabled_seats: layoutConfig.disabled_seats,
                crew_seats: layoutConfig.crew_seats,
                floors: [{
                    floor_number: 1,
                    floor_name: 'Main Deck',
                    rows: layoutConfig.rows,
                    columns: layoutConfig.columns,
                    aisles: layoutConfig.aisles,
                    rowAisles: layoutConfig.rowAisles,
                    premium_rows: layoutConfig.premium_rows,
                    disabled_seats: layoutConfig.disabled_seats,
                    crew_seats: layoutConfig.crew_seats,
                    is_active: true,
                    seat_count: seats.length,
                }],
            },
            is_active: true,
            created_at: initialLayout?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        await onSave(layoutData, seats);
    };

    // Handle reset
    const handleReset = useCallback(() => {
        Alert.alert(
            'Reset Layout',
            'Are you sure you want to reset the seat layout? This will discard all changes.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        generateDefaultLayout();
                        setSelectedSeats([]);
                        setMode('view');
                    },
                },
            ]
        );
    }, [generateDefaultLayout]);

    // Get layout statistics
    const getLayoutStats = useCallback(() => {
        const allSeats = getAllSeats();
        const totalSeats = allSeats.length;
        const activeSeats = allSeats.filter(s => !s.is_disabled).length;
        const premiumSeats = allSeats.filter(s => s.is_premium).length;
        const crewSeats = allSeats.filter(s => s.seat_type === 'crew').length;
        const disabledSeats = allSeats.filter(s => s.is_disabled).length;
        const emptySpaces = seatGrid.flat().filter(cell => !cell.seat).length;

        return {
            total: totalSeats,
            active: activeSeats,
            premium: premiumSeats,
            crew: crewSeats,
            disabled: disabledSeats,
            empty: emptySpaces,
            capacity: seatingCapacity,
        };
    }, [getAllSeats, seatGrid, seatingCapacity]);

    const stats = getLayoutStats();

    // Memoize layout data to prevent unnecessary re-renders
    const layoutData = useMemo(() => {
        if (seatGrid.length === 0) return null;

        const allSeats = getAllSeats();
        if (allSeats.length === 0) return null;

        return {
            id: initialLayout?.id || '',
            vessel_id: vesselId,
            layout_name: `Custom ${vesselType.charAt(0).toUpperCase() + vesselType.slice(1)} Layout - ${new Date().toLocaleDateString()}`,
            layout_data: {
                rows: layoutConfig.rows,
                columns: layoutConfig.columns,
                aisles: layoutConfig.aisles,
                rowAisles: layoutConfig.rowAisles,
                premium_rows: layoutConfig.premium_rows,
                disabled_seats: layoutConfig.disabled_seats,
                crew_seats: layoutConfig.crew_seats,
                floors: [{
                    floor_number: 1,
                    floor_name: 'Main Deck',
                    rows: layoutConfig.rows,
                    columns: layoutConfig.columns,
                    aisles: layoutConfig.aisles,
                    rowAisles: layoutConfig.rowAisles,
                    premium_rows: layoutConfig.premium_rows,
                    disabled_seats: layoutConfig.disabled_seats,
                    crew_seats: layoutConfig.crew_seats,
                    is_active: true,
                    seat_count: allSeats.length,
                }],
            },
            is_active: true,
            created_at: initialLayout?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }, [seatGrid, layoutConfig, getAllSeats, vesselId, vesselType, initialLayout]);

    // Debounced onChange notification
    useEffect(() => {
        if (onChange && layoutData) {
            const allSeats = getAllSeats();
            if (allSeats.length > 0) {
                const timeoutId = setTimeout(() => {
                    onChange(layoutData, allSeats);
                }, 200);

                return () => clearTimeout(timeoutId);
            }
        }
    }, [layoutData, onChange, getAllSeats]);

    // Handle layout config changes
    const handleLayoutConfigChange = useCallback((newConfig: typeof layoutConfig) => {
        console.log('Layout config changed:', newConfig);
        setLayoutConfig(newConfig);
        // The grid will be regenerated by the useEffect that watches layoutConfig changes
        // Auto-population will be triggered automatically after grid regeneration
    }, []);

    // Memoize the seat grid to prevent unnecessary re-renders
    const memoizedSeatGrid = useMemo(() => {
        if (!isInitialized || layoutConfig.rows <= 0 || layoutConfig.columns <= 0) {
            return [];
        }

        console.log('Generating memoized grid:', {
            rows: layoutConfig.rows,
            columns: layoutConfig.columns,
            existingSeats: initialSeats.length
        });

        const newGrid: SeatCell[][] = [];
        let seatCounter = 0;

        for (let row = 1; row <= layoutConfig.rows; row++) {
            const newRow: SeatCell[] = [];
            for (let col = 1; col <= layoutConfig.columns; col++) {
                // Check if there's an existing seat at this position
                const existingSeat = initialSeats.find(seat =>
                    seat.row_number === row && seat.position_x === col
                );

                // Apply current config properties to the seat
                let seat = existingSeat || null;
                if (seat) {
                    const isPremium = layoutConfig.premium_rows.includes(row);
                    const isWindow = col === 1 || col === layoutConfig.columns;
                    const isAisle = layoutConfig.aisles.includes(col);
                    const isRowAisle = layoutConfig.rowAisles.includes(row);

                    seat = {
                        ...seat,
                        is_premium: isPremium,
                        is_window: isWindow,
                        is_aisle: isAisle,
                        seat_type: isPremium ? 'premium' : 'standard',
                        seat_class: isPremium ? 'business' : 'economy',
                        price_multiplier: isPremium ? 1.5 : 1.0,
                        updated_at: new Date().toISOString(),
                    };
                } else {
                    // Generate new seat if we haven't exceeded capacity
                    if (seatCounter < seatingCapacity) {
                        const seatNumber = `${String.fromCharCode(64 + col)}${row}`;
                        const isPremium = layoutConfig.premium_rows.includes(row);
                        const isWindow = col === 1 || col === layoutConfig.columns;
                        const isAisle = layoutConfig.aisles.includes(col);
                        const isRowAisle = layoutConfig.rowAisles.includes(row);

                        seat = {
                            id: `seat_${row}_${col}_${Date.now()}`,
                            vessel_id: vesselId,
                            layout_id: initialLayout?.id || '',
                            seat_number: seatNumber,
                            row_number: row,
                            position_x: col,
                            position_y: row,
                            is_window: isWindow,
                            is_aisle: isAisle,
                            seat_type: isPremium ? 'premium' : 'standard',
                            seat_class: isPremium ? 'business' : 'economy',
                            is_disabled: false,
                            is_premium: isPremium,
                            price_multiplier: isPremium ? 1.5 : 1.0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        };
                        seatCounter++;
                    }
                }

                newRow.push({
                    seat,
                    position: { row, col }
                });
            }
            newGrid.push(newRow);
        }

        console.log('Generated grid with', seatCounter, 'seats out of', seatingCapacity, 'capacity');
        return newGrid;
    }, [layoutConfig, isInitialized, initialSeats, seatingCapacity, vesselId, initialLayout?.id]);

    // Update seat grid when memoized grid changes
    useEffect(() => {
        if (memoizedSeatGrid.length > 0) {
            console.log('Updating seat grid with memoized data:', {
                rows: memoizedSeatGrid.length,
                columns: memoizedSeatGrid[0]?.length || 0
            });
            setSeatGrid(memoizedSeatGrid);
        }
    }, [memoizedSeatGrid]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Ship size={24} color={colors.primary} />
                    <Text style={styles.title}>Seat Layout Editor</Text>
                </View>

                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.modeButton, mode === 'view' && styles.modeButtonActive]}
                        onPress={() => setMode('view')}
                    >
                        <Eye size={16} color={mode === 'view' ? colors.white : colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeButton, mode === 'edit' && styles.modeButtonActive]}
                        onPress={() => setMode('edit')}
                    >
                        <Settings size={16} color={mode === 'edit' ? colors.white : colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.modeButton, mode === 'arrange' && styles.modeButtonActive]}
                        onPress={() => setMode('arrange')}
                    >
                        <Grid3X3 size={16} color={mode === 'arrange' ? colors.white : colors.primary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Layout Statistics */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Users size={16} color={colors.primary} />
                    <Text style={styles.statValue}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total Seats</Text>
                </View>
                <View style={styles.statItem}>
                    <Zap size={16} color={colors.success} />
                    <Text style={styles.statValue}>{stats.active}</Text>
                    <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statItem}>
                    <Crown size={16} color={colors.warning} />
                    <Text style={styles.statValue}>{stats.premium}</Text>
                    <Text style={styles.statLabel}>Premium</Text>
                </View>
                <View style={styles.statItem}>
                    <Ship size={16} color={colors.primary} />
                    <Text style={styles.statValue}>{stats.capacity}</Text>
                    <Text style={styles.statLabel}>Capacity</Text>
                </View>
                <View style={styles.statItem}>
                    <Minus size={16} color={colors.textSecondary} />
                    <Text style={styles.statValue}>{stats.empty}</Text>
                    <Text style={styles.statLabel}>Empty</Text>
                </View>
            </View>

            {/* Capacity Warning */}
            {stats.active !== stats.capacity && (
                <View style={styles.warningContainer}>
                    <AlertCircle size={16} color={colors.warning} />
                    <Text style={styles.warningText}>
                        Active seats ({stats.active}) don't match vessel capacity ({stats.capacity})
                    </Text>
                </View>
            )}

            {/* Mode Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                    {mode === 'view' && 'View mode: Browse seat layout'}
                    {mode === 'edit' && 'Edit mode: Tap seats to edit, tap empty spaces to add seats'}
                    {mode === 'arrange' && 'Arrange mode: Select seats for bulk actions'}
                </Text>
            </View>

            {/* Controls Section */}
            <View style={styles.controlsSection}>
                {/* Row and Column Controls */}
                {/* <View style={styles.controlRow}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Rows:</Text>
                        <View style={styles.numberInput}>
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={removeRow}
                                disabled={layoutConfig.rows <= 1}
                            >
                                <Minus size={16} color={layoutConfig.rows <= 1 ? colors.textSecondary : colors.primary} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.numberInputField}
                                value={layoutConfig.rows.toString()}
                                onChangeText={(text) => {
                                    const value = parseInt(text) || 1;
                                    const newRows = Math.max(1, Math.min(20, value));
                                    const newColumns = Math.ceil(seatingCapacity / newRows);

                                    setLayoutConfig(prev => ({
                                        ...prev,
                                        rows: newRows,
                                        columns: Math.min(Math.max(newColumns, 1), 10)
                                    }));
                                }}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={addRow}
                            >
                                <Plus size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Columns:</Text>
                        <View style={styles.numberInput}>
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={removeColumn}
                                disabled={layoutConfig.columns <= 1}
                            >
                                <Minus size={16} color={layoutConfig.columns <= 1 ? colors.textSecondary : colors.primary} />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.numberInputField}
                                value={layoutConfig.columns.toString()}
                                onChangeText={(text) => {
                                    const value = parseInt(text) || 1;
                                    const newColumns = Math.max(1, Math.min(10, value));
                                    const newRows = Math.ceil(seatingCapacity / newColumns);

                                    setLayoutConfig(prev => ({
                                        ...prev,
                                        columns: newColumns,
                                        rows: Math.min(Math.max(newRows, 1), 20)
                                    }));
                                }}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity
                                style={styles.numberButton}
                                onPress={addColumn}
                            >
                                <Plus size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View> */}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <Button
                        title="Auto Generate"
                        onPress={generateDefaultLayout}
                        icon={<Grid3X3 size={16} color={colors.primary} />}
                        variant="outline"
                        size="small"
                    />



                    <Button
                        title="Remove Selected"
                        onPress={handleRemoveSelectedSeats}
                        icon={<Trash2 size={16} color={colors.white} />}
                        variant="danger"
                        size="small"
                        disabled={selectedSeats.length === 0}
                    />

                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setShowConfig(!showConfig)}
                    >
                        <Settings size={16} color={colors.primary} />
                        <Text style={styles.toggleButtonText}>
                            {showConfig ? 'Hide Config' : 'Show Config'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Layout Configuration */}
            {showConfig && (
                <View style={styles.configContainer}>
                    <SeatLayoutConfig
                        config={layoutConfig}
                        onConfigChange={handleLayoutConfigChange}
                        maxCapacity={seatingCapacity}
                    />
                </View>
            )}

            {/* Seat Grid */}
            <View style={styles.gridContainer}>
                <SeatGrid
                    seatGrid={seatGrid}
                    selectedSeats={selectedSeats}
                    onSeatPress={handleSeatPress}
                    showSeatNumbers={true}
                    showSeatTypes={true}
                    disabled={loading}
                    mode={mode}
                    aisles={layoutConfig.aisles}
                    rowAisles={layoutConfig.rowAisles}
                    onAddAisle={addAisleBetweenColumns}
                    onRemoveAisle={removeAisle}
                    onAddRowAisle={addAisleBetweenRows}
                    onRemoveRowAisle={removeRowAisle}
                />
            </View>

            {/* Footer Actions */}
            <View style={styles.footer}>
                <Button
                    title="Reset"
                    onPress={handleReset}
                    icon={<RotateCcw size={16} color={colors.primary} />}
                    variant="outline"
                />
                <Button
                    title="Save Layout"
                    onPress={handleSave}
                    icon={<Save size={16} color={colors.white} />}
                    variant="primary"
                    loading={loading}
                />
            </View>

            {/* Seat Edit Modal */}
            <SeatEditModal
                seat={editingSeat}
                visible={showEditModal}
                onSave={handleSeatSave}
                onDelete={handleSeatDelete}
                onCancel={() => {
                    setShowEditModal(false);
                    setEditingSeat(null);
                }}
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
        padding: 12,
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
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    modeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modeButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        backgroundColor: colors.warningLight,
        borderLeftWidth: 3,
        borderLeftColor: colors.warning,
    },
    warningText: {
        fontSize: 14,
        color: colors.warning,
        fontWeight: '500',
        flex: 1,
    },
    instructions: {
        padding: 16,
        backgroundColor: colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    instructionText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    controls: {
        padding: 16,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 8,
    },
    inputGroup: {
        flex: 1,
        alignItems: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    numberInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    numberButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    numberInputField: {
        flex: 1,
        height: 40,
        paddingHorizontal: 12,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        textAlign: 'center',
        backgroundColor: colors.backgroundSecondary,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    toggleButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    configContainer: {
        marginTop: 16,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gridContainer: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
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
    footerRight: {
        flexDirection: 'row',
        gap: 12,
    },
    controlsSection: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
}); 