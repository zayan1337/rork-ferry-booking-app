import React, { useState, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    FlatList,
    RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AdminManagement } from "@/types";
import {
    FileText,
    Tag,
    Plus,
    Eye,
    AlertTriangle,
    Clock,
    TrendingUp,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import StatCard from "@/components/admin/StatCard";

// Types
type TermsAndConditions = AdminManagement.TermsAndConditions;
type Promotion = AdminManagement.Promotion;

interface ContentTabProps {
    isActive: boolean;
    searchQuery?: string;
}

export default function ContentTab({ isActive, searchQuery = "" }: ContentTabProps) {
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        terms,
        promotions,
        loading,
        fetchTerms,
        fetchPromotions,
        calculateStats,
    } = useContentStore();

    const [isRefreshing, setIsRefreshing] = useState(false);

    // Initialize data when tab becomes active
    useEffect(() => {
        if (isActive && canViewContent()) {
            if (terms.length === 0) {
                fetchTerms();
            }
            if (promotions.length === 0) {
                fetchPromotions();
            }
        }
    }, [isActive]);

    // Filter terms and conditions by search query
    const filteredTerms = useMemo(() => {
        if (!searchQuery) return terms;

        const query = searchQuery.toLowerCase();
        return terms.filter(term =>
            term.title.toLowerCase().includes(query) ||
            term.version.toLowerCase().includes(query) ||
            term.content.toLowerCase().includes(query)
        );
    }, [terms, searchQuery]);

    // Filter promotions by search query
    const filteredPromotions = useMemo(() => {
        if (!searchQuery) return promotions;

        const query = searchQuery.toLowerCase();
        return promotions.filter(promotion =>
            promotion.name.toLowerCase().includes(query) ||
            (promotion.description && promotion.description.toLowerCase().includes(query))
        );
    }, [promotions, searchQuery]);

    // Preview items (first 3 items)
    const previewTerms = useMemo(() => {
        return filteredTerms.slice(0, 3);
    }, [filteredTerms]);

    const previewPromotions = useMemo(() => {
        return filteredPromotions.slice(0, 3);
    }, [filteredPromotions]);

    // Calculate stats
    const stats = useMemo(() => {
        const termsStats = {
            total: terms.length,
            active: terms.filter(t => t.is_active).length,
            versions: [...new Set(terms.map(t => t.version))].length,
        };

        const promotionStats = {
            total: promotions.length,
            active: promotions.filter(p => p.is_active).length,
            current: promotions.filter(p => {
                const now = new Date();
                const start = new Date(p.start_date);
                const end = new Date(p.end_date);
                return p.is_active && start <= now && end >= now;
            }).length,
        };

        return { terms: termsStats, promotions: promotionStats };
    }, [terms, promotions]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchTerms(),
                fetchPromotions(),
            ]);
        } catch (error) {
            console.error("Failed to refresh content:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleTermPress = (termId: string) => {
        if (canViewContent()) {
            router.push(`../terms/${termId}` as any);
        }
    };

    const handlePromotionPress = (promotionId: string) => {
        if (canViewContent()) {
            router.push(`../promotions/${promotionId}` as any);
        }
    };

    const handleAddTerm = () => {
        if (canManageContent()) {
            router.push("../terms/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create terms and conditions.");
        }
    };

    const handleAddPromotion = () => {
        if (canManageContent()) {
            router.push("../promotions/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create promotions.");
        }
    };

    const handleViewAllTerms = () => {
        router.push("../terms" as any);
    };

    const handleViewAllPromotions = () => {
        router.push("../promotions" as any);
    };

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.noPermissionContainer}>
                <View style={styles.noPermissionIcon}>
                    <AlertTriangle size={48} color={colors.warning} />
                </View>
                <Text style={styles.noPermissionTitle}>Access Denied</Text>
                <Text style={styles.noPermissionText}>
                    You don't have permission to view content management.
                </Text>
            </View>
        );
    }

    // Loading state
    if (loading.terms && terms.length === 0 && loading.promotions && promotions.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading content...</Text>
            </View>
        );
    }

    const renderTermItem = ({ item, index }: { item: TermsAndConditions; index: number }) => (
        <TouchableOpacity
            key={`term-${item.id}-${index}`}
            style={styles.itemContainer}
            onPress={() => handleTermPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemIcon}>
                        <FileText size={20} color={colors.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <Text style={styles.itemSubtitle}>Version {item.version}</Text>
                        <Text style={styles.itemMeta}>
                            Effective: {new Date(item.effective_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.itemStatus}>
                        {item.is_active ? (
                            <View style={styles.statusActive}>
                                <Text style={styles.statusActiveText}>Active</Text>
                            </View>
                        ) : (
                            <View style={styles.statusInactive}>
                                <Text style={styles.statusInactiveText}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.content}
                </Text>

                <View style={styles.itemFooter}>
                    <View style={styles.itemDate}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.itemDateText}>
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleTermPress(item.id)}
                    >
                        <Eye size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderPromotionItem = ({ item, index }: { item: Promotion; index: number }) => (
        <TouchableOpacity
            key={`promotion-${item.id}-${index}`}
            style={styles.itemContainer}
            onPress={() => handlePromotionPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                    <View style={styles.itemIcon}>
                        <Tag size={20} color={colors.success} />
                    </View>
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{item.name}</Text>
                        <Text style={styles.itemSubtitle}>{item.discount_percentage}% off</Text>
                        <Text style={styles.itemMeta}>
                            {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.itemStatus}>
                        {item.is_active ? (
                            <View style={styles.statusActive}>
                                <Text style={styles.statusActiveText}>Active</Text>
                            </View>
                        ) : (
                            <View style={styles.statusInactive}>
                                <Text style={styles.statusInactiveText}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>

                {item.description && (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                        {item.description}
                    </Text>
                )}

                <View style={styles.itemFooter}>
                    <View style={styles.itemDate}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.itemDateText}>
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handlePromotionPress(item.id)}
                    >
                        <Eye size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderTermsSection = () => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                    <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionIcon}>
                            <FileText size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
                            <Text style={styles.sectionSubtitle}>{filteredTerms.length} terms available</Text>
                        </View>
                    </View>
                </View>
                {canManageContent() && (
                    <View style={styles.sectionHeaderButton}>
                        <Button
                            title="Add Term"
                            onPress={handleAddTerm}
                            size="small"
                            variant="outline"
                            icon={<Plus size={16} color={colors.primary} />}
                        />
                    </View>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <StatCard
                    title="Total Terms"
                    value={stats.terms.total.toString()}
                    icon={<FileText size={20} color={colors.primary} />}
                />
                <StatCard
                    title="Active"
                    value={stats.terms.active.toString()}
                    icon={<FileText size={20} color={colors.success} />}
                />
                <StatCard
                    title="Versions"
                    value={stats.terms.versions.toString()}
                    icon={<TrendingUp size={20} color={colors.info} />}
                />
            </View>

            {/* Terms List */}
            <FlatList
                data={previewTerms}
                renderItem={renderTermItem}
                keyExtractor={(item, index) => `term-${item.id}-${index}`}
                scrollEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <FileText size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyStateTitle}>No terms found</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? 'Try adjusting your search terms' : 'No terms and conditions available'}
                        </Text>
                    </View>
                }
            />

            {filteredTerms.length > 3 && (
                <View style={styles.footerContainer}>
                    <Text style={styles.previewText}>
                        Showing {previewTerms.length} of {filteredTerms.length} terms
                    </Text>
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={handleViewAllTerms}
                    >
                        <Text style={styles.viewAllText}>View All Terms</Text>
                        <FileText size={16} color={colors.primary} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderPromotionsSection = () => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                    <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionIcon}>
                            <Tag size={20} color={colors.success} />
                        </View>
                        <View>
                            <Text style={styles.sectionTitle}>Promotions</Text>
                            <Text style={styles.sectionSubtitle}>{filteredPromotions.length} promotions available</Text>
                        </View>
                    </View>
                </View>
                {canManageContent() && (
                    <View style={styles.sectionHeaderButton}>
                        <Button
                            title="Add Promotion"
                            onPress={handleAddPromotion}
                            size="small"
                            variant="outline"
                            icon={<Plus size={16} color={colors.success} />}
                        />
                    </View>
                )}
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <StatCard
                    title="Total Promotions"
                    value={stats.promotions.total.toString()}
                    icon={<Tag size={20} color={colors.success} />}
                />
                <StatCard
                    title="Active"
                    value={stats.promotions.active.toString()}
                    icon={<Tag size={20} color={colors.success} />}
                />
                <StatCard
                    title="Current"
                    value={stats.promotions.current.toString()}
                    icon={<TrendingUp size={20} color={colors.warning} />}
                />
            </View>

            {/* Promotions List */}
            <FlatList
                data={previewPromotions}
                renderItem={renderPromotionItem}
                keyExtractor={(item, index) => `promotion-${item.id}-${index}`}
                scrollEnabled={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Tag size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyStateTitle}>No promotions found</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? 'Try adjusting your search terms' : 'No promotions available'}
                        </Text>
                    </View>
                }
            />

            {filteredPromotions.length > 3 && (
                <View style={styles.footerContainer}>
                    <Text style={styles.previewText}>
                        Showing {previewPromotions.length} of {filteredPromotions.length} promotions
                    </Text>
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={handleViewAllPromotions}
                    >
                        <Text style={styles.viewAllText}>View All Promotions</Text>
                        <Tag size={16} color={colors.success} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={[]} // Empty data since we're using ListHeaderComponent
                renderItem={() => null}
                ListHeaderComponent={
                    <View>
                        {renderTermsSection()}
                        {renderPromotionsSection()}
                    </View>
                }
                contentContainerStyle={styles.contentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        minHeight: 44,
    },
    sectionHeaderContent: {
        flex: 1,
        paddingRight: 8,
    },
    sectionHeaderButton: {
        flexShrink: 0,
        maxWidth: "40%",
    },
    sectionTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionIcon: {
        padding: 8,
        backgroundColor: colors.primary + "10",
        borderRadius: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    itemContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    itemContent: {
        padding: 16,
    },
    itemHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 12,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + "10",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
        gap: 4,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.text,
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: "500",
    },
    itemMeta: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    itemDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    itemStatus: {
        marginLeft: 8,
    },
    statusActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusActiveText: {
        fontSize: 12,
        color: colors.success,
        fontWeight: '500',
    },
    statusInactive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.error + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusInactiveText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '500',
    },
    itemFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemDate: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    itemDateText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    actionButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: colors.backgroundSecondary,
    },
    footerContainer: {
        paddingVertical: 16,
    },
    viewAllButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.primary + "10",
        borderRadius: 8,
        gap: 8,
        minWidth: 200,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: "500",
        color: colors.primary,
    },
    previewText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 12,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 32,
        gap: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: colors.text,
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 280,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
        gap: 16,
    },
    noPermissionIcon: {
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: colors.warning + "10",
        borderRadius: 24,
    },
    noPermissionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 250,
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
});
