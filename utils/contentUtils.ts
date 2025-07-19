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
    TermsAndConditions,
    PromotionFormData,
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

// ============================================================================
// TERMS AND CONDITIONS VALIDATION
// ============================================================================

export const validateTermsData = (data: {
    title: string;
    content: string;
    version: string;
    effective_date: string;
}): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Title validation
    if (!data.title || data.title.trim().length === 0) {
        errors.title = 'Title is required';
    } else if (data.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters long';
    } else if (data.title.trim().length > 200) {
        errors.title = 'Title must be no more than 200 characters long';
    }

    // Content validation
    if (!data.content || data.content.trim().length === 0) {
        errors.content = 'Content is required';
    } else if (data.content.trim().length < 10) {
        errors.content = 'Content must be at least 10 characters long';
    } else if (data.content.trim().length > 50000) {
        errors.content = 'Content must be no more than 50,000 characters long';
    }

    // Version validation
    if (!data.version || data.version.trim().length === 0) {
        errors.version = 'Version is required';
    } else if (data.version.trim().length < 1) {
        errors.version = 'Version must be at least 1 character long';
    } else if (data.version.trim().length > 20) {
        errors.version = 'Version must be no more than 20 characters long';
    }

    // Effective date validation
    if (!data.effective_date) {
        errors.effective_date = 'Effective date is required';
    } else {
        const date = new Date(data.effective_date);
        if (isNaN(date.getTime())) {
            errors.effective_date = 'Please enter a valid date';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ============================================================================
// TRANSLATION VALIDATION
// ============================================================================

export const validateTranslationData = (data: {
    key: string;
    language_code: string;
    translation: string;
}): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Key validation
    if (!data.key || data.key.trim().length === 0) {
        errors.key = 'Key is required';
    } else if (data.key.trim().length < 2) {
        errors.key = 'Key must be at least 2 characters long';
    } else if (data.key.trim().length > 255) {
        errors.key = 'Key must be no more than 255 characters long';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(data.key.trim())) {
        errors.key = 'Key can only contain letters, numbers, dots, underscores, and hyphens';
    }

    // Language code validation
    if (!data.language_code || data.language_code.trim().length === 0) {
        errors.language_code = 'Language code is required';
    } else if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(data.language_code)) {
        errors.language_code = 'Language code must be in format "en" or "en-US"';
    }

    // Translation validation
    if (!data.translation || data.translation.trim().length === 0) {
        errors.translation = 'Translation is required';
    } else if (data.translation.trim().length < 1) {
        errors.translation = 'Translation cannot be empty';
    } else if (data.translation.trim().length > 5000) {
        errors.translation = 'Translation must be no more than 5,000 characters long';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ============================================================================
// TERMS AND CONDITIONS SEARCH AND FILTERING
// ============================================================================

export const searchTerms = (terms: TermsAndConditions[], query: string): TermsAndConditions[] => {
    if (!query || query.trim().length === 0) {
        return terms;
    }

    const searchQuery = query.toLowerCase();
    return terms.filter(term =>
        term.title.toLowerCase().includes(searchQuery) ||
        term.content.toLowerCase().includes(searchQuery) ||
        term.version.toLowerCase().includes(searchQuery)
    );
};

export const filterTermsByStatus = (terms: TermsAndConditions[], isActive: boolean): TermsAndConditions[] => {
    return terms.filter(term => term.is_active === isActive);
};

export const filterTermsByVersion = (terms: TermsAndConditions[], version: string): TermsAndConditions[] => {
    return terms.filter(term => term.version === version);
};

export const filterTermsByDateRange = (
    terms: TermsAndConditions[],
    startDate: string,
    endDate: string
): TermsAndConditions[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return terms.filter(term => {
        const effectiveDate = new Date(term.effective_date);
        return effectiveDate >= start && effectiveDate <= end;
    });
};

// ============================================================================
// TRANSLATION SEARCH AND FILTERING
// ============================================================================

export const searchTranslations = (translations: Translation[], query: string): Translation[] => {
    if (!query || query.trim().length === 0) {
        return translations;
    }

    const searchQuery = query.toLowerCase();
    return translations.filter(translation =>
        translation.key.toLowerCase().includes(searchQuery) ||
        translation.translation.toLowerCase().includes(searchQuery) ||
        translation.language_code.toLowerCase().includes(searchQuery) ||
        (translation.context && translation.context.toLowerCase().includes(searchQuery))
    );
};

export const filterTranslationsByStatus = (translations: Translation[], isActive: boolean): Translation[] => {
    return translations.filter(translation => translation.is_active === isActive);
};

export const filterTranslationsByLanguage = (translations: Translation[], languageCode: string): Translation[] => {
    return translations.filter(translation => translation.language_code === languageCode);
};

export const filterTranslationsByContext = (translations: Translation[], context: string): Translation[] => {
    return translations.filter(translation =>
        translation.context && translation.context.toLowerCase().includes(context.toLowerCase())
    );
};

// ============================================================================
// TERMS AND CONDITIONS SORTING
// ============================================================================

export const sortTerms = (
    terms: TermsAndConditions[],
    sortBy: 'title' | 'version' | 'effective_date' | 'created_at' | 'updated_at',
    order: 'asc' | 'desc'
): TermsAndConditions[] => {
    const sortedTerms = [...terms];

    sortedTerms.sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        switch (sortBy) {
            case 'title':
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
            case 'version':
                aValue = a.version.toLowerCase();
                bValue = b.version.toLowerCase();
                break;
            case 'effective_date':
                aValue = new Date(a.effective_date);
                bValue = new Date(b.effective_date);
                break;
            case 'created_at':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            case 'updated_at':
                aValue = new Date(a.updated_at || a.created_at);
                bValue = new Date(b.updated_at || b.created_at);
                break;
            default:
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
        }

        if (aValue < bValue) {
            return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return sortedTerms;
};

// ============================================================================
// TRANSLATION SORTING
// ============================================================================

export const sortTranslations = (
    translations: Translation[],
    sortBy: 'key' | 'language_code' | 'translation' | 'created_at' | 'updated_at',
    order: 'asc' | 'desc'
): Translation[] => {
    const sortedTranslations = [...translations];

    sortedTranslations.sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        switch (sortBy) {
            case 'key':
                aValue = a.key.toLowerCase();
                bValue = b.key.toLowerCase();
                break;
            case 'language_code':
                aValue = a.language_code.toLowerCase();
                bValue = b.language_code.toLowerCase();
                break;
            case 'translation':
                aValue = a.translation.toLowerCase();
                bValue = b.translation.toLowerCase();
                break;
            case 'created_at':
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            case 'updated_at':
                aValue = new Date(a.updated_at || a.created_at);
                bValue = new Date(b.updated_at || b.created_at);
                break;
            default:
                aValue = a.key.toLowerCase();
                bValue = b.key.toLowerCase();
        }

        if (aValue < bValue) {
            return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return sortedTranslations;
};

// ============================================================================
// TERMS AND CONDITIONS STATISTICS
// ============================================================================

export const calculateTermsStats = (terms: TermsAndConditions[]) => {
    const active = terms.filter(term => term.is_active);
    const inactive = terms.filter(term => !term.is_active);
    const versions = [...new Set(terms.map(term => term.version))];
    const currentVersion = versions.sort().reverse()[0] || '';

    // Recently updated (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyUpdated = terms.filter(term => {
        const updatedDate = new Date(term.updated_at || term.created_at);
        return updatedDate >= sevenDaysAgo;
    });

    return {
        total: terms.length,
        active: active.length,
        inactive: inactive.length,
        versions: versions.length,
        currentVersion,
        recentlyUpdated: recentlyUpdated.length,
        byVersion: versions.reduce((acc, version) => {
            acc[version] = terms.filter(term => term.version === version).length;
            return acc;
        }, {} as Record<string, number>),
    };
};

// ============================================================================
// TRANSLATION STATISTICS
// ============================================================================

export const calculateTranslationsStats = (translations: Translation[]) => {
    const active = translations.filter(trans => trans.is_active);
    const inactive = translations.filter(trans => !trans.is_active);
    const languages = [...new Set(translations.map(trans => trans.language_code))];

    // Calculate completeness (percentage of active translations)
    const completeness = translations.length > 0 ?
        Math.round((active.length / translations.length) * 100) : 0;

    // Recently updated (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentlyUpdated = translations.filter(trans => {
        const updatedDate = new Date(trans.updated_at || trans.created_at);
        return updatedDate >= sevenDaysAgo;
    });

    // Translations by language
    const byLanguage = languages.reduce((acc, lang) => {
        const langTranslations = translations.filter(trans => trans.language_code === lang);
        const activeLangTranslations = langTranslations.filter(trans => trans.is_active);
        acc[lang] = {
            total: langTranslations.length,
            active: activeLangTranslations.length,
            completeness: langTranslations.length > 0 ?
                Math.round((activeLangTranslations.length / langTranslations.length) * 100) : 0,
        };
        return acc;
    }, {} as Record<string, { total: number; active: number; completeness: number }>);

    return {
        total: translations.length,
        active: active.length,
        inactive: inactive.length,
        languages: languages.length,
        completeness,
        recentlyUpdated: recentlyUpdated.length,
        byLanguage,
        missingKeys: [], // Would need to compare with a master key list
    };
};

// ============================================================================
// PROMOTION VALIDATION
// ============================================================================

export const validatePromotionData = (data: {
    name: string;
    discount_percentage: number;
    start_date: string;
    end_date: string;
    description?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
        errors.name = 'Promotion name is required';
    } else if (data.name.trim().length < 3) {
        errors.name = 'Promotion name must be at least 3 characters long';
    } else if (data.name.trim().length > 100) {
        errors.name = 'Promotion name must be no more than 100 characters long';
    }

    // Discount percentage validation
    if (typeof data.discount_percentage !== 'number') {
        errors.discount_percentage = 'Discount percentage must be a number';
    } else if (data.discount_percentage <= 0) {
        errors.discount_percentage = 'Discount percentage must be greater than 0';
    } else if (data.discount_percentage > 100) {
        errors.discount_percentage = 'Discount percentage cannot exceed 100%';
    }

    // Start date validation
    if (!data.start_date) {
        errors.start_date = 'Start date is required';
    } else {
        const startDate = new Date(data.start_date);
        if (isNaN(startDate.getTime())) {
            errors.start_date = 'Please enter a valid start date';
        }
    }

    // End date validation
    if (!data.end_date) {
        errors.end_date = 'End date is required';
    } else {
        const endDate = new Date(data.end_date);
        if (isNaN(endDate.getTime())) {
            errors.end_date = 'Please enter a valid end date';
        } else if (data.start_date) {
            const startDate = new Date(data.start_date);
            if (!isNaN(startDate.getTime()) && endDate <= startDate) {
                errors.end_date = 'End date must be after start date';
            }
        }
    }

    // Description validation (optional)
    if (data.description && data.description.trim().length > 500) {
        errors.description = 'Description must be no more than 500 characters long';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ============================================================================
// PROMOTION SEARCH AND FILTERING
// ============================================================================

export const searchPromotions = (promotions: Promotion[], query: string): Promotion[] => {
    if (!query || query.trim().length === 0) {
        return promotions;
    }

    const searchQuery = query.toLowerCase();
    return promotions.filter(promotion =>
        promotion.name.toLowerCase().includes(searchQuery) ||
        (promotion.description && promotion.description.toLowerCase().includes(searchQuery)) ||
        promotion.discount_percentage.toString().includes(searchQuery)
    );
};

export const filterPromotionsByStatus = (promotions: Promotion[], isActive: boolean): Promotion[] => {
    return promotions.filter(promotion => promotion.is_active === isActive);
};

export const filterPromotionsByPeriod = (promotions: Promotion[], period: 'current' | 'upcoming' | 'expired'): Promotion[] => {
    const now = new Date();

    return promotions.filter(promotion => {
        const startDate = new Date(promotion.start_date);
        const endDate = new Date(promotion.end_date);

        switch (period) {
            case 'current':
                return startDate <= now && endDate >= now && promotion.is_active;
            case 'upcoming':
                return startDate > now;
            case 'expired':
                return endDate < now;
            default:
                return true;
        }
    });
};

// ============================================================================
// PROMOTION SORTING
// ============================================================================

export const sortPromotions = (
    promotions: Promotion[],
    sortBy: 'name' | 'discount_percentage' | 'start_date' | 'end_date' | 'created_at',
    order: 'asc' | 'desc'
): Promotion[] => {
    const sortedPromotions = [...promotions];

    sortedPromotions.sort((a, b) => {
        let aValue: string | number | Date;
        let bValue: string | number | Date;

        switch (sortBy) {
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
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
        }

        if (aValue < bValue) {
            return order === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return sortedPromotions;
};

// ============================================================================
// PROMOTION STATISTICS
// ============================================================================

export const calculatePromotionsStats = (promotions: Promotion[]) => {
    const now = new Date();
    const active = promotions.filter(promo => promo.is_active);

    // Calculate status categories
    const current = promotions.filter(promo => {
        const start = new Date(promo.start_date);
        const end = new Date(promo.end_date);
        return start <= now && end >= now && promo.is_active;
    });

    const upcoming = promotions.filter(promo => {
        const start = new Date(promo.start_date);
        return start > now;
    });

    const expired = promotions.filter(promo => {
        const end = new Date(promo.end_date);
        return end < now;
    });

    // Calculate average discount
    const activePromotions = promotions.filter(promo => promo.is_active);
    const averageDiscount = activePromotions.length > 0
        ? Math.round(activePromotions.reduce((sum, promo) => sum + promo.discount_percentage, 0) / activePromotions.length)
        : 0;

    return {
        total: promotions.length,
        active: current.length,
        expired: expired.length,
        upcoming: upcoming.length,
        averageDiscount,
        totalActive: active.length,
        totalInactive: promotions.length - active.length,
        firstTimeOnly: promotions.filter(promo => promo.is_first_time_booking_only).length,
    };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getUniqueTermsVersions = (terms: TermsAndConditions[]): string[] => {
    return [...new Set(terms.map(term => term.version))].sort();
};

export const getUniqueLanguageCodes = (translations: Translation[]): string[] => {
    return [...new Set(translations.map(trans => trans.language_code))].sort();
};

export const getTermsByVersion = (terms: TermsAndConditions[], version: string): TermsAndConditions[] => {
    return terms.filter(term => term.version === version);
};

export const getTranslationsByLanguage = (translations: Translation[], languageCode: string): Translation[] => {
    return translations.filter(trans => trans.language_code === languageCode);
};

export const getActiveTerms = (terms: TermsAndConditions[]): TermsAndConditions[] => {
    return terms.filter(term => term.is_active);
};

export const getActiveTranslations = (translations: Translation[]): Translation[] => {
    return translations.filter(trans => trans.is_active);
};

export const getLatestTerms = (terms: TermsAndConditions[]): TermsAndConditions | null => {
    if (terms.length === 0) return null;

    const activeTerms = getActiveTerms(terms);
    if (activeTerms.length === 0) return null;

    return sortTerms(activeTerms, 'effective_date', 'desc')[0];
};

export const getTranslationByKey = (translations: Translation[], key: string, languageCode: string): Translation | null => {
    return translations.find(trans => trans.key === key && trans.language_code === languageCode) || null;
};

export const validateTermsUniqueness = (terms: TermsAndConditions[], newTitle: string, newVersion: string, excludeId?: string): boolean => {
    return !terms.some(term =>
        term.id !== excludeId &&
        term.title.toLowerCase() === newTitle.toLowerCase() &&
        term.version === newVersion
    );
};

export const validateTranslationUniqueness = (
    translations: Translation[],
    newKey: string,
    newLanguageCode: string,
    excludeId?: string
): boolean => {
    return !translations.some(trans =>
        trans.id !== excludeId &&
        trans.key === newKey &&
        trans.language_code === newLanguageCode
    );
};

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

export const formatTermsForExport = (terms: TermsAndConditions[]) => {
    return terms.map(term => ({
        Title: term.title,
        Content: term.content,
        Version: term.version,
        'Effective Date': new Date(term.effective_date).toLocaleDateString(),
        Status: term.is_active ? 'Active' : 'Inactive',
        'Created At': new Date(term.created_at).toLocaleDateString(),
        'Updated At': term.updated_at ? new Date(term.updated_at).toLocaleDateString() : 'N/A',
    }));
};

export const formatTranslationsForExport = (translations: Translation[]) => {
    return translations.map(trans => ({
        Key: trans.key,
        'Language Code': trans.language_code,
        Translation: trans.translation,
        Context: trans.context || '',
        Status: trans.is_active ? 'Active' : 'Inactive',
        'Created At': new Date(trans.created_at).toLocaleDateString(),
        'Updated At': trans.updated_at ? new Date(trans.updated_at).toLocaleDateString() : 'N/A',
    }));
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