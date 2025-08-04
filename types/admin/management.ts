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
// VESSEL TYPES
// ============================================================================

export interface Vessel extends BaseEntity, ActivatableEntity, NamedEntity {
    seating_capacity: number;
    status: "active" | "maintenance" | "inactive";

    // Enhanced vessel details
    vessel_type: 'passenger' | 'cargo' | 'mixed' | 'luxury' | 'speedboat';
    registration_number?: string;
    captain_name?: string;
    contact_number?: string;
    maintenance_schedule?: string;
    last_maintenance_date?: string;
    next_maintenance_date?: string;
    insurance_expiry_date?: string;
    license_expiry_date?: string;
    max_speed?: number;
    fuel_capacity?: number;
    description?: string;
    notes?: string;

    // Statistics from operations_vessels_view
    total_trips_30d: number;
    total_bookings_30d: number;
    total_passengers_30d: number;
    total_revenue_30d: number;
    capacity_utilization_30d: number;
    avg_passengers_per_trip: number;
    days_in_service_30d: number;

    // Additional analytics
    trips_today?: number;
    trips_7d?: number;
    bookings_today?: number;
    bookings_7d?: number;
    revenue_today?: number;
    revenue_7d?: number;
    maintenance_cost_30d?: number;
    fuel_consumption_30d?: number;
    average_rating?: number;
}

export interface VesselFormData {
    name: string;
    seating_capacity: number;
    status: "active" | "maintenance" | "inactive";
    is_active: boolean;

    // Enhanced vessel details
    vessel_type: 'passenger' | 'cargo' | 'mixed' | 'luxury' | 'speedboat';
    registration_number?: string;
    captain_name?: string;
    contact_number?: string;
    maintenance_schedule?: string;
    last_maintenance_date?: string;
    next_maintenance_date?: string;
    insurance_expiry_date?: string;
    license_expiry_date?: string;
    max_speed?: number;
    fuel_capacity?: number;
    description?: string;
    notes?: string;

    // Ferry-specific layout options
    layout_config?: {
        floors: number;
        auto_generate_layout: boolean;
        layout_type: 'standard' | 'luxury' | 'economy' | 'mixed';
        has_premium_section: boolean;
        has_crew_section: boolean;
        has_disabled_access: boolean;
    };
}

export interface VesselWithDetails extends Vessel {
    // Enhanced vessel details
    trips_summary?: {
        total_30d: number;
        today: number;
        next_7d: number;
        completed_30d: number;
        cancelled_30d: number;
    };
    performance_summary?: {
        utilization_rate: number;
        avg_passengers_per_trip: number;
        reliability_score: number;
        maintenance_score: number;
    };
    financial_summary?: {
        total_revenue_30d: number;
        avg_revenue_per_trip: number;
        maintenance_cost_30d: number;
        fuel_cost_30d: number;
        profit_margin: number;
    };
    routes_served?: {
        route_id: string;
        route_name: string;
        trips_count: number;
    }[];

    // Seat layout data
    seatLayout?: SeatLayout | null;
    seats?: Seat[];
}

export interface VesselStats extends StatsBase {
    maintenance: number;
    totalTrips30d: number;
    totalBookings30d: number;
    totalRevenue30d: number;
    avgUtilization: number;
    avgCapacity: number;
    totalCapacity: number;

    // Top performers
    topVesselByRevenue?: { vessel: string; revenue: number };
    topVesselByTrips?: { vessel: string; trips: number };
    topVesselByUtilization?: { vessel: string; utilization: number };

    // Trends
    revenueGrowth30d?: number;
    tripsGrowth30d?: number;
    bookingsGrowth30d?: number;
}

export interface VesselFilters {
    status?: "active" | "maintenance" | "inactive" | "all";
    is_active?: boolean;
    min_capacity?: number;
    max_capacity?: number;
    capacity_range?: {
        min: number;
        max: number;
    };
    has_trips?: boolean;
    utilization_rating?: 'excellent' | 'good' | 'fair' | 'poor';
    created_after?: string;
    created_before?: string;
}

export interface VesselActivityLog {
    id: string;
    vessel_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    user_id?: string;
    created_at: string;
}

// ============================================================================
// SEAT LAYOUT TYPES
// ============================================================================

export interface SeatLayoutData {
    rows: number;
    columns: number;
    aisles: number[];
    rowAisles: number[];
    premium_rows: number[];
    disabled_seats: string[];
    crew_seats: string[];
    floors: FloorLayout[];
    [key: string]: any;
}

export interface FloorLayout {
    floor_number: number;
    floor_name: string;
    rows: number;
    columns: number;
    aisles: number[];
    rowAisles: number[];
    premium_rows: number[];
    disabled_seats: string[];
    crew_seats: string[];
    is_active: boolean;
    seat_count: number;
}

export interface SeatLayout extends BaseEntity, ActivatableEntity {
    vessel_id: string;
    layout_name: string;
    layout_data: SeatLayoutData;
    created_by?: string;
    // Legacy properties for backward compatibility
    rows?: number;
    columns?: number;
    aisles?: number[];
    premium_rows?: number[];
    disabled_seats?: string[];
    crew_seats?: string[];
}

export interface Seat extends Omit<BaseEntity, 'updated_at'> {
    id: string;
    vessel_id: string;
    layout_id?: string;
    seat_number: string;
    row_number: number;
    position_x: number;
    position_y: number;
    is_window: boolean;
    is_aisle: boolean;
    is_row_aisle?: boolean;
    seat_type: 'standard' | 'premium' | 'crew' | 'disabled';
    seat_class: 'economy' | 'business' | 'first';
    is_disabled: boolean;
    is_premium: boolean;
    price_multiplier: number;
    seat_metadata?: Record<string, any>;
    updated_at?: string;
}

// Add SeatCell type for 2D grid representation
export type SeatCell = {
    seat: Seat | null;
    position: { row: number; col: number }
};

export interface SeatLayoutFormData {
    layout_name: string;
    layout_data: SeatLayoutData;
    seats: Seat[];
}

export interface SeatPosition {
    id: string;
    x: number;
    y: number;
    seatNumber: string;
    rowNumber: number;
    columnNumber: number;
    floorNumber: number; // Add floor number for multi-floor support
    isWindow: boolean;
    isAisle: boolean;
    seatType: 'standard' | 'premium' | 'disabled' | 'crew';
    seatClass: 'economy' | 'business' | 'first';
    isDisabled: boolean;
    isPremium: boolean;
    isRemoved?: boolean; // New property to mark seats as removed
    priceMultiplier: number;
}

export interface SeatLayoutStats {
    totalSeats: number;
    activeSeats: number;
    disabledSeats: number;
    premiumSeats: number;
    crewSeats: number;
    windowSeats: number;
    aisleSeats: number;
    removedSeats: number;
    utilizationRate: number;
    revenuePotential: number;
}

export interface SeatLayoutFilters {
    seat_type?: 'standard' | 'premium' | 'disabled' | 'crew';
    seat_class?: 'economy' | 'business' | 'first';
    is_disabled?: boolean;
    is_premium?: boolean;
    is_window?: boolean;
    is_aisle?: boolean;
    price_range?: {
        min: number;
        max: number;
    };
}

export interface SeatEditModalProps {
    seat: SeatPosition | null;
    visible: boolean;
    onSave: (seat: SeatPosition) => void;
    onCancel: () => void;
}

export interface SeatLayoutWithDetails extends SeatLayout {
    seats: Seat[];
    stats: SeatLayoutStats;
    vessel?: Vessel;
}

// ============================================================================
// VESSEL STORE TYPES
// ============================================================================

export interface VesselStoreState {
    // Data (from BaseStoreState)
    data: Vessel[];
    currentItem: Vessel | null;
    loading: LoadingStates;
    error: string | null;
    searchQuery: string;

    // Filters (from FilterableStoreState)
    filters: VesselFilters;

    // Stats (from StatsStoreState)
    stats: VesselStats;

    // Seat layout data
    seatLayouts: SeatLayout[];
    currentSeatLayout: SeatLayout | null;
    seats: Seat[];
    currentSeats: Seat[];

    // Sort configuration
    sortBy: 'name' | 'seating_capacity' | 'created_at' | 'total_trips_30d' | 'total_revenue_30d' | 'capacity_utilization_30d';
    sortOrder: 'asc' | 'desc';

    // Computed data
    filteredVessels: Vessel[];
    sortedVessels: Vessel[];
    vesselsByStatus: Record<string, Vessel[]>;
}

export interface VesselStoreActions extends BaseCrudActions<Vessel, VesselFormData>, SearchableActions<Vessel> {
    // Vessel-specific actions
    fetchVesselDetails: (id: string) => Promise<VesselWithDetails | null>;
    fetchVesselsByStatus: (status: string) => Promise<Vessel[]>;

    // Seat layout operations
    fetchSeatLayout: (vesselId: string) => Promise<SeatLayout | null>;
    createSeatLayout: (vesselId: string, data: SeatLayoutFormData) => Promise<SeatLayout>;
    createCustomSeatLayout: (vesselId: string, layoutData: any, seats: Seat[]) => Promise<{ layout: SeatLayout; seats: Seat[] }>;
    updateSeatLayout: (layoutId: string, data: Partial<SeatLayoutFormData>) => Promise<SeatLayout>;
    deleteSeatLayout: (layoutId: string) => Promise<void>;
    deleteSeatsByLayout: (layoutId: string) => Promise<void>;
    fetchSeats: (vesselId: string) => Promise<Seat[]>;
    updateSeats: (vesselId: string, seats: Seat[]) => Promise<void>;

    // NEW: Automatic seat layout generation
    generateAutomaticSeatLayout: (vesselId: string, capacity: number, vesselType: string) => Promise<SeatLayout>;

    // Ferry-specific seat layout functions
    generateFerryLayout: (vesselId: string, capacity: number, vesselType: string, layoutConfig?: any) => Promise<{ layout: SeatLayout; seats: Seat[] }>;
    validateFerryLayoutData: (layoutData: SeatLayoutData) => ValidationResult;
    getLayoutStatistics: (seats: Seat[]) => {
        total: number;
        active: number;
        premium: number;
        crew: number;
        disabled: number;
        window: number;
        aisle: number;
        utilizationRate: number;
        revenuePotential: number;
    };
    getFloorSeats: (seats: Seat[], floorNumber: number) => Seat[];

    // State management
    setCurrentVessel: (vessel: Vessel | null) => void;
    setCurrentSeatLayout: (layout: SeatLayout | null) => void;

    // Sort actions
    setSortBy: (sortBy: 'name' | 'seating_capacity' | 'created_at' | 'total_trips_30d' | 'total_revenue_30d' | 'capacity_utilization_30d') => void;
    setSortOrder: (order: 'asc' | 'desc') => void;

    // Filter actions
    setFilters: (filters: Partial<VesselFilters>) => void;

    // Utility functions
    getVesselById: (id: string) => Vessel | undefined;
    getVesselsByStatus: (status: string) => Vessel[];
    validateVesselData: (data: Partial<VesselFormData>) => ValidationResult;

    // Statistics calculation
    calculateComputedData: () => void;
}

// ============================================================================
// TRIP MANAGEMENT TYPES
// ============================================================================

export interface Trip extends BaseEntity, ActivatableEntity {
    route_id: string;
    vessel_id: string;
    travel_date: string;
    departure_time: string;
    arrival_time?: string;
    estimated_duration: string;
    status: "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
    delay_reason?: string;
    available_seats: number;
    booked_seats: number;
    fare_multiplier: number;
    weather_conditions?: string;
    captain_id?: string;
    crew_ids?: string[];
    notes?: string;

    // Related data (from joins)
    route?: Route;
    vessel?: Vessel;
    route_name?: string;
    vessel_name?: string;
    from_island_name?: string;
    to_island_name?: string;
    capacity?: number;
    bookings?: number;
    occupancy_rate?: number;
    computed_status?: string;
    base_fare?: number;
    confirmed_bookings?: number;
}

export interface TripFormData {
    route_id: string;
    vessel_id: string;
    travel_date: string;
    departure_time: string;
    arrival_time?: string;
    status?: "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
    delay_reason?: string;
    fare_multiplier: number;
    weather_conditions?: string;
    captain_id?: string;
    crew_ids?: string[];
    notes?: string;
    is_active: boolean;
}

export interface TripWithDetails extends Trip {
    // Enhanced trip details
    route_details?: {
        route_name: string;
        from_island_name: string;
        to_island_name: string;
        base_fare: number;
        distance: string;
        duration: string;
    };
    vessel_details?: {
        vessel_name: string;
        seating_capacity: number;
        vessel_type: string;
        status: string;
    };
    performance_summary?: {
        occupancy_rate: number;
        revenue: number;
        on_time_performance: number;
        customer_satisfaction: number;
    };
    booking_summary?: {
        total_bookings: number;
        confirmed_bookings: number;
        cancelled_bookings: number;
        revenue: number;
    };
    weather_impact?: {
        impact: "none" | "low" | "medium" | "high";
        recommendation: string;
    };
}

export interface TripStats extends StatsBase {
    scheduled: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    delayed: number;
    averageOccupancy: number;
    totalRevenue: number;
    todayTrips: number;
    onTimePerformance: number;
    avgFare: number;
    totalBookings: number;
    totalPassengers: number;

    // Top performers
    topTripByRevenue?: { trip: string; revenue: number };
    topTripByOccupancy?: { trip: string; occupancy: number };
    topRouteByTrips?: { route: string; trips: number };

    // Trends
    revenueGrowth30d?: number;
    occupancyGrowth30d?: number;
    bookingsGrowth30d?: number;
}

export interface TripFilters extends SearchFilters {
    status?: "all" | "scheduled" | "boarding" | "departed" | "arrived" | "cancelled" | "delayed";
    route_id?: string;
    vessel_id?: string;
    date_range?: {
        from: string;
        to: string;
    };
    departure_time_range?: {
        from: string;
        to: string;
    };
    occupancy_range?: {
        min: number;
        max: number;
    };
    fare_range?: {
        min: number;
        max: number;
    };
    has_bookings?: boolean;
    performance_rating?: 'excellent' | 'good' | 'fair' | 'poor';
    created_after?: string;
    created_before?: string;
}

export interface TripActivityLog {
    id: string;
    trip_id: string;
    action: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    user_id?: string;
    created_at: string;
}

// ============================================================================
// TRIP STORE TYPES
// ============================================================================

export interface TripStoreState extends BaseStoreState<Trip>, FilterableStoreState<Trip, TripFilters>, StatsStoreState<TripStats> {
    // Related data
    routes: Route[];
    vessels: Vessel[];

    // Computed data
    filteredTrips: Trip[];
    sortedTrips: Trip[];
    tripsByStatus: Record<string, Trip[]>;
    tripsByRoute: Record<string, Trip[]>;
    tripsByVessel: Record<string, Trip[]>;

    // Sort configuration
    sortBy: 'travel_date' | 'departure_time' | 'status' | 'available_seats' | 'booked_seats' | 'created_at' | 'fare_multiplier';
    sortOrder: 'asc' | 'desc';
}

export interface TripStoreActions extends BaseCrudActions<Trip, TripFormData>, SearchableActions<Trip> {
    // Trip-specific actions
    fetchTripDetails: (id: string) => Promise<TripWithDetails | null>;
    fetchTripsByStatus: (status: string) => Promise<Trip[]>;
    fetchTripsByRoute: (routeId: string) => Promise<Trip[]>;
    fetchTripsByVessel: (vesselId: string) => Promise<Trip[]>;
    fetchTripsByDate: (date: string) => Promise<Trip[]>;

    // Trip management
    updateTripStatus: (tripId: string, status: Trip['status'], reason?: string) => Promise<void>;
    cancelTrip: (tripId: string, reason: string) => Promise<void>;
    delayTrip: (tripId: string, delayMinutes: number, reason: string) => Promise<void>;
    rescheduleTrip: (tripId: string, newDate: string, newTime: string) => Promise<void>;

    // Bulk operations
    bulkUpdateStatus: (tripIds: string[], status: Trip['status']) => Promise<void>;
    bulkCancel: (tripIds: string[], reason: string) => Promise<void>;
    bulkReschedule: (tripIds: string[], newDate: string, newTime: string) => Promise<void>;

    // Trip generation
    generateTripsForRoute: (routeId: string, startDate: string, endDate: string, schedule: any) => Promise<Trip[]>;
    generateTripsForDate: (date: string, routes?: string[]) => Promise<Trip[]>;

    // Utility functions
    getTripById: (id: string) => Trip | undefined;
    getTripsByStatus: (status: string) => Trip[];
    getTripsByRoute: (routeId: string) => Trip[];
    getTripsByVessel: (vesselId: string) => Trip[];
    validateTripData: (data: Partial<TripFormData>) => ValidationResult;
    checkTripConflicts: (tripData: TripFormData, excludeId?: string) => { hasConflict: boolean; conflictingTrip?: Trip };

    // Sort actions
    setSortBy: (sortBy: 'travel_date' | 'departure_time' | 'status' | 'available_seats' | 'booked_seats' | 'created_at' | 'fare_multiplier') => void;
    setSortOrder: (order: 'asc' | 'desc') => void;

    // Filter actions
    setFilters: (filters: Partial<TripFilters>) => void;

    // Statistics calculation
    calculateStats: () => void;

    // Computed data calculation
    calculateComputedData: () => void;
}

// ============================================================================
// TRIP MANAGEMENT HOOK TYPES
// ============================================================================

export interface UseTripManagementReturn extends BaseManagementHook<Trip, TripFormData, TripStats> {
    // Trip-specific data
    trips: Trip[];
    currentTrip: Trip | null;

    // Computed data with current filters and sort
    filteredTrips: Trip[];
    sortedTrips: Trip[];
    tripsByStatus: Record<string, Trip[]>;
    tripsByRoute: Record<string, Trip[]>;
    tripsByVessel: Record<string, Trip[]>;

    // Related data for trip management
    routes: Route[];
    vessels: Vessel[];
    loadRoutes: () => Promise<void>;
    loadVessels: () => Promise<void>;

    // Trip-specific actions
    loadTripsByStatus: (status: string) => Promise<Trip[]>;
    loadTripsByRoute: (routeId: string) => Promise<Trip[]>;
    loadTripsByVessel: (vesselId: string) => Promise<Trip[]>;
    loadTripsByDate: (date: string) => Promise<Trip[]>;

    // Enhanced getters
    getTripWithDetails: (id: string) => Promise<TripWithDetails | null>;

    // Filter and sort state
    sortBy: 'travel_date' | 'departure_time' | 'status' | 'available_seats' | 'booked_seats' | 'created_at' | 'fare_multiplier';
    sortOrder: 'asc' | 'desc';
    setSortBy: (sortBy: 'travel_date' | 'departure_time' | 'status' | 'available_seats' | 'booked_seats' | 'created_at' | 'fare_multiplier') => void;
    setSortOrder: (order: 'asc' | 'desc') => void;

    // Search and filter management
    searchQuery: string;
    filters: TripFilters;
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<TripFilters>) => void;
    clearFilters: () => void;

    // Performance helpers
    getPerformanceRating: (trip: Trip) => 'excellent' | 'good' | 'fair' | 'poor';
    getPerformanceColor: (rating: string) => string;
    formatCurrency: (amount: number) => string;
    formatPercentage: (value: number) => string;
    getOccupancyLevel: (trip: Trip) => 'low' | 'medium' | 'high' | 'full';
    getStatusColor: (status: string) => string;
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