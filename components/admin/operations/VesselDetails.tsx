import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Vessel } from '@/types/admin/management';
import { formatCurrency } from '@/utils/currencyUtils';
import Button from '@/components/admin/Button';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import {
    Ship,
    Users,
    Calendar,
    Settings,
    TrendingUp,
    Activity,
    Edit,
    Archive,
    AlertTriangle,
    Anchor,
    Gauge,
    Wrench,
    Fuel,
    BarChart3,
    DollarSign,
    Clock,
    Target,
    Ruler,
    MapPin,
    Phone,
    Mail,
    FileText,
    Shield,
    Award,
    Zap,
    Thermometer,
    Droplets,
    Navigation,
    Compass,
    LifeBuoy,
    Radio,
    Satellite,
    Wifi,
    Battery,
    Signal,
    Eye,
    EyeOff,
    Grid3X3,
    Layout,
    UserCheck,
    Crown,
    Star,
    Info,
} from 'lucide-react-native';

interface Seat {
    id: string;
    seat_number: string;
    row_number: number;
    is_window: boolean;
    is_aisle: boolean;
    seat_type: string;
    is_premium: boolean;
    position_x: number;
    position_y: number;
    is_disabled: boolean;
    seat_class: string;
    price_multiplier: number;
}

interface SeatLayout {
    id: string;
    layout_name: string;
    rows: number;
    columns: number;
    aisles: number[];
    premium_rows: number[];
    disabled_seats: string[];
    crew_seats: string[];
    is_active: boolean;
}

interface VesselWithSeats extends Vessel {
    seats?: Seat[];
    seatLayout?: SeatLayout;
}

interface VesselDetailsProps {
    vessel: VesselWithSeats;
    onEdit?: () => void;
    onArchive?: () => void;
    onViewTrips?: () => void;
    onViewMaintenance?: () => void;
    onViewSeatLayout?: () => void;
    showActions?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function VesselDetails({
    vessel,
    onEdit,
    onArchive,
    onViewTrips,
    onViewMaintenance,
    onViewSeatLayout,
    showActions = true,
}: VesselDetailsProps) {
    const handleArchive = () => {
        if (onArchive) {
            Alert.alert(
                "Archive Vessel",
                `Are you sure you want to archive "${vessel.name}"? This will remove it from active service.`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Archive", style: "destructive", onPress: onArchive },
                ]
            );
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return colors.success;
            case 'inactive':
                return colors.warning;
            case 'maintenance':
                return colors.warning;
            case 'decommissioned':
                return colors.danger;
            default:
                return colors.textSecondary;
        }
    };

    const getUtilizationColor = (utilization: number) => {
        if (utilization >= 80) return colors.success;
        if (utilization >= 60) return colors.warning;
        return colors.danger;
    };

    const getUtilizationRating = (utilization: number) => {
        if (utilization >= 90) return 'Excellent';
        if (utilization >= 70) return 'Good';
        if (utilization >= 50) return 'Average';
        return 'Poor';
    };

    const vesselAge = 0; // year_built not available in this Vessel type
    const vesselTypeLabel = vessel.vessel_type?.charAt(0).toUpperCase() + vessel.vessel_type?.slice(1) || 'Passenger';

    const maintenanceStatus = vessel.next_maintenance_date ? (() => {
        const nextMaintenance = new Date(vessel.next_maintenance_date);
        const now = new Date();
        const daysUntil = Math.ceil((nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return { status: 'overdue', message: `${Math.abs(daysUntil)} days overdue`, color: colors.danger };
        if (daysUntil <= 30) return { status: 'due_soon', message: `Due in ${daysUntil} days`, color: colors.warning };
        return { status: 'up_to_date', message: `Due in ${daysUntil} days`, color: colors.success };
    })() : { status: 'unknown', message: 'Not scheduled', color: colors.textSecondary };

    const stats = [
        {
            title: 'Utilization',
            value: `${vessel.capacity_utilization_30d || 0}%`,
            subtitle: 'Last 30 days',
            icon: <Users size={20} color={getUtilizationColor(vessel.capacity_utilization_30d || 0)} />,
            trend: vessel.capacity_utilization_30d && vessel.capacity_utilization_30d > 70 ? 'up' : 'neutral',
        },
        {
            title: 'Trips',
            value: vessel.total_trips_30d?.toString() || '0',
            subtitle: 'Last 30 days',
            icon: <Activity size={20} color={colors.primary} />,
            trend: vessel.total_trips_30d && vessel.total_trips_30d > 0 ? 'up' : 'neutral',
        },
        {
            title: 'Revenue',
            value: formatCurrency(vessel.total_revenue_30d || 0),
            subtitle: 'Last 30 days',
            icon: <DollarSign size={20} color={colors.success} />,
            trend: vessel.total_revenue_30d && vessel.total_revenue_30d > 0 ? 'up' : 'neutral',
        },
        {
            title: 'Rating',
            value: `${(vessel.average_rating || 0).toFixed(1)}/5`,
            subtitle: 'Average rating',
            icon: <Target size={20} color={colors.primary} />,
            trend: vessel.average_rating && vessel.average_rating > 4 ? 'up' : 'neutral',
        },
    ];

    // Map vessel status to StatusBadge compatible status
    const getCompatibleStatus = (status: string): "confirmed" | "pending" | "cancelled" | "completed" | "paid" | "refunded" | "failed" | "active" | "inactive" | "suspended" | "maintenance" | "scheduled" | "in-progress" => {
        switch (status) {
            case 'active':
                return 'active';
            case 'inactive':
                return 'inactive';
            case 'maintenance':
                return 'maintenance';
            case 'decommissioned':
                return 'inactive';
            default:
                return 'pending';
        }
    };

    const generateSeatLayoutFromDatabase = (seats: Seat[], layout: SeatLayout | null) => {
        if (!seats || seats.length === 0) {
            return (
                <View style={styles.noSeatsContainer}>
                    <Layout size={48} color={colors.textSecondary} />
                    <Text style={styles.noSeatsTitle}>No Seats Generated</Text>
                    <Text style={styles.noSeatsMessage}>
                        This vessel doesn't have any seats configured yet.
                        Please set up the seat layout in the seat arrangement manager.
                    </Text>
                </View>
            );
        }

        if (!layout) {
            // If no layout config, show seats in a simple grid
            return generateSimpleSeatGrid(seats);
        }

        // Create a 2D grid based on layout configuration
        const grid: (Seat | null)[][] = [];

        // Initialize empty grid
        for (let row = 0; row < layout.rows; row++) {
            grid[row] = [];
            for (let col = 0; col < layout.columns; col++) {
                grid[row][col] = null;
            }
        }

        // Place seats in the grid based on their position
        seats.forEach(seat => {
            const row = seat.row_number - 1; // Convert to 0-based index
            const col = seat.position_x - 1; // Convert to 0-based index

            if (row >= 0 && row < layout.rows && col >= 0 && col < layout.columns) {
                grid[row][col] = seat;
            }
        });

        // Generate the visual layout
        const rows: React.ReactElement[] = [];

        for (let rowIndex = 0; rowIndex < layout.rows; rowIndex++) {
            const rowSeats: React.ReactElement[] = [];

            for (let colIndex = 0; colIndex < layout.columns; colIndex++) {
                const seat = grid[rowIndex][colIndex];

                if (seat) {
                    // Render seat
                    rowSeats.push(renderSeat(seat));
                } else {
                    // Render empty space
                    rowSeats.push(
                        <View key={`empty-${rowIndex}-${colIndex}`} style={styles.emptySeat} />
                    );
                }

                // Add aisle space if this column is marked as an aisle
                if (layout.aisles.includes(colIndex + 1) && colIndex < layout.columns - 1) {
                    rowSeats.push(
                        <View key={`aisle-${rowIndex}-${colIndex}`} style={styles.aisleSpace}>
                            <Text style={styles.aisleLabel}>AISLE</Text>
                        </View>
                    );
                }
            }

            rows.push(
                <View key={`row-${rowIndex + 1}`} style={styles.seatRow}>
                    <Text style={styles.rowLabel}> {rowIndex + 1}</Text>
                    {rowSeats}
                </View>
            );
        }

        return rows;
    };

    const generateSimpleSeatGrid = (seats: Seat[]) => {
        // Group seats by row
        const seatsByRow = new Map<number, Seat[]>();
        seats.forEach(seat => {
            if (!seatsByRow.has(seat.row_number)) {
                seatsByRow.set(seat.row_number, []);
            }
            seatsByRow.get(seat.row_number)!.push(seat);
        });

        const rows: React.ReactElement[] = [];

        // Sort rows and create layout
        Array.from(seatsByRow.keys()).sort((a, b) => a - b).forEach(rowNumber => {
            const rowSeats = seatsByRow.get(rowNumber)!;
            // Sort seats by position_x within the row
            rowSeats.sort((a, b) => a.position_x - b.position_x);

            const rowElements: React.ReactElement[] = [];

            rowSeats.forEach(seat => {
                rowElements.push(renderSeat(seat));
            });

            rows.push(
                <View key={`row-${rowNumber}`} style={styles.seatRow}>
                    <Text style={styles.rowLabel}> {rowNumber}</Text>
                    {rowElements}
                </View>
            );
        });

        return rows;
    };

    const renderSeat = (seat: Seat) => {
        const seatColor = getSeatColor(seat);
        const isDisabled = seat.is_disabled || seat.seat_type === 'disabled';

        return (
            <View key={seat.id} style={[
                styles.seatLayoutCell,
                { backgroundColor: seatColor },
                isDisabled && styles.disabledSeat
            ]}>
                <Text style={[
                    styles.seatLayoutNumber,
                    { color: colors.white },
                    isDisabled && styles.disabledSeatText
                ]}>
                    {seat.seat_number}
                </Text>

                {/* Window indicator */}
                {seat.is_window && (
                    <View style={styles.windowIndicator} />
                )}

                {/* Aisle indicator */}
                {seat.is_aisle && (
                    <View style={styles.aisleIndicator} />
                )}

                {/* Premium indicator */}
                {seat.is_premium && (
                    <View style={styles.premiumIndicator} />
                )}

                {/* Disabled indicator */}
                {isDisabled && (
                    <View style={styles.disabledIndicator} />
                )}
            </View>
        );
    };

    const getSeatColor = (seat: Seat) => {
        if (seat.is_disabled || seat.seat_type === 'disabled') return colors.danger;
        if (seat.is_premium) return colors.success;
        if (seat.seat_type === 'crew') return colors.warning;
        if (seat.is_window) return colors.info;
        if (seat.is_aisle) return colors.primary;
        return colors.primary;
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Vessel Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.vesselIcon}>
                        <Ship size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.vesselName}>{vessel.name}</Text>
                        <View style={styles.vesselInfo}>
                            <Anchor size={16} color={colors.textSecondary} />
                            <Text style={styles.vesselDescription}>
                                {vesselTypeLabel} • {vessel.seating_capacity} passengers
                            </Text>
                        </View>
                    </View>
                </View>
                <View style={[
                    styles.statusBadge,
                    vessel.status === 'active' ? styles.statusActive : styles.statusInactive
                ]}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(vessel.status) }
                    ]} />
                    <Text style={[
                        styles.statusText,
                        vessel.status === 'active' ? styles.statusTextActive : styles.statusTextInactive
                    ]}>
                        {vessel.status?.charAt(0).toUpperCase() + vessel.status?.slice(1)}
                    </Text>
                </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
                <View style={styles.statsGrid}>
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={styles.statCardIcon}>
                                <Calendar size={20} color={colors.primary} />
                            </View>
                            <View style={styles.statCardContent}>
                                <Text style={styles.statCardValue}>{vessel.total_trips_30d || 0}</Text>
                                <Text style={styles.statCardLabel}>Total Trips</Text>
                            </View>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.statCardIcon, { backgroundColor: colors.successLight }]}>
                                <Users size={20} color={colors.success} />
                            </View>
                            <View style={styles.statCardContent}>
                                <Text style={styles.statCardValue}>{vessel.total_passengers_30d || 0}</Text>
                                <Text style={styles.statCardLabel}>Total Passengers</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <View style={[styles.statCardIcon, { backgroundColor: colors.warningLight }]}>
                                <TrendingUp size={20} color={colors.warning} />
                            </View>
                            <View style={styles.statCardContent}>
                                <Text style={styles.statCardValue}>{vessel.capacity_utilization_30d?.toFixed(1) || 0}%</Text>
                                <Text style={styles.statCardLabel}>Capacity Utilization</Text>
                            </View>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.statCardIcon, { backgroundColor: colors.infoLight }]}>
                                <DollarSign size={20} color={colors.info} />
                            </View>
                            <View style={styles.statCardContent}>
                                <Text style={styles.statCardValue}>{formatCurrency(vessel.total_revenue_30d || 0)}</Text>
                                <Text style={styles.statCardLabel}>Total Revenue</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* Maintenance Alert */}
            {maintenanceStatus.status !== 'up_to_date' && (
                <View style={[styles.alertContainer, { borderLeftColor: maintenanceStatus.color }]}>
                    <View style={styles.alertIcon}>
                        <AlertTriangle size={20} color={maintenanceStatus.color} />
                    </View>
                    <View style={styles.alertContent}>
                        <Text style={[styles.alertTitle, { color: maintenanceStatus.color }]}>
                            Maintenance {maintenanceStatus.status === 'overdue' ? 'Overdue' : 'Due Soon'}
                        </Text>
                        <Text style={styles.alertMessage}>{maintenanceStatus.message}</Text>
                    </View>
                </View>
            )}

            {/* Vessel Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vessel Information</Text>

                <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <View style={styles.infoIcon}>
                                <Ship size={20} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Type</Text>
                                <Text style={styles.infoValue}>{vesselTypeLabel}</Text>
                            </View>
                        </View>

                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: colors.successLight }]}>
                                <Users size={20} color={colors.success} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Capacity</Text>
                                <Text style={styles.infoValue}>{vessel.seating_capacity} passengers</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: colors.infoLight }]}>
                                <Anchor size={20} color={colors.info} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Registration</Text>
                                <Text style={styles.infoValue}>{vessel.registration_number || 'N/A'}</Text>
                            </View>
                        </View>

                        <View style={styles.infoItem}>
                            <View style={[styles.infoIcon, { backgroundColor: colors.warningLight }]}>
                                <UserCheck size={20} color={colors.warning} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Captain</Text>
                                <Text style={styles.infoValue}>{vessel.captain_name || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>

                    {vessel.contact_number && (
                        <View style={styles.infoRow}>
                            <View style={[styles.infoIcon, { backgroundColor: colors.primaryLight }]}>
                                <Phone size={20} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Contact</Text>
                                <Text style={styles.infoValue}>{vessel.contact_number}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Technical Specifications */}
            {(vessel.max_speed || vessel.fuel_capacity) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Technical Specifications</Text>

                    <View style={styles.infoGrid}>
                        {vessel.max_speed && (
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.successLight }]}>
                                    <Gauge size={20} color={colors.success} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Max Speed</Text>
                                    <Text style={styles.infoValue}>{vessel.max_speed} knots</Text>
                                </View>
                            </View>
                        )}

                        {vessel.fuel_capacity && (
                            <View style={styles.infoRow}>
                                <View style={[styles.infoIcon, { backgroundColor: colors.warningLight }]}>
                                    <Fuel size={20} color={colors.warning} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Fuel Capacity</Text>
                                    <Text style={styles.infoValue}>{vessel.fuel_capacity} liters</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Performance Metrics */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Metrics</Text>

                <View style={styles.performanceGrid}>
                    <View style={styles.performanceCard}>
                        <View style={styles.performanceIcon}>
                            <BarChart3 size={20} color={colors.success} />
                        </View>
                        <View style={styles.performanceContent}>
                            <Text style={styles.performanceTitle}>Trip Statistics</Text>
                            <Text style={styles.performanceValue}>{vessel.total_trips_30d || 0}</Text>
                            <Text style={styles.performanceLabel}>Total Trips (30d)</Text>
                            <Text style={styles.performanceSubtext}>
                                Avg passengers: {vessel.avg_passengers_per_trip?.toFixed(1) || 0}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.performanceCard}>
                        <View style={[styles.performanceIcon, { backgroundColor: colors.warningLight }]}>
                            <Star size={20} color={colors.warning} />
                        </View>
                        <View style={styles.performanceContent}>
                            <Text style={styles.performanceTitle}>Utilization</Text>
                            <Text style={styles.performanceValue}>{vessel.capacity_utilization_30d?.toFixed(1) || 0}%</Text>
                            <Text style={styles.performanceLabel}>Capacity Utilization</Text>
                            <Text style={styles.performanceSubtext}>
                                Rating: {getUtilizationRating(vessel.capacity_utilization_30d || 0)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Seat Layout Preview */}
            <View style={styles.section}>
                {/* <Text style={styles.sectionTitle}>Seat Layout</Text> */}

                <View style={styles.seatLayoutContainer}>
                    <View style={styles.seatLayoutHeader}>
                        <Text style={styles.seatLayoutTitle}>Seating Arrangement</Text>
                        <Text style={styles.seatLayoutSubtitle}>
                            {vessel.seating_capacity} total seats
                        </Text>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.seatLayoutScrollView}
                        contentContainerStyle={styles.seatLayoutScrollContent}
                    >
                        <View style={styles.seatLayoutGrid}>
                            {generateSeatLayoutFromDatabase(vessel.seats || [], vessel.seatLayout || null)}
                        </View>
                    </ScrollView>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.seatLayoutScrollView}
                        contentContainerStyle={styles.seatLayoutScrollContent}
                    >
                    <View style={styles.seatLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                            <Text style={styles.legendText}>Standard Seats</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                            <Text style={styles.legendText}>Premium Seats</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.info }]} />
                            <Text style={styles.legendText}>Window Seats</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
                            <Text style={styles.legendText}>Crew Seats</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                            <Text style={styles.legendText}>Disabled Seats</Text>
                        </View>
                    </View>
                    </ScrollView>
                    <View style={styles.seatLayoutInfo}>
                        <View style={styles.seatInfoRow}>
                            <Text style={styles.seatInfoLabel}>Total Seats:</Text>
                            <Text style={styles.seatInfoValue}>
                                {(vessel.seats || []).length}
                            </Text>
                        </View>
                        <View style={styles.seatInfoRow}>
                            <Text style={styles.seatInfoLabel}>Window Seats:</Text>
                            <Text style={styles.seatInfoValue}>
                                {(vessel.seats || []).filter(seat => seat.is_window).length}
                            </Text>
                        </View>
                        <View style={styles.seatInfoRow}>
                            <Text style={styles.seatInfoLabel}>Aisle Seats:</Text>
                            <Text style={styles.seatInfoValue}>
                                {(vessel.seats || []).filter(seat => seat.is_aisle).length}
                            </Text>
                        </View>
                        <View style={styles.seatInfoRow}>
                            <Text style={styles.seatInfoLabel}>Premium Seats:</Text>
                            <Text style={styles.seatInfoValue}>
                                {(vessel.seats || []).filter(seat => seat.is_premium).length}
                            </Text>
                        </View>
                        <View style={styles.seatInfoRow}>
                            <Text style={styles.seatInfoLabel}>Crew Seats:</Text>
                            <Text style={styles.seatInfoValue}>
                                {(vessel.seats || []).filter(seat => seat.seat_type === 'crew').length}
                            </Text>
                        </View>
                        <View style={styles.seatInfoRow}>
                            <Text style={styles.seatInfoLabel}>Disabled Seats:</Text>
                            <Text style={styles.seatInfoValue}>
                                {(vessel.seats || []).filter(seat => seat.is_disabled || seat.seat_type === 'disabled').length}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Vessel Operations */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vessel Operations</Text>

                <View style={styles.operationsSummary}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryIcon}>
                            <Info size={20} color={colors.info} />
                        </View>
                        <Text style={styles.operationsDescription}>
                            This vessel has {vessel.total_trips_30d || 0} trip{(vessel.total_trips_30d || 0) !== 1 ? 's' : ''} in the last 30 days,
                            with {vessel.capacity_utilization_30d?.toFixed(1) || 0}% capacity utilization and {vessel.avg_passengers_per_trip?.toFixed(1) || 0} average passengers per trip.
                        </Text>
                    </View>

                    <View style={styles.operationButtons}>
                        {onViewTrips && (
                            <Button
                                title="View All Trips"
                                variant="outline"
                                onPress={onViewTrips}
                                icon={<Calendar size={16} color={colors.primary} />}
                                style={styles.operationButton}
                            />
                        )}

                        {onViewSeatLayout && (
                            <Button
                                title="Seat Layout"
                                variant="outline"
                                onPress={onViewSeatLayout}
                                icon={<Layout size={16} color={colors.primary} />}
                                style={styles.operationButton}
                            />
                        )}

                        {onViewMaintenance && (
                            <Button
                                title="Maintenance Log"
                                variant="outline"
                                onPress={onViewMaintenance}
                                icon={<Wrench size={16} color={colors.primary} />}
                                style={styles.operationButton}
                            />
                        )}
                    </View>
                </View>
            </View>

            {/* System Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>System Information</Text>

                <View style={styles.systemInfo}>
                    <View style={styles.systemRow}>
                        <Text style={styles.systemLabel}>Vessel ID</Text>
                        <Text style={styles.systemValue} selectable>{vessel.id}</Text>
                    </View>

                    {vessel.created_at && (
                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Created Date</Text>
                            <Text style={styles.systemValue}>
                                {new Date(vessel.created_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}

                    {vessel.updated_at && vessel.updated_at !== vessel.created_at && (
                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Last Updated</Text>
                            <Text style={styles.systemValue}>
                                {new Date(vessel.updated_at).toLocaleDateString()}
                            </Text>
                        </View>
                    )}

                    {vessel.description && (
                        <View style={styles.systemRow}>
                            <Text style={styles.systemLabel}>Description</Text>
                            <Text style={styles.systemValue}>
                                {vessel.description}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {/* Warnings */}
            {vessel.status === 'maintenance' && (
                <View style={styles.warningContainer}>
                    <AlertTriangle size={16} color={colors.warning} />
                    <Text style={styles.warningText}>
                        This vessel is currently under maintenance and unavailable for service.
                    </Text>
                </View>
            )}

            {vessel.status === 'inactive' && (
                <View style={styles.warningContainer}>
                    <AlertTriangle size={16} color={colors.danger} />
                    <Text style={styles.warningText}>
                        This vessel is inactive and unavailable for service.
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    contentContainer: {
        flexGrow: 1,
        padding: 12,
        paddingBottom: 40,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    vesselIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    vesselName: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 6,
        lineHeight: 30,
    },
    vesselInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    vesselDescription: {
        fontSize: 15,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    statusActive: {
        backgroundColor: colors.successLight,
    },
    statusInactive: {
        backgroundColor: colors.backgroundTertiary,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    quickStats: {
        marginBottom: 24,
    },
    statsGrid: {
        gap: 12,
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        gap: 12,
    },
    statCardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    statCardContent: {
        flex: 1,
    },
    statCardValue: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 22,
        marginBottom: 2,
    },
    statCardLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    alertContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderLeftWidth: 4,
        gap: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    alertIcon: {
        marginTop: 2,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    alertMessage: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    section: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 20,
        lineHeight: 24,
    },
    infoGrid: {
        gap: 20,
    },
    infoRow: {
        flexDirection: "row",
        gap: 16,
    },
    infoItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    infoIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textTertiary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        fontWeight: "600",
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        lineHeight: 20,
    },
    performanceGrid: {
        flexDirection: "row",
        gap: 12,
    },
    performanceCard: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    performanceIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.successLight,
        alignItems: "center",
        justifyContent: "center",
    },
    performanceContent: {
        gap: 2,
    },
    performanceTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    performanceValue: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        lineHeight: 24,
    },
    performanceLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    performanceSubtext: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
        lineHeight: 14,
    },
    operationsSummary: {
        gap: 20,
    },
    summaryCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.infoLight,
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    summaryIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.info + '20',
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    operationsDescription: {
        flex: 1,
        fontSize: 14,
        color: colors.info,
        lineHeight: 20,
        fontWeight: "500",
    },
    operationButtons: {
        flexDirection: "row",
        gap: 12,
    },
    operationButton: {
        flex: 1,
    },
    systemInfo: {
        gap: 16,
    },
    systemRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    systemLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "600",
        flex: 1,
    },
    systemValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: "500",
        flex: 2,
        textAlign: "right",
        lineHeight: 18,
    },
    warningContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: colors.warningLight,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: colors.warning,
        lineHeight: 20,
        fontWeight: "500",
    },
    seatLayoutContainer: {
    
        backgroundColor: colors.card,
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: colors.shadowMedium,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    seatLayoutHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    seatLayoutTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    seatLayoutSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    seatLayoutScrollView: {
        // Add any specific styles for the ScrollView if needed
    },
    seatLayoutScrollContent: {
        // Add any specific styles for the ScrollView content if needed
    },
    seatLayoutGrid: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    seatRow: {
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    rowLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
        width: 20,
        textAlign: "right",
    },
    seatLayoutCell: {
        width: 28,
        height: 28,
        borderRadius: 4,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
        position: "relative",
    },
    aisleSpace: {
        width: 16,
        height: 32,
        marginHorizontal: 4,
    },
    seatLayoutNumber: {
        fontSize: 8,
        fontWeight: "600",
    },
    seatLegend: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginTop: 16,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    seatLayoutInfo: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    seatInfoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    seatInfoLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    seatInfoValue: {
        fontSize: 14,
        color: colors.text,
        fontWeight: "500",
    },
    windowIndicator: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 6,
        height: 6,
        backgroundColor: colors.info,
        borderRadius: 3,
    },
    aisleIndicator: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 6,
        height: 6,
        backgroundColor: colors.warning,
        borderRadius: 3,
    },
    premiumIndicator: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 6,
        height: 6,
        backgroundColor: colors.success,
        borderRadius: 3,
    },
    disabledSeat: {
        opacity: 0.7,
        backgroundColor: colors.dangerLight,
    },
    disabledSeatText: {
        color: colors.textSecondary,
    },
    disabledIndicator: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 6,
        height: 6,
        backgroundColor: colors.danger,
        borderRadius: 3,
    },
    noSeatsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noSeatsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
    },
    noSeatsMessage: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    emptySeat: {
        width: 28,
        height: 28,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 4,
        marginHorizontal: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    aisleLabel: {
        fontSize: 10,
        color: colors.warning,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
}); 