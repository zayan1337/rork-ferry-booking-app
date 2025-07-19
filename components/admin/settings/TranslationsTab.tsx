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
import { useTranslationStore } from '@/store/admin/translationStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Translation } from '@/types/content';
import {
    Languages,
    Plus,
    Eye,
    AlertTriangle,
    Globe,
} from 'lucide-react-native';

// Components
import TranslationItem from '@/components/admin/TranslationItem';
import Button from '@/components/admin/Button';
import LoadingSpinner from '@/components/admin/LoadingSpinner';

interface TranslationsTabProps {
    isActive: boolean;
    searchQuery?: string;
}

const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'dv', name: 'Dhivehi', flag: '🇲🇻' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
];

const TranslationsTab: React.FC<TranslationsTabProps> = ({ isActive, searchQuery = "" }) => {
    const { canManageTranslations, canViewTranslations } = useAdminPermissions();
    const {
        translations,
        loading,
        error,
        fetchTranslations,
        deleteTranslation,
        setLanguageFilter,
        clearFilters,
    } = useTranslationStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [hasInitialized, setHasInitialized] = useState(false);

    // Memoize permission check results
    const hasViewPermission = useMemo(() => canViewTranslations(), [canViewTranslations]);
    const hasManagePermission = useMemo(() => canManageTranslations(), [canManageTranslations]);

    // Initialize data when tab becomes active - only once
    useEffect(() => {
        if (isActive && hasViewPermission && !hasInitialized) {
            fetchTranslations().finally(() => {
                setHasInitialized(true);
            });
        }
    }, [isActive, hasViewPermission, hasInitialized]); // Removed fetchTranslations to prevent infinite loops

    // Apply language filter when language changes
    useEffect(() => {
        setLanguageFilter(selectedLanguage);
    }, [selectedLanguage]); // Removed setLanguageFilter function dependency

    // Filter translations based on search query and selected language
    const filteredTranslations = useMemo(() => {
        let filtered = translations.filter(translation =>
            translation.language_code === selectedLanguage
        );

        if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(translation =>
                translation.key.toLowerCase().includes(query) ||
                translation.translation.toLowerCase().includes(query) ||
                (translation.context && translation.context.toLowerCase().includes(query))
            );
        }

        return filtered;
    }, [translations, selectedLanguage, searchQuery]);

    // Preview items (first 4)
    const previewItems = useMemo(() => {
        return filteredTranslations.slice(0, 4);
    }, [filteredTranslations]);

    // Get language statistics
    const languageStats = useMemo(() => {
        return SUPPORTED_LANGUAGES.map(lang => {
            const count = translations.filter(t => t.language_code === lang.code).length;
            return {
                ...lang,
                count,
                isSelected: lang.code === selectedLanguage
            };
        });
    }, [translations, selectedLanguage]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await fetchTranslations();
        } catch (error) {
            console.error("Failed to refresh translations:", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddTranslation = () => {
        if (!hasManagePermission) {
            Alert.alert("Access Denied", "You don't have permission to create translations.");
            return;
        }
        router.push("../translation/new" as any);
    };

    const handleViewAllTranslations = () => {
        router.push("../translations" as any);
    };

    const handleTranslationPress = (translationId: string) => {
        if (!hasViewPermission) return;
        router.push(`../translation/${translationId}` as any);
    };

    const handleEdit = (translationId: string) => {
        if (!hasManagePermission) return;
        router.push(`../translation/edit/${translationId}` as any);
    };

    const handleDelete = async (translationId: string) => {
        if (!hasManagePermission) {
            Alert.alert("Access Denied", "You don't have permission to delete translations.");
            return;
        }

        const translation = translations.find(t => t.id === translationId);
        if (!translation) return;

        Alert.alert(
            "Delete Translation",
            `Are you sure you want to delete the translation for "${translation.key}"? This action cannot be undone.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteTranslation(translationId);
                            Alert.alert("Success", "Translation deleted successfully.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete translation.");
                        }
                    }
                }
            ]
        );
    };

    // Permission check
    if (!hasViewPermission) {
        return (
            <View style={styles.noPermissionContainer}>
                <View style={styles.noPermissionIcon}>
                    <AlertTriangle size={48} color={colors.warning} />
                </View>
                <Text style={styles.noPermissionTitle}>Access Denied</Text>
                <Text style={styles.noPermissionText}>
                    You don't have permission to view translations.
                </Text>
            </View>
        );
    }

    // Loading state - simplified
    if (loading.translations && translations.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <LoadingSpinner />
                <Text style={styles.loadingText}>Loading translations...</Text>
            </View>
        );
    }

    const renderHeader = () => (
        <View style={styles.sectionContent}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                    <View style={styles.sectionTitleContainer}>
                        <View style={styles.sectionIcon}>
                            <Languages size={20} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={styles.sectionTitle}>Translations Management</Text>
                            <Text style={styles.sectionSubtitle}>
                                {filteredTranslations.length} translations for {SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                            </Text>
                        </View>
                    </View>
                </View>
                {hasManagePermission && (
                    <View style={styles.sectionHeaderButton}>
                        <Button
                            title="Add Translation"
                            onPress={handleAddTranslation}
                            size="small"
                            variant="outline"
                            icon={<Plus size={16} color={colors.primary} />}
                        />
                    </View>
                )}
            </View>

            {/* Language Selector */}
            <View style={styles.languageSelector}>
                <Text style={styles.languageSelectorTitle}>Select Language</Text>
                <View style={styles.languageButtons}>
                    {languageStats.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={[
                                styles.languageButton,
                                lang.isSelected && styles.languageButtonActive
                            ]}
                            onPress={() => setSelectedLanguage(lang.code)}
                        >
                            <Text style={styles.languageFlag}>{lang.flag}</Text>
                            <Text style={[
                                styles.languageName,
                                lang.isSelected && styles.languageNameActive
                            ]}>
                                {lang.name}
                            </Text>
                            <View style={[
                                styles.languageBadge,
                                lang.isSelected && styles.languageBadgeActive
                            ]}>
                                <Text style={[
                                    styles.languageBadgeText,
                                    lang.isSelected && styles.languageBadgeTextActive
                                ]}>
                                    {lang.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );

    const renderTranslationItem = ({ item, index }: { item: Translation; index: number }) => (
        <TranslationItem
            key={`translation-${item.id}-${index}`}
            translation={item}
            onPress={handleTranslationPress}
            onEdit={hasManagePermission ? handleEdit : undefined}
            onDelete={hasManagePermission ? handleDelete : undefined}
            showActions={hasManagePermission}
        />
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
                <Globe size={48} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyStateTitle}>No Translations Found</Text>
            <Text style={styles.emptyStateText}>
                {searchQuery
                    ? 'Try adjusting your search terms'
                    : `No translations available for ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name}`
                }
            </Text>
        </View>
    );

    const renderFooter = () => {
        if (filteredTranslations.length <= 4) return null;

        return (
            <View style={styles.footerContainer}>
                <Text style={styles.previewText}>
                    Showing {previewItems.length} of {filteredTranslations.length} translations
                </Text>
                <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={handleViewAllTranslations}
                >
                    <Text style={styles.viewAllText}>View All Translations</Text>
                    <Eye size={16} color={colors.primary} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={previewItems}
                renderItem={renderTranslationItem}
                keyExtractor={(item, index) => `translation-${item.id}-${index}`}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderFooter}
                contentContainerStyle={previewItems.length === 0 ? styles.emptyContentContainer : styles.contentContainer}
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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    noPermissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    noPermissionIcon: {
        marginBottom: 16,
    },
    noPermissionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
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
    sectionContent: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderContent: {
        flex: 1,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sectionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    sectionHeaderButton: {
        marginLeft: 16,
    },
    languageSelector: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    languageSelectorTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    languageButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    languageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 8,
        minWidth: 120,
    },
    languageButtonActive: {
        backgroundColor: colors.primary + '15',
        borderColor: colors.primary,
    },
    languageFlag: {
        fontSize: 18,
    },
    languageName: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textSecondary,
        flex: 1,
    },
    languageNameActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    languageBadge: {
        backgroundColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    languageBadgeActive: {
        backgroundColor: colors.primary + '30',
    },
    languageBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    languageBadgeTextActive: {
        color: colors.primary,
    },
    contentContainer: {
        padding: 16,
    },
    emptyContentContainer: {
        flexGrow: 1,
        padding: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
    },
    emptyStateIcon: {
        marginBottom: 16,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 12,
    },
    previewText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
});

export default TranslationsTab; 
