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
// PERMISSION TYPES
// ============================================================================

export type PermissionLevel = 'read' | 'write' | 'delete' | 'admin';
export type PermissionResource = 'dashboard' | 'bookings' | 'routes' | 'trips' | 'vessels' | 'islands' | 'zones' | 'faq' | 'content' | 'users' | 'agents' | 'passengers' | 'wallets' | 'payments' | 'notifications' | 'bulk_messages' | 'reports' | 'settings' | 'permissions' | 'activity_logs';
export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'manage' | 'export' | 'cancel' | 'send';

export interface Permission extends BaseEntity, ActivatableEntity {
    name: string;
    description: string;
    resource: PermissionResource;
    action: PermissionAction;
    level: PermissionLevel;
    category_id: string;
    dependencies?: string[];
    is_critical: boolean;
    category_name?: string;
}

export interface PermissionCategory extends BaseEntity, NamedEntity, OrderableEntity, ActivatableEntity {
    description?: string;
    total_permissions?: number;
    active_permissions?: number;
    permissions?: Permission[];
}

export interface RoleTemplate extends BaseEntity, NamedEntity, ActivatableEntity {
    description?: string;
    is_system_role: boolean;
    permission_count?: number;
    permission_ids?: string[];
}

export interface UserPermission extends BaseEntity {
    user_id: string;
    permission_id: string;
    granted_by: string;
    granted_at: string;
    expires_at?: string;
    is_active: boolean;
    notes?: string;
}

export interface AdminUser extends BaseEntity, NamedEntity, ActivatableEntity {
    full_name: string;
    email: string;
    role: string;
    is_super_admin: boolean;
    last_login?: string;
    direct_permissions?: string[];
    active_permission_count?: number;
}

export interface PermissionFormData {
    name: string;
    description: string;
    resource: PermissionResource;
    action: PermissionAction;
    level: PermissionLevel;
    category_id: string;
    dependencies?: string[];
    is_critical: boolean;
    is_active: boolean;
}

export interface PermissionCategoryFormData {
    name: string;
    description?: string;
    order_index: number;
    is_active: boolean;
}

export interface RoleTemplateFormData {
    name: string;
    description?: string;
    is_system_role: boolean;
    is_active: boolean;
    permission_ids: string[];
}

export interface PermissionStats extends StatsBase {
    totalCategories: number;
    totalRoleTemplates: number;
    totalAdminUsers: number;
    usersWithPermissions: number;
    recentPermissionChanges: number;
}

export interface PermissionFilters extends SearchFilters {
    category_id?: string;
    level?: PermissionLevel;
    resource?: PermissionResource;
}

export interface PermissionWithDetails extends Permission {
    category?: PermissionCategory;
    dependent_permissions?: Permission[];
}

// ============================================================================
// PERMISSION STORE INTERFACES (Following existing patterns)
// ============================================================================

export interface PermissionStoreState extends BaseStoreState<Permission>, FilterableStoreState<Permission, PermissionFilters>, StatsStoreState<PermissionStats> {
    // Related data
    categories: PermissionCategory[];
    roleTemplates: RoleTemplate[];
    adminUsers: AdminUser[];
    userPermissions: UserPermission[];

    // Computed data
    filteredPermissions: Permission[];
    sortedPermissions: Permission[];

    // Sort configuration
    sortBy: 'name' | 'level' | 'resource' | 'created_at';
    sortOrder: 'asc' | 'desc';
}

export interface PermissionStoreActions extends BaseCrudActions<Permission, PermissionFormData>, SearchableActions<Permission> {
    // Permission-specific actions
    fetchCategories: () => Promise<void>;
    fetchRoleTemplates: () => Promise<void>;
    fetchAdminUsers: () => Promise<void>;
    fetchUserPermissions: (userId: string) => Promise<void>;

    // Permission management
    grantPermission: (userId: string, permissionId: string, grantedBy: string) => Promise<void>;
    revokePermission: (userId: string, permissionId: string) => Promise<void>;
    updateUserPermissions: (userId: string, permissionIds: string[], grantedBy: string) => Promise<void>;

    // Role template management
    applyRoleTemplate: (userId: string, roleTemplateId: string, grantedBy: string) => Promise<void>;
    createRoleTemplate: (roleTemplate: RoleTemplateFormData) => Promise<void>;

    // Utility functions
    getUserPermissions: (userId: string) => string[];
    hasPermission: (userId: string, resource: string, action: string) => boolean;

    // Sort actions
    setSortBy: (sortBy: 'name' | 'level' | 'resource' | 'created_at') => void;
    setSortOrder: (order: 'asc' | 'desc') => void;

    // Filter actions
    setFilters: (filters: Partial<PermissionFilters>) => void;

    // Statistics calculation
    calculateStats: () => void;
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
// ROUTE MANAGEMENT TYPES
// ============================================================================

export interface Route extends BaseEntity, ActivatableEntity, NamedEntity {
    from_island_id: string;
    to_island_id: string;
    base_fare: number;
    distance?: string;
    duration?: string;
    description?: string;
    status: "active" | "inactive" | "maintenance";

    // Island information (from joins)
    from_island_name?: string;
    to_island_name?: string;
    origin?: string; // Legacy compatibility
    destination?: string; // Legacy compatibility

    // Statistics from routes_stats_view
    total_trips_30d: number;
    total_bookings_30d: number;
    total_revenue_30d: number;
    average_occupancy_30d: number;
    cancellation_rate_30d: number;
    popularity_score: number;

    // Additional analytics
    trips_today?: number;
    trips_7d?: number;
    bookings_today?: number;
    bookings_7d?: number;
    revenue_today?: number;
    revenue_7d?: number;
    on_time_performance_30d?: number;
    avg_delay_minutes_30d?: number;
}

export interface RouteFormData {
    name: string;
    from_island_id: string;
    to_island_id: string;
    base_fare: number;
    distance?: string;
    duration?: string;
    description?: string;
    status: "active" | "inactive" | "maintenance";
    is_active: boolean;
}

export interface RouteWithDetails extends Route {
    // Enhanced route details
    trips_summary?: {
        total_30d: number;
        today: number;
        next_7d: number;
        completed_30d: number;
        cancelled_30d: number;
    };
    performance_summary?: {
        on_time_rate: number;
        avg_delay_minutes: number;
        customer_rating: number;
        reliability_score: number;
    };
    financial_summary?: {
        total_revenue_30d: number;
        avg_revenue_per_trip: number;
        avg_occupancy: number;
        profit_margin: number;
    };
    vessels_used?: {
        vessel_id: string;
        vessel_name: string;
        trips_count: number;
    }[];
}

export interface RouteStats extends StatsBase {
    totalTrips30d: number;
    totalBookings30d: number;
    totalRevenue30d: number;
    avgOccupancy: number;
    avgFare: number;
    onTimePerformance: number;
    cancellationRate: number;
    popularityScore: number;

    // Top performers
    topRouteByRevenue?: { route: string; revenue: number };
    topRouteByTrips?: { route: string; trips: number };
    topRouteByOccupancy?: { route: string; occupancy: number };

    // Trends
    revenueGrowth30d?: number;
    tripsGrowth30d?: number;
    bookingsGrowth30d?: number;
}

export interface RouteFilters {
    status?: "active" | "inactive" | "maintenance";
    is_active?: boolean;
    from_island_id?: string;
    to_island_id?: string;
    zone_id?: string; // Filter by zone
    min_fare?: number;
    max_fare?: number;
    has_trips?: boolean;
    performance_rating?: 'excellent' | 'good' | 'fair' | 'poor';
    created_after?: string;
    created_before?: string;
}

export interface RouteActivityLog {
    id: string;
    route_id: string;
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