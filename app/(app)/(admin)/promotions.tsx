import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useContentManagement } from '@/hooks/useContentManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Promotion } from '@/types/content';
import {
    Percent,
    Plus,
    Search,
    Filter,
    SortAsc,
    SortDesc,
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Edit3,
    Trash2,
    Copy,
    MoreVertical,
    ArrowLeft,
} from 'lucide-react-native';

// Components
import PromotionItem from '@/components/admin/PromotionItem';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import EmptyState from '@/components/admin/EmptyState';
import StatCard from '@/components/admin/StatCard';

type SortField = 'name' | 'discount_percentage' | 'start_date' | 'end_date' | 'created_at';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'current' | 'upcoming' | 'expired' | 'active' | 'inactive';

export default function PromotionsScreen() {
    const { canManageContent, canViewContent } = useAdminPermissions();
    const {
        promotions,
        loading,
        error,
        promotionsStats,
        refreshAll,
        deletePromotion,
        duplicatePromotion,
        clearError,
    } = useContentManagement();

    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Initialize data
    useEffect(() => {
        if (canViewContent()) {
            refreshAll();
        }
    }, []);

    // Filter and sort promotions
    const filteredAndSortedPromotions = useMemo(() => {
        let filtered = promotions;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(promotion =>
                promotion.name.toLowerCase().includes(query) ||
                (promotion.description && promotion.description.toLowerCase().includes(query)) ||
                promotion.discount_percentage.toString().includes(query)
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            const now = new Date();
            filtered = filtered.filter(promotion => {
                const start = new Date(promotion.start_date);
                const end = new Date(promotion.end_date);

                switch (statusFilter) {
                    case 'current':
                        return start <= now && end >= now && promotion.is_active;
                    case 'upcoming':
                        return start > now;
                    case 'expired':
                        return end < now;
                    case 'active':
                        return promotion.is_active;
                    case 'inactive':
                        return !promotion.is_active;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        return filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            switch (sortField) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'discount_percentage':
                    aValue = a.discount_percentage;
                    bValue = b.discount_percentage;
                    break;
                case 'start_date':
                    aValue = new Date(a.start_date);
                    bValue = new Date(b.start_date);
                    break;
                case 'end_date':
                    aValue = new Date(a.end_date);
                    bValue = new Date(b.end_date);
                    break;
                case 'created_at':
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
                default:
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [promotions, searchQuery, statusFilter, sortField, sortOrder]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshAll();
        } catch (error) {
            console.error('Error refreshing promotions:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handlePromotionPress = (promotionId: string) => {
        if (canViewContent()) {
            router.push(`./promotion/${promotionId}` as any);
        }
    };

    const handleAddPromotion = () => {
        if (canManageContent()) {
            router.push('./promotion/new' as any);
        } else {
            Alert.alert('Access Denied', "You don't have permission to create promotions.");
        }
    };

    const handleEditPromotion = (promotionId: string) => {
        if (canManageContent()) {
            router.push(`./promotion/edit/${promotionId}` as any);
        } else {
            Alert.alert('Access Denied', "You don't have permission to edit promotions.");
        }
    };

    const handleDeletePromotion = (promotionId: string) => {
        if (!canManageContent()) {
            Alert.alert('Access Denied', "You don't have permission to delete promotions.");
            return;
        }

        const promotion = promotions.find(p => p.id === promotionId);
        if (!promotion) return;

        Alert.alert(
            'Delete Promotion',
            `Are you sure you want to delete "${promotion.name}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deletePromotion(promotionId);
                            Alert.alert('Success', 'Promotion deleted successfully.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete promotion.');
                        }
                    }
                }
            ]
        );
    };

    const handleDuplicatePromotion = async (promotionId: string) => {
        if (!canManageContent()) {
            Alert.alert('Access Denied', "You don't have permission to duplicate promotions.");
            return;
        }

        try {
            await duplicatePromotion(promotionId);
            Alert.alert('Success', 'Promotion duplicated successfully.');
        } catch (error) {
            Alert.alert('Error', 'Failed to duplicate promotion.');
        }
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter('all');
        setSortField('created_at');
        setSortOrder('desc');
    };

    const renderPromotionItem = ({ item, index }: { item: Promotion; index: number }) => (
        <PromotionItem
            key={`promotion-${item.id}-${index}`}
            promotion={item}
            onPress={handlePromotionPress}
            onEdit={canManageContent() ? handleEditPromotion : undefined}
            onDelete={canManageContent() ? handleDeletePromotion : undefined}
            onDuplicate={canManageContent() ? handleDuplicatePromotion : undefined}
            showActions={canManageContent()}
        />
    );

    const renderHeader = () => (
        <View>
            {/* Stats */}
            <View style={styles.statsContainer}>
                <StatCard
                    title="Total Promotions"
                    value={promotionsStats.total.toString()}
                    subtitle={`${promotionsStats.active} active`}
                    icon={<Percent size={20} color={colors.primary} />}
                    trend="neutral"
                />
                <StatCard
                    title="Current Promotions"
                    value={promotionsStats.active.toString()}
                    subtitle={`${promotionsStats.averageDiscount}% avg discount`}
                    icon={<CheckCircle size={20} color={colors.success} />}
                    trend="up"
                />
                <StatCard
                    title="Upcoming"
                    value={promotionsStats.upcoming.toString()}
                    subtitle="Starting soon"
                    icon={<Clock size={20} color={colors.warning} />}
                    trend="neutral"
                />
                <StatCard
                    title="Expired"
                    value={promotionsStats.expired.toString()}
                    subtitle="Past promotions"
                    icon={<XCircle size={20} color={colors.error} />}
                    trend="down"
                />
            </View>

            {/* Search and Filters */}
            <View style={styles.controlsContainer}>
                <SearchBar
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search promotions..."
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
                </View>
            </View>

            {/* Filter Options */}
            {showFilters && (
                <View style={styles.filtersPanel}>
                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Status:</Text>
                        <View style={styles.filterOptions}>
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'current', label: 'Current' },
                                { key: 'upcoming', label: 'Upcoming' },
                                { key: 'expired', label: 'Expired' },
                                { key: 'active', label: 'Active' },
                                { key: 'inactive', label: 'Inactive' },
                            ].map(filter => (
                                <TouchableOpacity
                                    key={filter.key}
                                    style={[
                                        styles.filterOption,
                                        statusFilter === filter.key && styles.filterOptionActive
                                    ]}
                                    onPress={() => setStatusFilter(filter.key as StatusFilter)}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        statusFilter === filter.key && styles.filterOptionTextActive
                                    ]}>
                                        {filter.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        <Text style={styles.filterLabel}>Sort By:</Text>
                        <View style={styles.sortOptions}>
                            {[
                                { key: 'name', label: 'Name' },
                                { key: 'discount_percentage', label: 'Discount' },
                                { key: 'start_date', label: 'Start Date' },
                                { key: 'end_date', label: 'End Date' },
                                { key: 'created_at', label: 'Created' },
                            ].map(sort => (
                                <TouchableOpacity
                                    key={sort.key}
                                    style={[
                                        styles.sortOption,
                                        sortField === sort.key && styles.sortOptionActive
                                    ]}
                                    onPress={() => toggleSort(sort.key as SortField)}
                                >
                                    <Text style={[
                                        styles.sortOptionText,
                                        sortField === sort.key && styles.sortOptionTextActive
                                    ]}>
                                        {sort.label}
                                    </Text>
                                    {sortField === sort.key && (
                                        sortOrder === 'asc' ?
                                            <SortAsc size={16} color={colors.primary} /> :
                                            <SortDesc size={16} color={colors.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                        <Text style={styles.clearFiltersText}>Clear Filters</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderEmptyState = () => (
        <EmptyState
            icon={<Percent size={48} color={colors.textSecondary} />}
            title="No promotions found"
            message={searchQuery || statusFilter !== 'all'
                ? "Try adjusting your search or filter criteria"
                : "Create your first promotion to get started"
            }
            action={canManageContent() && !searchQuery && statusFilter === 'all' ? (
                <Button
                    title="Create Promotion"
                    onPress={handleAddPromotion}
                    icon={<Plus size={16} color={colors.white} />}
                />
            ) : undefined}
        />
    );

    // Permission check
    if (!canViewContent()) {
        return (
            <View style={styles.noPermissionContainer}>
                <EmptyState
                    icon={<Percent size={48} color={colors.warning} />}
                    title="Access Denied"
                    message="You don't have permission to view promotions."
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Promotions',
                    headerShown: true,
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
                                title="Add Promotion"
                                onPress={handleAddPromotion}
                                size="small"
                                icon={<Plus size={16} color={colors.card} />}
                            />
                        ) : null
                    ),
                }}
            />

            {loading.promotions && promotions.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <LoadingSpinner />
                    <Text style={styles.loadingText}>Loading promotions...</Text>
                </View>
            ) : (
                <>
                    {renderHeader()}
                    <FlatList
                        data={filteredAndSortedPromotions}
                        renderItem={renderPromotionItem}
                        keyExtractor={(item) => item.id}
                        style={styles.promotionsList}
                        contentContainerStyle={styles.promotionsListContent}
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
                        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                    />
                </>
            )}
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
    sortOptions: {
        gap: 8,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortOptionActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    sortOptionText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    sortOptionTextActive: {
        color: colors.primary,
    },
    promotionsList: {
        flex: 1,
    },
    promotionsListContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    itemSeparator: {
        height: 12,
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
    noPermissionContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
}); 