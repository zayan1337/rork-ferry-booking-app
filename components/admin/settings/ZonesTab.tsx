import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Dimensions,
} from "react-native";
import { colors } from "@/constants/adminColors";
import { useContentData, useContentActions } from "@/hooks";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Zone } from "@/types/content";
import { getZoneColor, getZoneIcon } from "@/utils/contentUtils";
import {
    Plus,
    Edit,
    Trash2,
    Activity,
    MapPin,
    Palette,
    MoreHorizontal,
    Circle,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import { StatsSection } from "@/components/admin/common";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface ZonesTabProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export const ZonesTab: React.FC<ZonesTabProps> = ({
    searchQuery,
    setSearchQuery,
}) => {
    const { canManageSettings } = useAdminPermissions();
    const {
        filteredZones,
        stats,
        loading,
        refreshData,
        setSearchQuery: setContentSearchQuery,
    } = useContentData();
    const {
        handleAddZone,
        handleUpdateZone,
        handleDeleteZone,
    } = useContentActions();

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Sync search query with content store
    useEffect(() => {
        setContentSearchQuery('zones', searchQuery);
    }, [searchQuery, setContentSearchQuery]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshData();
        setIsRefreshing(false);
    };

    const handleAddZonePress = () => {
        if (canManageSettings()) {
            // TODO: Open zone creation modal
            Alert.alert("Add Zone", "Zone creation functionality will be implemented");
        } else {
            Alert.alert("Access Denied", "You don't have permission to create zones.");
        }
    };

    const handleEditZone = (zone: Zone) => {
        if (canManageSettings()) {
            // TODO: Open zone editing modal
            Alert.alert("Edit Zone", `Edit ${zone.name} functionality will be implemented`);
        } else {
            Alert.alert("Access Denied", "You don't have permission to edit zones.");
        }
    };

    const handleDeleteZonePress = async (zone: Zone) => {
        const success = await handleDeleteZone(zone.id, zone.name);
        if (success) {
            // Zone deleted successfully
        }
    };

    const renderZoneItem = ({ item }: { item: Zone }) => (
        <View style={styles.zoneItem}>
            <View style={styles.zoneHeader}>
                <View style={styles.zoneInfo}>
                    <View style={styles.zoneNameContainer}>
                        <Text style={styles.zoneName}>{item.name}</Text>
                        <View style={[styles.zoneColor, { backgroundColor: item.color || getZoneColor(item.name) }]} />
                    </View>
                    {item.description && (
                        <Text style={styles.zoneDescription}>{item.description}</Text>
                    )}
                </View>
                <View style={styles.zoneActions}>
                    <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
                        <Text style={[styles.statusText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
                            {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                    {canManageSettings() && (
                        <TouchableOpacity
                            style={styles.moreButton}
                            onPress={() => showZoneOptions(item)}
                        >
                            <MoreHorizontal size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <View style={styles.zoneStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Created</Text>
                    <Text style={styles.statValue}>
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                {item.updated_at !== item.created_at && (
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Updated</Text>
                        <Text style={styles.statValue}>
                            {new Date(item.updated_at).toLocaleDateString()}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    const showZoneOptions = (zone: Zone) => {
        Alert.alert(
            zone.name,
            "Choose an action",
            [
                {
                    text: "Edit",
                    onPress: () => handleEditZone(zone),
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handleDeleteZonePress(zone),
                },
                {
                    text: "Cancel",
                    style: "cancel",
                },
            ]
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <MapPin size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No zones found</Text>
            <Text style={styles.emptyStateText}>
                {searchQuery ? 'Try adjusting your search terms' : 'No zones available'}
            </Text>
            {canManageSettings() && !searchQuery && (
                <Button
                    title="Add Zone"
                    onPress={handleAddZonePress}
                    variant="primary"
                    size="small"
                    icon={<Plus size={16} color={colors.white} />}
                    style={styles.emptyStateButton}
                />
            )}
        </View>
    );

    const renderHeader = () => (
        <View style={styles.header}>
            {/* Stats Section */}
            <StatsSection
                title="Zones Overview"
                subtitle="Geographical zone management"
                stats={[
                    {
                        title: "Total Zones",
                        value: stats.totalZones.toString(),
                        subtitle: `${stats.activeZones} active`,
                        icon: <MapPin size={20} color={colors.primary} />,
                        trend: "neutral",
                    },
                    {
                        title: "Active Zones",
                        value: stats.activeZones.toString(),
                        subtitle: `${Math.round((stats.activeZones / stats.totalZones) * 100) || 0}% active`,
                        icon: <Activity size={20} color={colors.success} />,
                        trend: "up",
                    },
                ]}
                isTablet={isTablet}
                headerSize="medium"
            />

            {/* Actions Bar */}
            <View style={styles.actionsBar}>
                <View style={styles.actionsLeft}>
                    <Text style={styles.resultCount}>
                        {filteredZones.length} zone{filteredZones.length !== 1 ? 's' : ''}
                    </Text>
                </View>

                <View style={styles.actionsRight}>
                    {canManageSettings() && (
                        <Button
                            title="Add Zone"
                            onPress={handleAddZonePress}
                            variant="primary"
                            size="small"
                            icon={<Plus size={16} color={colors.white} />}
                        />
                    )}
                </View>
            </View>
        </View>
    );

    if (loading.zones) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading zones...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredZones}
                renderItem={renderZoneItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                style={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginBottom: 16,
    },
    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    actionsLeft: {
        flex: 1,
    },
    resultCount: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    actionsRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    list: {
        flex: 1,
    },
    listContent: {
        flexGrow: 1,
    },
    zoneItem: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    zoneHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    zoneInfo: {
        flex: 1,
        marginRight: 12,
    },
    zoneNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    zoneName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginRight: 8,
    },
    zoneColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    zoneDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    zoneActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusActive: {
        backgroundColor: colors.success + '15',
        borderColor: colors.success + '30',
    },
    statusInactive: {
        backgroundColor: colors.textSecondary + '15',
        borderColor: colors.textSecondary + '30',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusTextActive: {
        color: colors.success,
    },
    statusTextInactive: {
        color: colors.textSecondary,
    },
    moreButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
    },
    zoneStats: {
        flexDirection: 'row',
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    statItem: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
        paddingHorizontal: 32,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: 250,
    },
    emptyStateButton: {
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 64,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
    },
});

export default ZonesTab; 