import { useMemo } from 'react';
import { useContentStore } from '@/store/admin/contentStore';
import { ContentTab } from '@/types/content';
import { searchFAQs, formatFAQsByCategory } from '@/utils/contentUtils';

export const useContentData = () => {
    const {
        islands,
        zones,
        faqs,
        faqCategories,
        terms,
        translations,
        promotions,
        announcements,
        loading,
        searchQueries,
        filters,
        stats,
        setSearchQuery,
        setFilter,
        refreshData,
    } = useContentStore();

    // Filter and search logic for islands
    const filteredIslands = useMemo(() => {
        let filtered = islands;

        // Search filter
        if (searchQueries.islands) {
            const query = searchQueries.islands.toLowerCase();
            filtered = filtered.filter(
                (island) =>
                    island.name.toLowerCase().includes(query) ||
                    island.zone.toLowerCase().includes(query)
            );
        }

        // Zone filter
        if (filters.islands.zone) {
            filtered = filtered.filter((island) => island.zone === filters.islands.zone);
        }

        // Active status filter
        if (filters.islands.is_active !== undefined) {
            filtered = filtered.filter((island) => island.is_active === filters.islands.is_active);
        }

        return filtered;
    }, [islands, searchQueries.islands, filters.islands]);

    // Filter and search logic for zones
    const filteredZones = useMemo(() => {
        let filtered = zones;

        // Search filter
        if (searchQueries.zones) {
            const query = searchQueries.zones.toLowerCase();
            filtered = filtered.filter(
                (zone) =>
                    zone.name.toLowerCase().includes(query) ||
                    (zone.description && zone.description.toLowerCase().includes(query))
            );
        }

        // Active status filter
        if (filters.zones.is_active !== undefined) {
            filtered = filtered.filter((zone) => zone.is_active === filters.zones.is_active);
        }

        return filtered;
    }, [zones, searchQueries.zones, filters.zones]);

    // Filter and search logic for FAQs
    const filteredFAQs = useMemo(() => {
        let filtered = faqs;

        // Search filter
        if (searchQueries.faq) {
            const query = searchQueries.faq.toLowerCase();
            filtered = filtered.filter(
                (faq) =>
                    faq.question.toLowerCase().includes(query) ||
                    faq.answer.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (filters.faq.category_id) {
            filtered = filtered.filter((faq) => faq.category_id === filters.faq.category_id);
        }

        // Active status filter
        if (filters.faq.is_active !== undefined) {
            filtered = filtered.filter((faq) => faq.is_active === filters.faq.is_active);
        }

        return filtered;
    }, [faqs, searchQueries.faq, filters.faq]);

    // Filter and search logic for translations
    const filteredTranslations = useMemo(() => {
        let filtered = translations;

        // Search filter
        if (searchQueries.translations) {
            const query = searchQueries.translations.toLowerCase();
            filtered = filtered.filter(
                (translation) =>
                    translation.key.toLowerCase().includes(query) ||
                    translation.translation.toLowerCase().includes(query) ||
                    (translation.context && translation.context.toLowerCase().includes(query))
            );
        }

        // Language filter
        if (filters.translations.language_code) {
            filtered = filtered.filter((translation) => translation.language_code === filters.translations.language_code);
        }

        // Active status filter
        if (filters.translations.is_active !== undefined) {
            filtered = filtered.filter((translation) => translation.is_active === filters.translations.is_active);
        }

        return filtered;
    }, [translations, searchQueries.translations, filters.translations]);

    // Get grouped FAQs by category
    const groupedFAQs = useMemo(() => {
        const grouped = faqCategories.reduce((acc, category) => {
            acc[category.id] = {
                category,
                faqs: filteredFAQs.filter((faq) => faq.category_id === category.id),
            };
            return acc;
        }, {} as Record<string, { category: any; faqs: any[] }>);

        return grouped;
    }, [faqCategories, filteredFAQs]);

    // Get supported languages for translations
    const supportedLanguages = useMemo(() => {
        const languages = [...new Set(translations.map((t) => t.language_code))];
        return languages.map((code) => ({
            code,
            name: getLanguageName(code),
        }));
    }, [translations]);

    // Get translation completeness by language
    const translationCompleteness = useMemo(() => {
        const uniqueKeys = [...new Set(translations.map((t) => t.key))];
        const completeness = supportedLanguages.map((lang) => {
            const langTranslations = translations.filter((t) => t.language_code === lang.code);
            const percentage = (langTranslations.length / uniqueKeys.length) * 100;
            return {
                language: lang.name,
                code: lang.code,
                completed: langTranslations.length,
                total: uniqueKeys.length,
                percentage: Math.round(percentage),
            };
        });
        return completeness;
    }, [translations, supportedLanguages]);

    return {
        // Data
        islands,
        zones,
        faqs,
        faqCategories,
        terms,
        translations,
        promotions,
        announcements,

        // Filtered data
        filteredIslands,
        filteredZones,
        filteredFAQs,
        filteredTranslations,
        groupedFAQs,

        // Language data
        supportedLanguages,
        translationCompleteness,

        // State
        loading,
        searchQueries,
        filters,
        stats,

        // Individual stats
        faqStats: {
            total: faqs.length,
            categories: faqCategories.length,
            published: faqs.filter(f => f.is_active).length,
        },
        translationStats: {
            total: translations.length,
            languages: supportedLanguages.length,
            completeness: translationCompleteness,
        },
        contentStats: {
            promotions: promotions.length,
            announcements: announcements.length,
            activePromotions: promotions.filter(p => p.is_active).length,
            activeAnnouncements: announcements.filter(a => a.is_active).length,
        },

        // Actions
        setSearchQuery,
        setFilter,
        refreshData,

        // Search functions
        searchFAQs: (query: string) => searchFAQs(faqs, query),
        filterFAQsByCategory: (categoryId: string, query: string = '') => {
            const categoryFAQs = faqs.filter(faq => faq.category_id === categoryId);
            return query ? searchFAQs(categoryFAQs, query) : categoryFAQs;
        },
        searchTranslations: (query: string) => {
            return translations.filter(t =>
                t.key.toLowerCase().includes(query.toLowerCase()) ||
                t.translation.toLowerCase().includes(query.toLowerCase())
            );
        },
        getTranslationsByLanguage: (language: string, query: string = '') => {
            const langTranslations = translations.filter(t => t.language_code === language);
            return query ? langTranslations.filter(t =>
                t.key.toLowerCase().includes(query.toLowerCase()) ||
                t.translation.toLowerCase().includes(query.toLowerCase())
            ) : langTranslations;
        },
        searchPromotions: (query: string) => {
            return promotions.filter(p =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.description?.toLowerCase().includes(query.toLowerCase())
            );
        },
        searchAnnouncements: (query: string) => {
            return announcements.filter(a =>
                a.title.toLowerCase().includes(query.toLowerCase()) ||
                a.content.toLowerCase().includes(query.toLowerCase())
            );
        },
    };
};

// Helper function to get language name from code
const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
        'en': 'English',
        'dv': 'Dhivehi',
        'ar': 'Arabic',
        'hi': 'Hindi',
    };
    return languages[code] || code.toUpperCase();
};

export default useContentData; 