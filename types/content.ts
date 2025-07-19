// Zone Types
export interface Zone {
    id: string;
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
    order_index: number;
    created_at: string;
    updated_at: string;
    // Statistics (from view)
    total_islands?: number;
    active_islands?: number;
    total_routes?: number;
    active_routes?: number;
}

export interface ZoneFormData {
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
    order_index: number;
}

export interface ZoneActivityLog {
    id: string;
    zone_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changed_by: string;
    created_at: string;
}

// Island Types (for reference)
export interface Island {
    id: string;
    name: string;
    zone: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface IslandFormData {
    name: string;
    zone: string;
    is_active: boolean;
}

// FAQ Types
export interface FAQ {
    id: string;
    category_id: string;
    question: string;
    answer: string;
    is_active: boolean;
    order_index: number;
    created_at: string;
    updated_at: string;
    category?: FAQCategory;
}

export interface FAQCategory {
    id: string;
    name: string;
    description?: string;
    order_index: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    faq_count?: number;
}

export interface FAQFormData {
    category_id: string;
    question: string;
    answer: string;
    is_active: boolean;
    order_index: number;
}

export interface FAQCategoryFormData {
    name: string;
    description?: string;
    order_index: number;
    is_active: boolean;
}

export interface FAQStats {
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    recentlyUpdated: number;
    totalCategories: number;
    activeCategories: number;
}

export interface FAQFilters {
    category_id?: string;
    is_active?: boolean;
    search?: string;
}

export interface FAQWithDetails extends FAQ {
    category: FAQCategory;
    created_by?: string;
    updated_by?: string;
}

export interface FAQCategoryWithStats extends FAQCategory {
    faq_count: number;
    active_faq_count: number;
    last_updated: string;
}

// Terms and Conditions Types
export interface TermsAndConditions {
    id: string;
    title: string;
    content: string;
    version: string;
    effective_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface TermsFormData {
    title: string;
    content: string;
    version: string;
    effective_date: string;
    is_active: boolean;
}

export interface TermsWithDetails extends TermsAndConditions {
    created_by?: string;
    updated_by?: string;
    word_count?: number;
    is_current?: boolean;
}

// Translation Types
export interface Translation {
    id: string;
    key: string;
    language_code: string;
    translation: string;
    context?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface TranslationFormData {
    key: string;
    language_code: string;
    translation: string;
    context?: string;
    is_active: boolean;
}

export interface TranslationWithDetails extends Translation {
    created_by?: string;
    updated_by?: string;
    character_count?: number;
    is_missing?: boolean;
}

// Promotion Types
export interface Promotion {
    id: string;
    name: string;
    description?: string;
    discount_percentage: number;
    start_date: string;
    end_date: string;
    is_first_time_booking_only: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PromotionFormData {
    name: string;
    description?: string;
    discount_percentage: number;
    start_date: string;
    end_date: string;
    is_first_time_booking_only: boolean;
    is_active: boolean;
}

export interface PromotionStats {
    total: number;
    active: number;
    expired: number;
    upcoming: number;
    averageDiscount: number;
}

// Announcement Types
export interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    target_audience: 'all' | 'customers' | 'agents' | 'admins';
    is_active: boolean;
    published_at?: string;
    expires_at?: string;
    created_at: string;
    updated_at: string;
}

// Content Tab Types
export type ContentTab = 'islands' | 'zones' | 'faq' | 'content' | 'promotions';

// Enhanced Filter Types
export interface ContentFilters {
    islands: {
        zone?: string;
        is_active?: boolean;
    };
    zones: {
        is_active?: boolean;
    };
    faq: {
        category_id?: string;
        is_active?: boolean;
    };
    terms: {
        version?: string;
        is_active?: boolean;
        effective_date_from?: string;
        effective_date_to?: string;
    };
    promotions: {
        is_active?: boolean;
        is_first_time_booking_only?: boolean;
        discount_range?: {
            min: number;
            max: number;
        };
        date_range?: {
            start: string;
            end: string;
        };
    };
}

// Search Query Types
export interface ContentSearchQueries {
    islands: string;
    zones: string;
    faq: string;
    translations: string;
}

// Loading State Types
export interface ContentLoadingStates {
    islands: boolean;
    zones: boolean;
    faq: boolean;
    faqCategories: boolean;
    translations: boolean;
}

// Enhanced Statistics Types
export interface ContentStats {
    totalIslands: number;
    activeIslands: number;
    totalZones: number;
    activeZones: number;
    totalFAQs: number;
    activeFAQs: number;
    totalTranslations: number;
    completedTranslations: number;
    totalPromotions: number;
    activePromotions: number;
    totalAnnouncements: number;
    activeAnnouncements: number;
    totalTerms: number;
    activeTerms: number;
    currentTermsVersion: string;
    totalLanguages: number;
    translationCompleteness: number;
}

// Detailed Content Statistics
export interface DetailedContentStats {
    islands: {
        total: number;
        active: number;
        inactive: number;
        by_zone: Record<string, number>;
    };
    zones: {
        total: number;
        active: number;
        inactive: number;
        with_islands: number;
    };
    faqs: {
        total: number;
        active: number;
        inactive: number;
        by_category: Record<string, number>;
    };
    terms: {
        total: number;
        active: number;
        inactive: number;
        versions: number;
        currentVersion: string;
        recentlyUpdated: number;
        byVersion: Record<string, number>;
    };
    translations: {
        total: number;
        active: number;
        inactive: number;
        languages: number;
        completeness: number;
        recentlyUpdated: number;
        byLanguage: Record<string, { total: number; active: number; completeness: number }>;
        missingKeys: string[];
    };
}

// Content Management View Types (for database views)
export interface ContentWithDetails extends TermsAndConditions {
    created_by_name?: string;
    updated_by_name?: string;
    word_count?: number;
    is_current_version?: boolean;
}

export interface TranslationManagementView extends Translation {
    created_by_name?: string;
    updated_by_name?: string;
    character_count?: number;
    key_usage_count?: number;
}

// Content Management Actions
export type ContentAction =
    | 'create'
    | 'update'
    | 'delete'
    | 'activate'
    | 'deactivate'
    | 'duplicate'
    | 'export'
    | 'import';

// Content Type Definitions
export type ContentType = 'terms' | 'translations' | 'faqs' | 'islands' | 'zones';

// Form Validation Types
export interface ValidationError {
    field: string;
    message: string;
}

export interface FormValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

// Export and Import Types
export interface ExportOptions {
    format: 'json' | 'csv' | 'xlsx';
    includeInactive?: boolean;
    dateRange?: {
        from: string;
        to: string;
    };
    fields?: string[];
}

export interface ImportResult {
    success: number;
    failed: number;
    errors: Array<{
        row: number;
        error: string;
    }>;
}

// Language Support
export interface SupportedLanguage {
    code: string;
    name: string;
    nativeName: string;
    direction: 'ltr' | 'rtl';
    isActive: boolean;
}

// Common content management types
export interface ContentItem {
    id: string;
    title?: string;
    name?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface ContentItemWithActions extends ContentItem {
    canEdit: boolean;
    canDelete: boolean;
    canDuplicate: boolean;
    canActivate: boolean;
}

// Bulk operations
export interface BulkOperation {
    action: ContentAction;
    itemIds: string[];
    options?: Record<string, any>;
}

export interface BulkOperationResult {
    success: number;
    failed: number;
    errors: Array<{
        id: string;
        error: string;
    }>;
}

