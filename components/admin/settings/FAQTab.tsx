import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useFAQManagement } from '@/hooks/useFAQManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { FAQ, FAQCategory } from '@/types/content';
import {
    HelpCircle,
    Plus,
    Folder,
    MessageSquare,
    AlertTriangle,
} from 'lucide-react-native';

// Components
import FAQItem from '@/components/admin/FAQItem';
import FAQCategoryItem from '@/components/admin/FAQCategoryItem';
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface FAQTabProps {
    isActive: boolean;
    searchQuery?: string;
}

type TabType = 'categories' | 'faqs';

const FAQTab: React.FC<FAQTabProps> = ({ isActive, searchQuery = "" }) => {
    const { canManageSettings } = useAdminPermissions();
    const {
        faqs,
        categories,
        categoriesWithCounts,
        loading,
        error,
        refreshAll,
        deleteCategory,
        deleteFAQ,
    } = useFAQManagement();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('categories');

    // Initialize data when tab becomes active
    useEffect(() => {
        if (isActive && (faqs.length === 0 || categoriesWithCounts.length === 0)) {
            refreshAll();
        }
    }, [isActive, faqs.length, categoriesWithCounts.length, refreshAll]);

    // Filter categories based on search query
    const filteredCategories = useMemo(() => {
        if (!searchQuery) return categoriesWithCounts;

        const query = searchQuery.toLowerCase();
        return categoriesWithCounts.filter(category =>
            category.name.toLowerCase().includes(query)
        );
    }, [categoriesWithCounts, searchQuery]);

    // Filter FAQs based on search query
    const filteredFaqs = useMemo(() => {
        if (!searchQuery) return faqs;

        const query = searchQuery.toLowerCase();
        return faqs.filter(faq =>
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query)
        );
    }, [faqs, searchQuery]);

    // Create preview items based on active tab (first 4 items from filtered results)
    const previewItems = useMemo(() => {
        if (activeTab === 'categories') {
            return filteredCategories.slice(0, 4);
        } else {
            return filteredFaqs.slice(0, 4);
        }
    }, [filteredCategories, filteredFaqs, activeTab]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refreshAll();
        } catch (error) {
            console.error("Failed to refresh FAQ data:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddFAQ = () => {
        if (canManageSettings()) {
            router.push("../faq/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create FAQs.");
        }
    };

    const handleAddCategory = () => {
        if (canManageSettings()) {
            router.push("../faq-categories/new" as any);
        } else {
            Alert.alert("Access Denied", "You don't have permission to create FAQ categories.");
        }
    };

    const handleViewAllFAQs = () => {
        router.push("../faqs" as any);
    };

    const handleFAQPress = (faqId: string) => {
        router.push(`../faq/${faqId}` as any);
    };

    const handleCategoryPress = (categoryId: string) => {
        router.push(`../faq-categories/${categoryId}` as any);
    };

    // Permission check
    if (!canManageSettings()) {
        return (
            <View style={styles.noPermissionContainer}>
                <View style={styles.noPermissionIcon}>
                    <AlertTriangle size={48} color={colors.warning} />
                </View>
                <Text style={styles.noPermissionTitle}>Access Denied</Text>
                <Text style={styles.noPermissionText}>
                    You don't have permission to view FAQ management.
                </Text>
            </View>
        );
    }

    // Loading state
    if (loading && previewItems.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading FAQ data...</Text>
            </View>
        );
    }

    const renderHeader = () => (
        <View style={styles.sectionContent}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                    <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionIcon}>
                            <HelpCircle size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.sectionTitle}>FAQ Management</Text>
                            <Text style={styles.sectionSubtitle}>
                                {searchQuery ?
                                    `${filteredCategories.length} categories, ${filteredFaqs.length} FAQs found` :
                                    `${categoriesWithCounts.length} categories, ${faqs.length} FAQs`
                                }
                            </Text>
                        </View>
                    </View>
                </View>
                {canManageSettings() && (
                    <View style={styles.sectionHeaderButton}>
                        {activeTab === 'categories' ? (
                            <Button
                                title="Add Category"
                                onPress={handleAddCategory}
                                size="small"
                                variant="outline"
                                icon={<Folder size={16} color={colors.primary} />}
                            />
                        ) : (
                            <Button
                                title="Add FAQ"
                                onPress={handleAddFAQ}
                                size="small"
                                variant="outline"
                                icon={<Plus size={16} color={colors.primary} />}
                            />
                        )}
                    </View>
                )}
            </View>

            {/* Tab Toggle */}
            <View style={styles.tabToggleContainer}>
                <TouchableOpacity
                    style={[
                        styles.tabToggle,
                        activeTab === 'categories' && styles.tabToggleActive
                    ]}
                    onPress={() => setActiveTab('categories')}
                >
                    <Folder size={16} color={activeTab === 'categories' ? colors.white : colors.textSecondary} />
                    <Text style={[
                        styles.tabToggleText,
                        activeTab === 'categories' && styles.tabToggleTextActive
                    ]}>
                        FAQ Categories ({searchQuery ? filteredCategories.length : categoriesWithCounts.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tabToggle,
                        activeTab === 'faqs' && styles.tabToggleActive
                    ]}
                    onPress={() => setActiveTab('faqs')}
                >
                    <MessageSquare size={16} color={activeTab === 'faqs' ? colors.white : colors.textSecondary} />
                    <Text style={[
                        styles.tabToggleText,
                        activeTab === 'faqs' && styles.tabToggleTextActive
                    ]}>
                        FAQs ({searchQuery ? filteredFaqs.length : faqs.length})
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: FAQ | (FAQCategory & { faq_count: number; active_faq_count: number }) }) => {
        if (activeTab === 'categories') {
            const category = item as FAQCategory & { faq_count: number; active_faq_count: number };

            return (
                <FAQCategoryItem
                    category={category}
                    faqCount={category.faq_count}
                    onPress={handleCategoryPress}
                />
            );
        } else {
            const faq = item as FAQ;
            return (
                <FAQItem
                    faq={faq}
                    onPress={handleFAQPress}
                />
            );
        }
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
                {activeTab === 'categories' ? (
                    <Folder size={48} color={colors.textSecondary} />
                ) : (
                    <HelpCircle size={48} color={colors.textSecondary} />
                )}
            </View>
            <Text style={styles.emptyStateTitle}>
                No {activeTab === 'categories' ? 'categories' : 'FAQs'} found
            </Text>
            <Text style={styles.emptyStateText}>
                {searchQuery
                    ? "Try adjusting your search terms"
                    : `Start by creating ${activeTab === 'categories' ? 'FAQ categories' : 'FAQs'}`
                }
            </Text>
            {canManageSettings() && !searchQuery && (
                <View style={styles.emptyStateActions}>
                    {activeTab === 'categories' ? (
                        <Button
                            title="Add Category"
                            onPress={handleAddCategory}
                            size="small"
                            variant="outline"
                            icon={<Folder size={16} color={colors.primary} />}
                        />
                    ) : (
                        <Button
                            title="Add FAQ"
                            onPress={handleAddFAQ}
                            size="small"
                            variant="outline"
                            icon={<Plus size={16} color={colors.primary} />}
                        />
                    )}
                </View>
            )}
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer}>
            <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAllFAQs}
            >
                <Text style={styles.viewAllText}>View All FAQs</Text>
                <HelpCircle size={16} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                    <AlertTriangle size={48} color={colors.error} />
                </View>
                <Text style={styles.errorTitle}>Error Loading FAQ Data</Text>
                <Text style={styles.errorText}>{error}</Text>
                <Button
                    title="Retry"
                    onPress={handleRefresh}
                    size="small"
                    variant="outline"
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={previewItems}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${activeTab}-${item.id}-${index}`}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
    },
    sectionContent: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        minHeight: 44,
        paddingHorizontal: 4,
    },
    sectionHeaderContent: {
        flex: 1,
        paddingRight: 8,
    },
    sectionHeaderButton: {
        flexShrink: 0,
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
    tabToggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 16,
    },
    tabToggle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    tabToggleActive: {
        backgroundColor: colors.primary,
    },
    tabToggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tabToggleTextActive: {
        color: colors.white,
    },
    itemSeparator: {
        height: 12,
    },
    footerContainer: {
        paddingVertical: 24,
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
    emptyState: {
        alignItems: "center",
        paddingVertical: 64,
        gap: 16,
    },
    emptyStateIcon: {
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: colors.textSecondary + "10",
        borderRadius: 24,
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
    emptyStateActions: {
        marginTop: 8,
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
    errorContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 64,
        gap: 16,
    },
    errorIcon: {
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        backgroundColor: colors.error + "10",
        borderRadius: 24,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        maxWidth: 250,
        marginBottom: 16,
    },
});

export default FAQTab; 
