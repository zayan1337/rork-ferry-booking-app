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
import { useContentStore } from "@/store/admin/contentStore";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Translation } from "@/types/content";
import {
    ArrowLeft,
    Plus,
    Globe,
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
import TranslationItem from "@/components/admin/TranslationItem";

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export default function TranslationsScreen() {
    const { canViewContent, canManageContent } = useAdminPermissions();

    const {
        translations,
        loading,
        fetchTranslations,
        deleteTranslation,
    } = useContentStore();

    // State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterLanguage, setFilterLanguage] = useState<string | null>(null);
    const [filterContext, setFilterContext] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'key' | 'language_code' | 'context' | 'created_at'>('key');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");

    useEffect(() => {
        if (canViewContent()) {
            fetchTranslations();
        }
    }, []);

    // Filter and sort translations
    const filteredAndSortedTranslations = React.useMemo(() => {
        let filtered = translations;

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(translation =>
                translation.key.toLowerCase().includes(query) ||
                translation.translation.toLowerCase().includes(query) ||
                translation.language_code.toLowerCase().includes(query) ||
                (translation.context && translation.context.toLowerCase().includes(query))
            );
        }

        // Apply language filter
        if (filterLanguage) {
            filtered = filtered.filter(translation => translation.language_code === filterLanguage);
        }

        // Apply context filter
        if (filterContext) {
            filtered = filtered.filter(translation => translation.context === filterContext);
        }

        // Sort translations
        const sorted = [...filtered].sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'key':
                    aValue = a.key.toLowerCase();
                    bValue = b.key.toLowerCase();
                    break;
                case 'language_code':
                    aValue = a.language_code.toLowerCase();
                    bValue = b.language_code.toLowerCase();
                    break;
                case 'context':
                    aValue = (a.context || '').toLowerCase();
                    bValue = (b.context || '').toLowerCase();
                    break;
                case 'created_at':
                    aValue = new Date(a.created_at).getTime();
                    bValue = new Date(b.created_at).getTime();
                    break;
                default:
                    return 0;
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return sorted;
    }, [translations, searchQuery, filterLanguage, filterContext, sortBy, sortOrder]);

    // Get unique values for filters
    const uniqueLanguages = React.useMemo(() => {
        const languages = [...new Set(translations.map(t => t.language_code))];
        return languages.sort();
    }, [translations]);

    const uniqueContexts = React.useMemo(() => {
        const contexts = [...new Set(translations.map(t => t.context).filter(Boolean))];
        return contexts.sort();
    }, [translations]);

    // Calculate stats
    const stats = React.useMemo(() => {
        return {
            total: translations.length,
            languages: uniqueLanguages.length,
            contexts: uniqueContexts.length,
            completion: translations.length > 0 ? Math.round((translations.filter(t => t.translation.trim()).length / translations.length) * 100) : 0,
        };
    }, [translations, uniqueLanguages, uniqueContexts]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchTranslations();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleTranslationPress = (translationId: string) => {
        router.push(`./translation/${translationId}` as any);
    };

    const handleEditTranslation = (translationId: string) => {
        if (!canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to edit translations.");
            return;
        }
        router.push(`./translation/edit/${translationId}` as any);
    };

    const handleDeleteTranslation = async (translationId: string) => {
        if (!canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to delete translations.");
            return;
        }

        const translation = translations.find(t => t.id === translationId);
        if (!translation) return;

        Alert.alert(
            "Delete Translation",
            `Are you sure you want to delete the translation for "${translation.key}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTranslation(translationId);
                            Alert.alert("Success", "Translation deleted successfully");
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete translation");
                        }
                    }
                }
            ]
        );
    };

    const handleCreateNew = () => {
        if (!canManageContent()) {
            Alert.alert("Access Denied", "You don't have permission to create translations.");
            return;
        }
        router.push("./translation/new" as any);
    };

    const toggleSortOrder = () => {
        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    };

    const clearFilters = () => {
        setFilterLanguage(null);
        setFilterContext(null);
        setSearchQuery("");
    };

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.container}>
                <Stack.Screen
                    options={{
                        title: "Translations",
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                <View style={styles.noPermissionContainer}>
                    <Globe size={48} color={colors.textSecondary} />
                    <Text style={styles.noPermissionTitle}>Access Denied</Text>
                    <Text style={styles.noPermissionText}>
                        You don't have permission to view translations.
                    </Text>
                </View>
            </View>
        );
    }

    const renderItem = ({ item }: { item: Translation }) => (
        <TranslationItem
            translation={item}
            onPress={handleTranslationPress}
            onEdit={canManageContent() ? handleEditTranslation : undefined}
            onDelete={canManageContent() ? handleDeleteTranslation : undefined}
            showActions={canManageContent()}
        />
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Globe size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Translations Found</Text>
            <Text style={styles.emptyText}>
                {searchQuery || filterLanguage || filterContext
                    ? "No translations match your current filters."
                    : "Get started by creating your first translation."}
            </Text>
            {canManageContent() && !searchQuery && !filterLanguage && !filterContext && (
                <Button
                    title="Create Translation"
                    variant="primary"
                    onPress={handleCreateNew}
                    style={styles.emptyButton}
                    icon={<Plus size={16} color={colors.white} />}
                />
            )}
        </View>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Stats */}
            <View style={styles.statsContainer}>
                <StatCard
                    title="Total Translations"
                    value={stats.total.toString()}
                    subtitle={`${stats.completion}% complete`}
                    icon={<Globe size={20} color={colors.primary} />}
                    trend="neutral"
                />
                <StatCard
                    title="Languages"
                    value={stats.languages.toString()}
                    subtitle={`${stats.contexts} contexts`}
                    icon={<Activity size={20} color={colors.secondary} />}
                    trend="neutral"
                />
            </View>

            {/* Search and Actions */}
            <View style={styles.searchContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search translations..."
                    style={styles.searchBar}
                />
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Filter size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.sortButton}
                    onPress={toggleSortOrder}
                >
                    {sortOrder === 'asc' ? (
                        <SortAsc size={20} color={colors.primary} />
                    ) : (
                        <SortDesc size={20} color={colors.primary} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.viewModeButton}
                    onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                >
                    {viewMode === 'list' ? (
                        <Grid3x3 size={20} color={colors.primary} />
                    ) : (
                        <List size={20} color={colors.primary} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Filters */}
            {showFilters && (
                <View style={styles.filtersContainer}>
                    <Text style={styles.filtersTitle}>Filters</Text>

                    {/* Language Filter */}
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Language:</Text>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterChip, !filterLanguage && styles.filterChipActive]}
                                onPress={() => setFilterLanguage(null)}
                            >
                                <Text style={[styles.filterChipText, !filterLanguage && styles.filterChipTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {uniqueLanguages.map(language => (
                                <TouchableOpacity
                                    key={language}
                                    style={[styles.filterChip, filterLanguage === language && styles.filterChipActive]}
                                    onPress={() => setFilterLanguage(language)}
                                >
                                    <Text style={[styles.filterChipText, filterLanguage === language && styles.filterChipTextActive]}>
                                        {language.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Context Filter */}
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Context:</Text>
                        <View style={styles.filterOptions}>
                            <TouchableOpacity
                                style={[styles.filterChip, !filterContext && styles.filterChipActive]}
                                onPress={() => setFilterContext(null)}
                            >
                                <Text style={[styles.filterChipText, !filterContext && styles.filterChipTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                            {uniqueContexts.map(context => (
                                <TouchableOpacity
                                    key={context}
                                    style={[styles.filterChip, filterContext === context && styles.filterChipActive]}
                                    onPress={() => setFilterContext(context)}
                                >
                                    <Text style={[styles.filterChipText, filterContext === context && styles.filterChipTextActive]}>
                                        {context}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Sort Options */}
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Sort by:</Text>
                        <View style={styles.filterOptions}>
                            {[
                                { key: 'key', label: 'Key' },
                                { key: 'language_code', label: 'Language' },
                                { key: 'context', label: 'Context' },
                                { key: 'created_at', label: 'Date' },
                            ].map(option => (
                                <TouchableOpacity
                                    key={option.key}
                                    style={[styles.filterChip, sortBy === option.key && styles.filterChipActive]}
                                    onPress={() => setSortBy(option.key as any)}
                                >
                                    <Text style={[styles.filterChipText, sortBy === option.key && styles.filterChipTextActive]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Clear Filters */}
                    <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                        <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Action Buttons */}
            {canManageContent() && (
                <View style={styles.actionsContainer}>
                    <Button
                        title="New Translation"
                        variant="primary"
                        onPress={handleCreateNew}
                        icon={<Plus size={16} color={colors.white} />}
                        style={styles.actionButton}
                    />
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: "Translations",
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <ArrowLeft size={24} color={colors.primary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            {loading.translations && translations.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading translations...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredAndSortedTranslations}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={renderEmptyState}
                    contentContainerStyle={filteredAndSortedTranslations.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
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
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    noPermissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    noPermissionText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    headerContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    searchBar: {
        flex: 1,
    },
    filterButton: {
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortButton: {
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    viewModeButton: {
        padding: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filtersContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filtersTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    filterRow: {
        marginBottom: 12,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 8,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    clearFiltersButton: {
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    clearFiltersText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.primary,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    emptyContentContainer: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    emptyButton: {
        minWidth: 160,
    },
}); 