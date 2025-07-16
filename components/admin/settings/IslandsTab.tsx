import React, { useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Island } from "@/types";
import {
    MapPin,
    ArrowRight,
    Eye,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import IslandItem from "@/components/admin/IslandItem";
import LoadingSpinner from "@/components/admin/LoadingSpinner";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface IslandsTabProps {
    isActive: boolean;
}

export default function IslandsTab({ isActive }: IslandsTabProps) {
    const { canViewIslands } = useAdminPermissions();
    const { islands: allIslands, loading, fetchIslands } = useContentStore();

    useEffect(() => {
        if (isActive && canViewIslands()) {
            fetchIslands();
        }
    }, []);

    if (!canViewIslands()) {
        return (
            <View style={styles.permissionDenied}>
                <MapPin size={64} color={colors.textTertiary} />
                <Text style={styles.permissionTitle}>Access Denied</Text>
                <Text style={styles.permissionText}>
                    You don't have permission to view islands.
                </Text>
            </View>
        );
    }

    if (loading.islands) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading islands...</Text>
            </View>
        );
    }

    // Show only first 3 islands for preview
    const previewIslands = allIslands.slice(0, 3);
    const totalIslands = allIslands.length;

    const handleViewAllIslands = () => {
        router.push("../islands");
    };

    const handleIslandPress = (island: Island) => {
        router.push(`../island/${island.id}`);
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.iconContainer}>
                        <MapPin size={24} color={colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Islands</Text>
                        <Text style={styles.subtitle}>
                            Manage ferry destinations and zones
                        </Text>
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{totalIslands}</Text>
                        <Text style={styles.statLabel}>Total Islands</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>
                            {allIslands.filter(i => i.is_active).length}
                        </Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            {totalIslands === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.emptyStateIcon}>
                        <MapPin size={48} color={colors.textTertiary} />
                    </View>
                    <Text style={styles.emptyStateTitle}>No Islands Found</Text>
                    <Text style={styles.emptyStateText}>
                        No islands have been added to the system yet.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Islands Preview */}
                    <View style={styles.contentSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Islands</Text>
                            <Text style={styles.sectionSubtitle}>
                                Showing {previewIslands.length} of {totalIslands} islands
                            </Text>
                        </View>

                        <View style={styles.islandsList}>
                            {previewIslands.map((island, index) => (
                                <View key={island.id} style={styles.islandItemWrapper}>
                                    <IslandItem
                                        island={island}
                                        onPress={() => handleIslandPress(island)}
                                    />
                                    {index < previewIslands.length - 1 && (
                                        <View style={styles.itemSeparator} />
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* View All Button */}
                    <View style={styles.actionSection}>
                        <Button
                            title="View All Islands"
                            onPress={handleViewAllIslands}
                            variant="outline"
                            icon={<Eye size={18} color={colors.primary} />}
                            style={styles.viewAllButton}
                        />
                        <View style={styles.viewAllHint}>
                            <ArrowRight size={16} color={colors.textSecondary} />
                            <Text style={styles.viewAllHintText}>
                                Access full islands management
                            </Text>
                        </View>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    permissionDenied: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 16,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
    },
    permissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 24,
    },
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.backgroundSecondary,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    statsContainer: {
        flexDirection: "row",
        gap: 24,
    },
    statItem: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 28,
        fontWeight: "700",
        color: colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    contentSection: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    islandsList: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 12,
        overflow: "hidden",
    },
    islandItemWrapper: {
        backgroundColor: colors.backgroundSecondary,
    },
    itemSeparator: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginHorizontal: 16,
    },
    actionSection: {
        paddingHorizontal: 20,
        paddingVertical: 24,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        alignItems: "center",
        gap: 12,
    },
    viewAllButton: {
        minWidth: 200,
    },
    viewAllHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    viewAllHintText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: "italic",
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
        gap: 16,
    },
    emptyStateIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.backgroundTertiary,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 8,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: colors.text,
        textAlign: "center",
    },
    emptyStateText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        lineHeight: 24,
        maxWidth: 320,
    },
}); 