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
    is_active: boolean;
    order_index: number;
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
export type ContentTab = 'islands' | 'zones' | 'faq' | 'content' | 'translations';

// Filter Types
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
    translations: {
        language_code?: string;
        is_active?: boolean;
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
    faqs: boolean;
    faqCategories: boolean;
    terms: boolean;
    translations: boolean;
    promotions: boolean;
    announcements: boolean;
}

// Statistics Types
export interface ContentStats {
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
    translations: {
        total: number;
        by_language: Record<string, number>;
        completion_rate: Record<string, number>;
    };
}

// Form Validation Types
export interface ValidationError {
    field: string;
    message: string;
}

export interface FormValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

