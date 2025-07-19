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
import { Stack, router } from "expo-router";
import { colors } from "@/constants/adminColors";
import { useContentManagement } from "@/hooks/useContentManagement";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { TermsAndConditions } from "@/types/content";
import {
    ArrowLeft,
    Plus,
    FileText,
    Search,
    Filter,
    SortAsc,
    SortDesc,
    Activity,
    TrendingUp,
    Grid3x3,
    List,
    MoreHorizontal,
    Clock,
    CheckCircle,
    XCircle,
} from "lucide-react-native";

// Components
import Button from "@/components/admin/Button";
import SearchBar from "@/components/admin/SearchBar";
import LoadingSpinner from "@/components/admin/LoadingSpinner";
import StatCard from "@/components/admin/StatCard";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TermsScreen() {
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        terms,
        loading,
        termsStats,
        fetchTerms,
        deleteTerms,
        error,
        clearError,
    } = useContentManagement();

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterActive, setFilterActive] = useState<boolean | null>(null);
    const [filterVersion, setFilterVersion] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'title' | 'version' | 'effective_date' | 'created_at'>('title');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    useEffect(() => {
        if (canViewContent()) {
            fetchTerms();
        }
    }, []);

    // Filter and sort terms
    const filteredAndSortedTerms = React.useMemo(() => {
        let filtered = terms;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(term =>
                term.title.toLowerCase().includes(query) ||
                term.version.toLowerCase().includes(query) ||
                term.content.toLowerCase().includes(query)
            );
        }

        // Apply active filter
        if (filterActive !== null) {
            filtered = filtered.filter(term => term.is_active === filterActive);
        }

        // Apply version filter
        if (filterVersion) {
            filtered = filtered.filter(term => term.version === filterVersion);
        }

        // Sort terms
        const sorted = [...filtered].sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'title':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'version':
                    aValue = a.version;
                    bValue = b.version;
                    break;
                case 'effective_date':
                    aValue = new Date(a.effective_date).getTime();
                    bValue = new Date(b.effective_date).getTime();
                    break;
                case 'created_at':
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;
                default:
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return sorted;
    }, [terms, searchQuery, filterActive, filterVersion, sortBy, sortOrder]);

    // Use stats from the hook
    const stats = React.useMemo(() => {
        return {
            total: termsStats.total,
            active: termsStats.active,
            inactive: termsStats.inactive,
            versions: termsStats.versions.length,
            recent: termsStats.recentTerms,
        };
    }, [termsStats]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchTerms();
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleTermPress = (termId: string) => {
        router.push(`./terms/${termId}` as any);
    };

    const handleAddTerm = () => {
        if (canManageContent()) {
            router.push("./terms/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create terms and conditions.");
        }
    };

    const handleDeleteTerm = async (termId: string) => {
        if (!canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to delete terms and conditions.");
            return;
        }

        const term = terms.find(t => t.id === termId);
        if (!term) return;

        Alert.alert(
            "Delete Terms",
            `Are you sure you want to delete "${term.title}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTerms(termId);
                            Alert.alert("Success", "Terms and conditions deleted successfully");
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete terms and conditions");
                        }
                    },
                },
            ]
        );
    };

    const clearFilters = () => {
        setSearchQuery("");
        setFilterActive(null);
        setFilterVersion(null);
        setSortBy('title');
        setSortOrder('asc');
    };

    const renderTermItem = ({ item }: { item: TermsAndConditions }) => (
        <TouchableOpacity
            style={styles.termItem}
            onPress={() => handleTermPress(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.termContent}>
                <View style={styles.termHeader}>
                    <View style={styles.termIcon}>
                        <FileText size={20} color={colors.primary} />
                    </View>
                    <View style={styles.termInfo}>
                        <Text style={styles.termTitle}>{item.title}</Text>
                        <Text style={styles.termVersion}>Version {item.version}</Text>
                        <Text style={styles.termMeta}>
                            Effective: {new Date(item.effective_date).toLocaleDateString()}
                        </Text>
                    </View>
                    <View style={styles.termStatus}>
                        {item.is_active ? (
                            <View style={styles.statusActive}>
                                <CheckCircle size={12} color={colors.success} />
                                <Text style={styles.statusActiveText}>Active</Text>
                            </View>
                        ) : (
                            <View style={styles.statusInactive}>
                                <XCircle size={12} color={colors.error} />
                                <Text style={styles.statusInactiveText}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={styles.termDescription} numberOfLines={3}>
                    {item.content}
                </Text>

                <View style={styles.termFooter}>
                    <View style={styles.termDate}>
                        <Clock size={12} color={colors.textSecondary} />
                        <Text style={styles.termDateText}>
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                        </Text>
                    </View>
                    {canManageContent() && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteTerm(item.id)}
                        >
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <FileText size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Terms Found</Text>
            <Text style={styles.emptyStateText}>
                {searchQuery || filterActive !== null || filterVersion
                    ? "Try adjusting your search criteria"
                    : "No terms and conditions available"}
            </Text>
            {canManageContent() && !searchQuery && filterActive === null && !filterVersion && (
                <Button
                    title="Add First Term"
                    onPress={handleAddTerm}
                    style={styles.emptyStateButton}
                    icon={<Plus size={16} color={colors.card} />}
                />
            )}
        </View>
    );

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.noPermissionContainer}>
                <Text style={styles.noPermissionText}>
                    You don't have permission to view terms and conditions.
                </Text>
            </View>
        );
    }

    // Loading state
    if (loading.terms && terms.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading terms and conditions...</Text>
            </View>
        );
    }

    const versions = termsStats.versions;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Terms & Conditions",
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.backButton}
                        >
                            <ArrowLeft size={24} color={colors.text} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        canManageContent() ? (
                            <Button
                                title="Add Term"
                                onPress={handleAddTerm}
                                size="small"
                                icon={<Plus size={16} color={colors.card} />}
                            />
                        ) : null
                    ),
                }}
            />

            {/* Stats */}
            <View style={styles.statsContainer}>
                <StatCard
                    title="Total Terms"
                    value={stats.total.toString()}
                    icon={<FileText size={20} color={colors.primary} />}
                />
                <StatCard
                    title="Active"
                    value={stats.active.toString()}
                    icon={<CheckCircle size={20} color={colors.success} />}
                />
                <StatCard
                    title="Versions"
                    value={stats.versions.toString()}
                    icon={<TrendingUp size={20} color={colors.info} />}
                />
            </View>

            {/* Search and Filters */}
            <View style={styles.controlsContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search terms and conditions..."
                    style={styles.searchBar}
                />
                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Filter size={16} color={showFilters ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.filterButtonText, showFilters && styles.filterButtonTextActive]}>
                            Filters
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.sortButton}
                        onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                        {sortOrder === 'asc' ? (
                            <SortAsc size={16} color={colors.textSecondary} />
                        ) : (
                            <SortDesc size={16} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
                        onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                    >
                        {viewMode === 'list' ? (
                            <Grid3x3 size={16} color={colors.textSecondary} />
                        ) : (
                            <List size={16} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filters Panel */}
            {showFilters && (
                <View style={styles.filtersPanel}>
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Status:</Text>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterOption, filterActive === null && styles.filterOptionActive]}
                                onPress={() => setFilterActive(null)}
                            >
                                <Text style={[styles.filterOptionText, filterActive === null && styles.filterOptionTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterActive === true && styles.filterOptionActive]}
                                onPress={() => setFilterActive(true)}
                            >
                                <Text style={[styles.filterOptionText, filterActive === true && styles.filterOptionTextActive]}>
                                    Active
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.filterOption, filterActive === false && styles.filterOptionActive]}
                                onPress={() => setFilterActive(false)}
                            >
                                <Text style={[styles.filterOptionText, filterActive === false && styles.filterOptionTextActive]}>
                                    Inactive
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Version:</Text>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterOption, filterVersion === null && styles.filterOptionActive]}
                                onPress={() => setFilterVersion(null)}
                            >
                                <Text style={[styles.filterOptionText, filterVersion === null && styles.filterOptionTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {versions.map(version => (
                                <TouchableOpacity
                                    key={version}
                                    style={[styles.filterOption, filterVersion === version && styles.filterOptionActive]}
                                    onPress={() => setFilterVersion(version)}
                                >
                                    <Text style={[styles.filterOptionText, filterVersion === version && styles.filterOptionTextActive]}>
                                        {version}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                        <Text style={styles.clearFiltersText}>Clear Filters</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Terms List */}
            <FlatList
                data={filteredAndSortedTerms}
                renderItem={renderTermItem}
                keyExtractor={(item) => item.id}
                style={styles.termsList}
                contentContainerStyle={styles.termsListContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={renderEmptyState}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundSecondary,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    statsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 12,
    },
    controlsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    searchBar: {
        marginBottom: 12,
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.card,
        borderRadius: 8,
        gap: 8,
    },
    filterButtonActive: {
        backgroundColor: colors.primary + '20',
    },
    filterButtonText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: colors.primary,
    },
    sortButton: {
        padding: 8,
        backgroundColor: colors.card,
        borderRadius: 8,
    },
    viewButton: {
        padding: 8,
        backgroundColor: colors.card,
        borderRadius: 8,
    },
    viewButtonActive: {
        backgroundColor: colors.primary + '20',
    },
    filtersPanel: {
        backgroundColor: colors.card,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    filterRow: {
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 6,
    },
    filterOptionActive: {
        backgroundColor: colors.primary,
    },
    filterOptionText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    filterOptionTextActive: {
        color: colors.card,
    },
    clearFiltersButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.error + '20',
        borderRadius: 8,
    },
    clearFiltersText: {
        fontSize: 14,
        color: colors.error,
        fontWeight: '500',
    },
    termsList: {
        flex: 1,
    },
    termsListContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    termItem: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    termContent: {
        padding: 16,
    },
    termHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    termIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    termInfo: {
        flex: 1,
        gap: 4,
    },
    termTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    termVersion: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    termMeta: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    termStatus: {
        marginLeft: 8,
    },
    statusActive: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '10',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
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
        gap: 4,
    },
    statusInactiveText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '500',
    },
    termDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 12,
    },
    termFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    termDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    termDateText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    deleteButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.error + '20',
        borderRadius: 6,
    },
    deleteButtonText: {
        fontSize: 12,
        color: colors.error,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 64,
        gap: 16,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
    },
    emptyStateText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
    },
    emptyStateButton: {
        marginTop: 16,
    },
    noPermissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    noPermissionText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
}); 