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
import { Vessel } from '@/types/operations';
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
} from 'lucide-react-native';

interface VesselDetailsProps {
    vessel: Vessel;
    onEdit?: () => void;
    onArchive?: () => void;
    onViewTrips?: () => void;
    onViewMaintenance?: () => void;
    showActions?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function VesselDetails({
    vessel,
    onEdit,
    onArchive,
    onViewTrips,
    onViewMaintenance,
    showActions = true,
}: VesselDetailsProps) {
    const isTablet = screenWidth >= 768;

    const handleArchive = () => {
        Alert.alert(
            'Archive Vessel',
            `Are you sure you want to archive "${vessel.name}"? This will remove it from active service.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    style: 'destructive',
                    onPress: onArchive,
                },
            ]
        );
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

    const vesselAge = vessel.year_built ? new Date().getFullYear() - vessel.year_built : 0;
    const vesselTypeLabel = vessel.vessel_type.charAt(0).toUpperCase() + vessel.vessel_type.slice(1);

    const maintenanceStatus = vessel.next_maintenance ? (() => {
        const nextMaintenance = new Date(vessel.next_maintenance);
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

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>{vessel.name}</Text>
                    <Text style={styles.subtitle}>{vesselTypeLabel}</Text>
                    <View style={styles.statusContainer}>
                        <StatusBadge
                            status={getCompatibleStatus(vessel.status)}
                        />
                        <Text style={styles.vesselId}>Reg: {vessel.registration_number}</Text>
                    </View>
                </View>
                {showActions && (
                    <View style={styles.headerActions}>
                        {onEdit && (
                            <TouchableOpacity style={styles.iconButton} onPress={onEdit}>
                                <Edit size={20} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        {onArchive && (
                            <TouchableOpacity style={styles.iconButton} onPress={handleArchive}>
                                <Archive size={20} color={colors.danger} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Statistics */}
            <View style={styles.statsContainer}>
                {stats.map((stat, index) => (
                    <StatCard
                        key={index}
                        title={stat.title}
                        value={stat.value}
                        subtitle={stat.subtitle}
                        icon={stat.icon}
                        trend={stat.trend as "up" | "down" | "neutral"}
                    />
                ))}
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

            {/* Basic Information */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                            <Ship size={16} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Type</Text>
                            <Text style={styles.infoValue}>{vesselTypeLabel}</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                            <Anchor size={16} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Registration</Text>
                            <Text style={styles.infoValue}>{vessel.registration_number}</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                            <Users size={16} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Total Capacity</Text>
                            <Text style={styles.infoValue}>{vessel.capacity} persons</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                            <Users size={16} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Seating Capacity</Text>
                            <Text style={styles.infoValue}>{vessel.seating_capacity} passengers</Text>
                        </View>
                    </View>

                    <View style={styles.infoItem}>
                        <View style={styles.infoIcon}>
                            <Users size={16} color={colors.primary} />
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Crew Capacity</Text>
                            <Text style={styles.infoValue}>{vessel.crew_capacity} crew</Text>
                        </View>
                    </View>

                    {vessel.year_built && (
                        <View style={styles.infoItem}>
                            <View style={styles.infoIcon}>
                                <Calendar size={16} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Year Built</Text>
                                <Text style={styles.infoValue}>{vessel.year_built} ({vesselAge} years old)</Text>
                            </View>
                        </View>
                    )}

                    {vessel.manufacturer && (
                        <View style={styles.infoItem}>
                            <View style={styles.infoIcon}>
                                <Wrench size={16} color={colors.primary} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Manufacturer</Text>
                                <Text style={styles.infoValue}>{vessel.manufacturer}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Technical Specifications */}
            {vessel.specifications && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Technical Specifications</Text>
                    <View style={styles.infoGrid}>
                        {vessel.specifications.length && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Ruler size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Length</Text>
                                    <Text style={styles.infoValue}>{vessel.specifications.length} meters</Text>
                                </View>
                            </View>
                        )}

                        {vessel.specifications.width && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Ruler size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Width</Text>
                                    <Text style={styles.infoValue}>{vessel.specifications.width} meters</Text>
                                </View>
                            </View>
                        )}

                        {vessel.specifications.max_speed && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Gauge size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Max Speed</Text>
                                    <Text style={styles.infoValue}>{vessel.specifications.max_speed} knots</Text>
                                </View>
                            </View>
                        )}

                        {vessel.specifications.fuel_capacity && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Fuel size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Fuel Capacity</Text>
                                    <Text style={styles.infoValue}>{vessel.specifications.fuel_capacity} liters</Text>
                                </View>
                            </View>
                        )}

                        {vessel.specifications.engine_type && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Settings size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Engine Type</Text>
                                    <Text style={styles.infoValue}>{vessel.specifications.engine_type}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Maintenance Information */}
            {(vessel.last_maintenance || vessel.next_maintenance) && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Maintenance</Text>
                    <View style={styles.infoGrid}>
                        {vessel.last_maintenance && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Wrench size={16} color={colors.primary} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Last Maintenance</Text>
                                    <Text style={styles.infoValue}>
                                        {new Date(vessel.last_maintenance).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {vessel.next_maintenance && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <Settings size={16} color={colors.warning} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Next Maintenance</Text>
                                    <Text style={styles.infoValue}>
                                        {new Date(vessel.next_maintenance).toLocaleDateString()}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {vessel.maintenance_cost_30d && (
                            <View style={styles.infoItem}>
                                <View style={styles.infoIcon}>
                                    <DollarSign size={16} color={colors.danger} />
                                </View>
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoLabel}>Maintenance Cost (30d)</Text>
                                    <Text style={styles.infoValue}>{formatCurrency(vessel.maintenance_cost_30d)}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Location Information */}
            {vessel.current_location && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current Location</Text>
                    <View style={styles.locationContainer}>
                        <Text style={styles.locationText}>
                            Lat: {vessel.current_location.latitude.toFixed(6)},
                            Lng: {vessel.current_location.longitude.toFixed(6)}
                        </Text>
                        <Text style={styles.locationTime}>
                            Last updated: {new Date(vessel.current_location.last_updated).toLocaleString()}
                        </Text>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            {showActions && (
                <View style={styles.actionContainer}>
                    {onViewTrips && (
                        <Button
                            title="View Trips"
                            variant="outline"
                            onPress={onViewTrips}
                            icon={<Activity size={18} color={colors.primary} />}
                        />
                    )}
                    {onViewMaintenance && (
                        <Button
                            title="Maintenance Log"
                            variant="outline"
                            onPress={onViewMaintenance}
                            icon={<Wrench size={18} color={colors.primary} />}
                        />
                    )}
                    {onEdit && (
                        <Button
                            title="Edit Vessel"
                            variant="primary"
                            onPress={onEdit}
                            icon={<Edit size={18} color="#FFFFFF" />}
                        />
                    )}
                </View>
            )}

            {/* Warnings */}
            {vessel.status === 'maintenance' && (
                <View style={styles.warningContainer}>
                    <AlertTriangle size={16} color={colors.warning} />
                    <Text style={styles.warningText}>
                        This vessel is currently under maintenance and unavailable for service.
                    </Text>
                </View>
            )}

            {vessel.status === 'decommissioned' && (
                <View style={styles.warningContainer}>
                    <AlertTriangle size={16} color={colors.danger} />
                    <Text style={styles.warningText}>
                        This vessel has been decommissioned and is no longer in service.
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
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    vesselId: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 16,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: '45%',
        marginBottom: 12,
    },
    infoIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    locationContainer: {
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
    },
    locationText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 4,
    },
    locationTime: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actionContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 24,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.warning + '10',
        borderWidth: 1,
        borderColor: colors.warning + '30',
        borderRadius: 8,
        padding: 12,
        marginTop: 16,
    },
    warningText: {
        fontSize: 14,
        color: colors.warning,
        flex: 1,
    },
    alertContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderLeftWidth: 4,
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    alertIcon: {
        marginRight: 12,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    alertMessage: {
        fontSize: 12,
        color: colors.textSecondary,
    },
}); 