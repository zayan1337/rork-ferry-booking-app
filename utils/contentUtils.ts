import { Dimensions } from 'react-native';
import {
    TermsAndConditions,
    Promotion,
    PromotionFormData,
    TermsFormData,
} from '@/types/content';

const { width: screenWidth } = Dimensions.get('window');

// ============================================================================
// RESPONSIVE UTILITIES
// ============================================================================

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

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const validateRequired = (value: string | undefined | null, fieldName: string): string | null => {
    if (!value || value.trim() === '') {
        return `${fieldName} is required`;
    }
    return null;
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

export const getTermsByVersion = (terms: TermsAndConditions[], version: string): TermsAndConditions[] => {
    return terms.filter(term => term.version === version);
};

export const getActiveTerms = (terms: TermsAndConditions[]): TermsAndConditions[] => {
    return terms.filter(term => term.is_active);
};

export const getActivePromotions = (promotions: Promotion[]): Promotion[] => {
    return promotions.filter(promotion => promotion.is_active);
};

export const getCurrentPromotions = (promotions: Promotion[]): Promotion[] => {
    const now = new Date();
    return promotions.filter(promotion => {
        const start = new Date(promotion.start_date);
        const end = new Date(promotion.end_date);
        return start <= now && end >= now && promotion.is_active;
    });
};

export const getUpcomingPromotions = (promotions: Promotion[]): Promotion[] => {
    const now = new Date();
    return promotions.filter(promotion => {
        const start = new Date(promotion.start_date);
        return start > now && promotion.is_active;
    });
};

export const getLatestTerms = (terms: TermsAndConditions[]): TermsAndConditions | null => {
    if (terms.length === 0) return null;

    const activeTerms = getActiveTerms(terms);
    if (activeTerms.length === 0) return null;

    return sortTerms(activeTerms, 'effective_date', 'desc')[0];
};

export const validateTermsUniqueness = (terms: TermsAndConditions[], newTitle: string, newVersion: string, excludeId?: string): boolean => {
    return !terms.some(term =>
        term.id !== excludeId &&
        term.title.toLowerCase() === newTitle.toLowerCase() &&
        term.version === newVersion
    );
};

export const validatePromotionUniqueness = (promotions: Promotion[], newName: string, excludeId?: string): boolean => {
    return !promotions.some(promotion =>
        promotion.id !== excludeId &&
        promotion.name.toLowerCase() === newName.toLowerCase()
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

export const formatPromotionsForExport = (promotions: Promotion[]) => {
    return promotions.map(promotion => ({
        Name: promotion.name,
        Description: promotion.description || '',
        'Discount (%)': promotion.discount_percentage,
        'Start Date': new Date(promotion.start_date).toLocaleDateString(),
        'End Date': new Date(promotion.end_date).toLocaleDateString(),
        'First Time Only': promotion.is_first_time_booking_only ? 'Yes' : 'No',
        Status: promotion.is_active ? 'Active' : 'Inactive',
        'Created At': new Date(promotion.created_at).toLocaleDateString(),
        'Updated At': promotion.updated_at ? new Date(promotion.updated_at).toLocaleDateString() : 'N/A',
    }));
};

// ============================================================================
// GENERAL HELPER UTILITIES
// ============================================================================

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

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

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