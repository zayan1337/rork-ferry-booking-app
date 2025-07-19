// ============================================================================
// ADMIN MANAGEMENT TYPES
// Consistent type definitions for FAQ, Island, and Zone management
// ============================================================================

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface BaseEntity {
    id: string;
    created_at: string;
    updated_at: string;
}

export interface OrderableEntity extends BaseEntity {
    order_index: number;
}

export interface ActivatableEntity extends BaseEntity {
    is_active: boolean;
}

export interface NamedEntity extends BaseEntity {
    name: string;
}

// ============================================================================
// COMMON PATTERNS
// ============================================================================

export interface SearchFilters {
    search?: string;
    is_active?: boolean | null;
}

export interface SortConfig<T extends string = string> {
    sortBy: T;
    sortOrder: 'asc' | 'desc';
}

export interface LoadingStates {
    [key: string]: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export interface StatsBase {
    total: number;
    active: number;
    inactive: number;
}

// ============================================================================
// FAQ TYPES
// ============================================================================

export interface FAQ extends BaseEntity, OrderableEntity, ActivatableEntity {
    category_id: string;
    question: string;
    answer: string;
    category?: FAQCategory;
}

export interface FAQCategory extends BaseEntity, NamedEntity, OrderableEntity, ActivatableEntity {
    description?: string;
    faq_count?: number;
    active_faq_count?: number;
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

export interface FAQStats extends StatsBase {
    byCategory: Record<string, number>;
    recentlyUpdated: number;
    totalCategories: number;
    activeCategories: number;
}

export interface FAQFilters extends SearchFilters {
    category_id?: string;
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

// ============================================================================
// CONTENT MANAGEMENT TYPES
// ============================================================================

export interface TermsAndConditions extends BaseEntity, ActivatableEntity {
    title: string;
    content: string;
    version: string;
    effective_date: string;
}

export interface TermsFormData {
    title: string;
    content: string;
    version: string;
    effective_date: string;
    is_active: boolean;
}

export interface TermsStats extends StatsBase {
    versions: number;
    recentlyUpdated: number;
    effectiveTerms: number;
}

export interface TermsFilters extends SearchFilters {
    version?: string;
    date_range?: {
        from?: string;
        to?: string;
    };
}

export interface TermsWithDetails extends TermsAndConditions {
    created_by?: string;
    updated_by?: string;
    is_current?: boolean;
}

export interface Promotion extends BaseEntity, ActivatableEntity, NamedEntity {
    description?: string;
    discount_percentage: number;
    start_date: string;
    end_date: string;
    is_first_time_booking_only: boolean;
    route_ids?: string[];
}

export interface PromotionFormData {
    name: string;
    description?: string;
    discount_percentage: number;
    start_date: string;
    end_date: string;
    is_first_time_booking_only: boolean;
    is_active: boolean;
    route_ids?: string[];
}

export interface PromotionStats extends StatsBase {
    currentPromotions: number;
    upcomingPromotions: number;
    expiredPromotions: number;
    avgDiscount: number;
}

export interface PromotionFilters extends SearchFilters {
    status?: 'current' | 'upcoming' | 'expired';
    discount_range?: {
        min?: number;
        max?: number;
    };
}

export interface PromotionWithDetails extends Promotion {
    route_names?: string[];
    usage_count?: number;
    revenue_impact?: number;
}

// ============================================================================
// ISLAND MANAGEMENT TYPES
// ============================================================================

export interface Island extends BaseEntity, ActivatableEntity, NamedEntity {
    zone: string; // Legacy field for backward compatibility
    zone_id?: string;
    // Zone information for compatibility with existing components
    zone_info?: {
        id: string;
        name: string;
        code: string;
        description: string;
        is_active: boolean;
    } | null;
    zone_name?: string; // Additional compatibility field
    // Statistics fields (may be included when fetched from views)
    total_routes?: number;
    active_routes?: number;
    total_trips_30d?: number;
    total_bookings_30d?: number;
    total_revenue_30d?: number;
}

export interface IslandFormData {
    name: string;
    zone_id?: string;
    zone?: string; // Legacy field for backward compatibility
    is_active: boolean;
}

export interface IslandWithDetails extends Island {
    island_count?: number;
    route_count?: number;
    // Additional route and trip statistics
    routes_summary?: {
        total: number;
        active: number;
        revenue_30d: number;
    };
    trips_summary?: {
        total_30d: number;
        upcoming: number;
        completed: number;
    };
}

export interface IslandStats extends StatsBase {
    byZone: Record<string, number>;
    totalRoutes: number;
    activeRoutes: number;
    recentlyUpdated: number;
    // Additional statistics
    avgRoutesPerIsland?: number;
    topZoneByIslands?: { zone: string; count: number };
    totalTrips30d?: number;
    totalRevenue30d?: number;
}

export interface IslandFilters {
    zone_id?: string;
    zone?: string; // Legacy field
    is_active?: boolean;
    has_routes?: boolean;
    created_after?: string;
    created_before?: string;
}

// ============================================================================
// ZONE MANAGEMENT TYPES
// ============================================================================

export interface Zone extends BaseEntity, ActivatableEntity, NamedEntity, OrderableEntity {
    code: string;
    description: string;
    // Statistics from zones_stats_view
    total_islands: number;
    active_islands: number;
    total_routes: number;
    active_routes: number;
    // Additional statistics from zone_detailed_stats_view
    island_names?: string;
    avg_base_fare?: number;
    total_trips_30d?: number;
    trips_7d?: number;
    trips_today?: number;
    total_bookings_30d?: number;
    confirmed_bookings_30d?: number;
    total_revenue_30d?: number;
    booking_conversion_rate_30d?: number;
}

export interface ZoneFormData {
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
    order_index: number;
}

export interface ZoneWithDetails extends Zone {
    // Additional detailed statistics
    routes_summary?: {
        total: number;
        active: number;
        avg_fare: number;
        total_revenue_30d: number;
    };
    trips_summary?: {
        total_30d: number;
        today: number;
        next_7d: number;
    };
    bookings_summary?: {
        total_30d: number;
        confirmed_30d: number;
        conversion_rate: number;
        total_revenue_30d: number;
    };
}

export interface ZoneStats extends StatsBase {
    totalIslands: number;
    activeIslands: number;
    totalRoutes: number;
    activeRoutes: number;
    avgIslandsPerZone: number;
    avgRoutesPerZone: number;
    // Additional analytics
    topZoneByRevenue?: { zone: string; revenue: number };
    topZoneByIslands?: { zone: string; count: number };
    totalTrips30d?: number;
    totalRevenue30d?: number;
}

export interface ZoneFilters {
    is_active?: boolean;
    has_islands?: boolean;
    has_routes?: boolean;
    min_islands?: number;
    max_islands?: number;
    created_after?: string;
    created_before?: string;
}

export interface ZoneActivityLog {
    id: string;
    zone_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    user_id?: string;
    created_at: string;
}

// ============================================================================
// STORE STATE PATTERNS
// ============================================================================

export interface BaseStoreState<T> {
    data: T[];
    currentItem: T | null;
    loading: LoadingStates;
    error: string | null;
    searchQuery: string;
}

export interface OrderableStoreState<T> extends BaseStoreState<T> {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface FilterableStoreState<T, F> extends BaseStoreState<T> {
    filters: F;
}

export interface StatsStoreState<S> {
    stats: S;
}

// ============================================================================
// STORE ACTION PATTERNS
// ============================================================================

export interface BaseCrudActions<T, F> {
    // Data fetching
    fetchAll: () => Promise<void>;
    fetchById: (id: string) => Promise<T | null>;

    // CRUD operations
    create: (data: F) => Promise<T>;
    update: (id: string, data: Partial<F>) => Promise<T>;
    delete: (id: string) => Promise<void>;

    // State management
    setCurrentItem: (item: T | null) => void;
    clearError: () => void;
    setError: (error: string) => void;

    // Search and filter
    setSearchQuery: (query: string) => void;
    clearFilters: () => void;

    // Utility
    refreshAll: () => Promise<void>;
    resetStore: () => void;
}

export interface OrderableActions {
    // Order management
    getAvailableOrderOptions: () => { label: string; value: number }[];
    getSuggestedOrder: (excludeId?: string) => number;
    validateOrder: (orderIndex: number, excludeId?: string) => ValidationResult;
    reorder: (items: { id: string; order_index: number }[]) => Promise<void>;
}

export interface SearchableActions<T> {
    // Search functionality
    searchItems: (items: T[], query: string) => T[];
    filterItems: (items: T[], filters: any) => T[];
    sortItems: (items: T[], sortBy: string, order: 'asc' | 'desc') => T[];
}

// ============================================================================
// HOOK RETURN PATTERNS
// ============================================================================

export interface BaseManagementHook<T, F, S> {
    // Data
    items: T[];
    currentItem: T | null;
    loading: LoadingStates;
    error: string | null;
    stats: S;

    // Computed data
    filteredItems: T[];
    sortedItems: T[];

    // Actions
    loadAll: () => Promise<void>;
    getById: (id: string) => T | undefined;
    create: (data: F) => Promise<void>;
    update: (id: string, data: Partial<F>) => Promise<void>;
    remove: (id: string) => Promise<void>;
    refresh: () => Promise<void>;

    // Search and filter
    setSearchQuery: (query: string) => void;
    setFilters: (filters: any) => void;
    clearFilters: () => void;

    // Validation
    validateData: (data: Partial<F>) => ValidationResult;
}

export interface OrderableManagementHook<T, F, S> extends BaseManagementHook<T, F, S> {
    // Order management
    getAvailableOrderOptions: () => { label: string; value: number }[];
    getSuggestedOrder: (excludeId?: string) => number;
    validateOrder: (orderIndex: number, excludeId?: string) => ValidationResult;
    moveItem: (itemId: string, newOrderIndex: number) => Promise<void>;
    reorderItems: (itemOrders: { id: string; order_index: number }[]) => Promise<void>;
}

// ============================================================================
// UTILITY FUNCTION PATTERNS
// ============================================================================

export interface BaseUtilityFunctions<T> {
    search: (items: T[], query: string) => T[];
    filterByStatus: (items: T[], isActive: boolean | null) => T[];
    sort: (items: T[], sortBy: string, order: 'asc' | 'desc') => T[];
    calculateStats: (items: T[]) => any;
    validateData: (data: any) => ValidationResult;
}

export interface OrderableUtilityFunctions<T> extends BaseUtilityFunctions<T> {
    getAvailableOrderPositions: (items: T[]) => { label: string; value: number }[];
    getSuggestedOrderIndex: (items: T[]) => number;
    validateOrderIndex: (orderIndex: number, items: T[], excludeId?: string) => ValidationResult;
    getNextOrderIndex: (items: T[], contextId?: string) => number;
}

// ============================================================================
// COMPONENT PROP PATTERNS
// ============================================================================

export interface BaseItemProps<T> {
    item: T;
    onPress: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
}

export interface BaseFormProps<T, F> {
    initialData?: T;
    onSuccess: (item: T) => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

export interface BaseListProps<T> {
    items: T[];
    loading?: boolean;
    error?: string | null;
    searchQuery?: string;
    onSearch?: (query: string) => void;
    onRefresh?: () => void;
    onItemPress?: (id: string) => void;
    onItemEdit?: (id: string) => void;
    onItemDelete?: (id: string) => void;
    onAdd?: () => void;
} 