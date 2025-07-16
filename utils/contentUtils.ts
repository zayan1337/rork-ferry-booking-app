import { Dimensions } from 'react-native';
import {
    Island,
    Zone,
    FAQ,
    FAQCategory,
    Translation,
    Promotion,
    Announcement,
    ContentStats,
    IslandFormData,
    ZoneFormData,
    FAQFormData,
    TranslationFormData,
} from '@/types/content';

const { width: screenWidth } = Dimensions.get('window');

// Responsive utilities
export const getResponsiveDimensions = () => {
    const isTablet = screenWidth >= 768;
    const isSmallScreen = screenWidth < 480;

    return {
        isTablet,
        isSmallScreen,
        screenWidth,
    };
};

export const getResponsivePadding = () => {
    const { isTablet, isSmallScreen } = getResponsiveDimensions();

    if (isTablet) {
        return { paddingHorizontal: 32, paddingVertical: 24 };
    } else if (isSmallScreen) {
        return { paddingHorizontal: 12, paddingVertical: 16 };
    } else {
        return { paddingHorizontal: 16, paddingVertical: 20 };
    }
};

export const getResponsiveLayout = (width: number) => {
    const isTablet = width >= 768;
    const isSmallScreen = width < 480;

    return {
        isTablet,
        isSmallScreen,
        containerStyle: {
            flex: 1,
            backgroundColor: '#f8f9fa',
        },
        contentStyle: {
            paddingHorizontal: isTablet ? 32 : isSmallScreen ? 12 : 16,
            paddingVertical: isTablet ? 24 : isSmallScreen ? 16 : 20,
        },
        cardStyle: {
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: isTablet ? 24 : isSmallScreen ? 16 : 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
        },
        sectionStyle: {
            marginBottom: isTablet ? 32 : isSmallScreen ? 20 : 24,
        },
        gridColumns: isTablet ? 2 : 1,
        iconSize: isTablet ? 24 : isSmallScreen ? 18 : 20,
        fontSize: {
            title: isTablet ? 28 : isSmallScreen ? 22 : 24,
            heading: isTablet ? 20 : isSmallScreen ? 16 : 18,
            body: isTablet ? 16 : isSmallScreen ? 14 : 15,
            caption: isTablet ? 14 : isSmallScreen ? 12 : 13,
        },
    };
};

// Validation utilities
export const validateRequired = (value: string | undefined | null, fieldName: string): string | null => {
    if (!value || value.trim() === '') {
        return `${fieldName} is required`;
    }
    return null;
};

// Zone utilities
export const getZoneColor = (zone: string): string => {
    switch (zone.toLowerCase()) {
        case 'male':
            return '#4A90E2';
        case 'north':
            return '#007AFF';
        case 'south':
            return '#FF9500';
        case 'central':
            return '#34C759';
        default:
            return '#8E8E93';
    }
};

export const getZoneLabel = (zone: string): string => {
    switch (zone.toLowerCase()) {
        case 'male':
            return 'Male Zone';
        case 'north':
            return 'North Zone';
        case 'south':
            return 'South Zone';
        case 'central':
            return 'Central Zone';
        default:
            return zone;
    }
};

export const getZoneIcon = (zone: string): string => {
    switch (zone.toLowerCase()) {
        case 'male':
            return '🏙️';
        case 'north':
            return '🏔️';
        case 'south':
            return '🏖️';
        case 'central':
            return '🏝️';
        default:
            return '📍';
    }
};

// Island utilities
export const formatIslandName = (name: string): string => {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export const getIslandsByZone = (islands: Island[]) => {
    const zones = islands.reduce((acc, island) => {
        if (!acc[island.zone]) {
            acc[island.zone] = [];
        }
        acc[island.zone].push(island);
        return acc;
    }, {} as Record<string, Island[]>);

    return zones;
};

export const sortIslands = (islands: Island[], sortBy: 'name' | 'zone' | 'created_at', sortOrder: 'asc' | 'desc') => {
    return [...islands].sort((a, b) => {
        let aValue: any = a[sortBy];
        let bValue: any = b[sortBy];

        if (sortBy === 'created_at') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        } else if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }

        if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
};

// FAQ utilities
export const formatFAQsByCategory = (faqs: FAQ[], categories: FAQCategory[]) => {
    const categorizedFAQs = categories.map(category => ({
        category,
        faqs: faqs.filter(faq => faq.category_id === category.id),
    }));

    return categorizedFAQs;
};

export const searchFAQs = (faqs: FAQ[], query: string) => {
    if (!query.trim()) return faqs;

    const lowerQuery = query.toLowerCase();
    return faqs.filter(faq =>
        faq.question.toLowerCase().includes(lowerQuery) ||
        faq.answer.toLowerCase().includes(lowerQuery)
    );
};

export const getNextFAQOrderIndex = (faqs: FAQ[], categoryId: string) => {
    const categoryFAQs = faqs.filter(faq => faq.category_id === categoryId);
    const maxIndex = Math.max(...categoryFAQs.map(faq => faq.order_index), 0);
    return maxIndex + 1;
};

// Translation utilities
export const getLanguageFlag = (languageCode: string): string => {
    const flags: Record<string, string> = {
        'en': '🇬🇧',
        'dv': '🇲🇻',
        'ar': '🇸🇦',
        'hi': '🇮🇳',
    };
    return flags[languageCode] || '🌐';
};

export const getLanguageName = (languageCode: string): string => {
    const languages: Record<string, string> = {
        'en': 'English',
        'dv': 'Dhivehi',
        'ar': 'Arabic',
        'hi': 'Hindi',
    };
    return languages[languageCode] || languageCode.toUpperCase();
};

export const getTranslationCompleteness = (translations: Translation[]) => {
    const uniqueKeys = [...new Set(translations.map(t => t.key))];
    const languages = [...new Set(translations.map(t => t.language_code))];

    const completeness = languages.map(lang => {
        const langTranslations = translations.filter(t => t.language_code === lang);
        const percentage = (langTranslations.length / uniqueKeys.length) * 100;

        return {
            language: getLanguageName(lang),
            code: lang,
            flag: getLanguageFlag(lang),
            completed: langTranslations.length,
            total: uniqueKeys.length,
            percentage: Math.round(percentage),
        };
    });

    return completeness;
};

export const getMissingTranslations = (translations: Translation[], targetLanguage: string) => {
    const allKeys = [...new Set(translations.map(t => t.key))];
    const targetLanguageKeys = new Set(
        translations
            .filter(t => t.language_code === targetLanguage)
            .map(t => t.key)
    );

    return allKeys.filter(key => !targetLanguageKeys.has(key));
};

// Validation utilities
export const validateIslandForm = (data: IslandFormData): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
        errors.push('Island name must be at least 2 characters long');
    }

    if (!data.zone) {
        errors.push('Zone is required');
    }

    if (!['male', 'north', 'south', 'central'].includes(data.zone)) {
        errors.push('Invalid zone selected');
    }

    return errors;
};

export const validateZoneForm = (data: ZoneFormData): string[] => {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 2) {
        errors.push('Zone name must be at least 2 characters long');
    }

    if (data.color && !isValidHexColor(data.color)) {
        errors.push('Invalid color format');
    }

    return errors;
};

export const validateFAQForm = (data: FAQFormData): string[] => {
    const errors: string[] = [];

    if (!data.question || data.question.trim().length < 10) {
        errors.push('Question must be at least 10 characters long');
    }

    if (!data.answer || data.answer.trim().length < 10) {
        errors.push('Answer must be at least 10 characters long');
    }

    if (!data.category_id) {
        errors.push('Category is required');
    }

    return errors;
};

export const validateTranslationForm = (data: TranslationFormData): string[] => {
    const errors: string[] = [];

    if (!data.key || data.key.trim().length < 2) {
        errors.push('Translation key must be at least 2 characters long');
    }

    if (!data.language_code) {
        errors.push('Language is required');
    }

    if (!data.translation || data.translation.trim().length < 1) {
        errors.push('Translation text is required');
    }

    return errors;
};

// Helper utilities
export const isValidHexColor = (color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(date);
};

export const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

export const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
        return 'Today';
    } else if (diffInDays === 1) {
        return 'Yesterday';
    } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
};

// Statistics utilities
export const calculateContentStats = (
    islands: Island[],
    zones: Zone[],
    faqs: FAQ[],
    translations: Translation[],
    promotions: Promotion[],
    announcements: Announcement[]
): ContentStats => {
    return {
        totalIslands: islands.length,
        activeIslands: islands.filter(i => i.is_active).length,
        totalZones: zones.length,
        activeZones: zones.filter(z => z.is_active).length,
        totalFAQs: faqs.length,
        activeFAQs: faqs.filter(f => f.is_active).length,
        totalTranslations: translations.length,
        completedTranslations: translations.filter(t => t.is_active).length,
        totalPromotions: promotions.length,
        activePromotions: promotions.filter(p => p.is_active).length,
        totalAnnouncements: announcements.length,
        activeAnnouncements: announcements.filter(a => a.is_active).length,
    };
};

// Search and filter utilities
export const filterContent = <T extends { is_active: boolean }>(
    items: T[],
    searchQuery: string,
    isActiveFilter: boolean | undefined,
    searchFields: (keyof T)[]
): T[] => {
    let filtered = items;

    // Apply search filter
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
            searchFields.some(field => {
                const value = item[field];
                return typeof value === 'string' && value.toLowerCase().includes(query);
            })
        );
    }

    // Apply active status filter
    if (isActiveFilter !== undefined) {
        filtered = filtered.filter(item => item.is_active === isActiveFilter);
    }

    return filtered;
};

// Export utilities
export const exportToCSV = (data: any[], filename: string): string => {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(item =>
            headers.map(header => {
                const value = item[header];
                return typeof value === 'string' ? `"${value}"` : value;
            }).join(',')
        )
    ].join('\n');

    return csvContent;
};

export const exportToJSON = (data: any[], filename: string): string => {
    return JSON.stringify(data, null, 2);
};

// Permissions utilities
export const getContentPermissions = (userRole: string) => {
    const permissions = {
        canViewContent: false,
        canManageIslands: false,
        canManageZones: false,
        canManageFAQs: false,
        canManageTranslations: false,
        canManagePromotions: false,
        canManageAnnouncements: false,
    };

    if (userRole === 'admin') {
        return {
            canViewContent: true,
            canManageIslands: true,
            canManageZones: true,
            canManageFAQs: true,
            canManageTranslations: true,
            canManagePromotions: true,
            canManageAnnouncements: true,
        };
    } else if (userRole === 'captain') {
        return {
            canViewContent: true,
            canManageIslands: false,
            canManageZones: false,
            canManageFAQs: false,
            canManageTranslations: false,
            canManagePromotions: false,
            canManageAnnouncements: false,
        };
    }

    return permissions;
}; 