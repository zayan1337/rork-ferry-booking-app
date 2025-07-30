import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';
import {
    generateFerrySeatLayout,
    calculateOptimalLayout,
    generateSeatsForFloor,
    validateFerryLayout,
} from '@/utils/admin/vesselUtils';

type Vessel = AdminManagement.Vessel;
type VesselFormData = AdminManagement.VesselFormData;
type VesselStats = AdminManagement.VesselStats;
type VesselFilters = AdminManagement.VesselFilters;
type VesselWithDetails = AdminManagement.VesselWithDetails;
type ValidationResult = AdminManagement.ValidationResult;
type VesselStoreState = AdminManagement.VesselStoreState;
type VesselStoreActions = AdminManagement.VesselStoreActions;
type SeatLayout = AdminManagement.SeatLayout;
type Seat = AdminManagement.Seat;
type SeatLayoutFormData = AdminManagement.SeatLayoutFormData;

// ============================================================================
// VESSEL STORE IMPLEMENTATION
// ============================================================================

export const useVesselStore = create<VesselStoreState & VesselStoreActions>((set, get) => ({
    // ========================================================================
    // INITIAL STATE
    // ========================================================================

    data: [],
    currentItem: null,
    loading: {},
    error: null,
    searchQuery: '',
    filters: {},
    stats: {
        total: 0,
        active: 0,
        inactive: 0,
        maintenance: 0,
        totalTrips30d: 0,
        totalBookings30d: 0,
        totalRevenue30d: 0,
        avgUtilization: 0,
        avgCapacity: 0,
        totalCapacity: 0,
    },

    // Seat layout data
    seatLayouts: [],
    currentSeatLayout: null,
    seats: [],
    currentSeats: [],

    // Sort configuration
    sortBy: 'name',
    sortOrder: 'asc',

    // Computed data
    filteredVessels: [],
    sortedVessels: [],
    vesselsByStatus: {},

    // ========================================================================
    // DATA FETCHING
    // ========================================================================

    fetchAll: async () => {
        set({ loading: { ...get().loading, fetchAll: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('operations_vessels_view')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            set({
                data: data || [],
                loading: { ...get().loading, fetchAll: false }
            });

            // Calculate computed data
            get().calculateComputedData();
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch vessels',
                loading: { ...get().loading, fetchAll: false }
            });
        }
    },

    fetchById: async (id: string) => {
        set({ loading: { ...get().loading, fetchById: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('operations_vessels_view')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            set({
                currentItem: data,
                loading: { ...get().loading, fetchById: false }
            });

            return data;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch vessel',
                loading: { ...get().loading, fetchById: false }
            });
            return null;
        }
    },

    fetchVesselDetails: async (id: string) => {
        set({ loading: { ...get().loading, fetchDetails: true }, error: null });

        try {
            // Fetch vessel with enhanced details
            const { data, error } = await supabase
                .rpc('get_vessel_seat_layout', { vessel_uuid: id });

            if (error) throw error;

            set({
                loading: { ...get().loading, fetchDetails: false }
            });

            return data?.[0] || null;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch vessel details',
                loading: { ...get().loading, fetchDetails: false }
            });
            return null;
        }
    },

    fetchVesselsByStatus: async (status: string) => {
        set({ loading: { ...get().loading, fetchByStatus: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('operations_vessels_view')
                .select('*')
                .eq('status', status)
                .order('name', { ascending: true });

            if (error) throw error;

            set({
                loading: { ...get().loading, fetchByStatus: false }
            });

            return data || [];
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch vessels by status',
                loading: { ...get().loading, fetchByStatus: false }
            });
            return [];
        }
    },

    // ========================================================================
    // CRUD OPERATIONS
    // ========================================================================

    create: async (data: VesselFormData) => {
        set({ loading: { ...get().loading, create: true }, error: null });

        try {
            const { data: vessel, error } = await supabase
                .from('vessels')
                .insert([data])
                .select()
                .single();

            if (error) throw error;

            set({
                data: [...get().data, vessel],
                loading: { ...get().loading, create: false }
            });

            return vessel;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create vessel',
                loading: { ...get().loading, create: false }
            });
            throw error;
        }
    },

    update: async (id: string, data: Partial<VesselFormData>) => {
        set({ loading: { ...get().loading, update: true }, error: null });

        try {
            const { data: vessel, error } = await supabase
                .from('vessels')
                .update(data)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            set({
                data: get().data.map(v => v.id === id ? vessel : v),
                currentItem: get().currentItem?.id === id ? vessel : get().currentItem,
                loading: { ...get().loading, update: false }
            });

            return vessel;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update vessel',
                loading: { ...get().loading, update: false }
            });
            throw error;
        }
    },

    delete: async (id: string) => {
        set({ loading: { ...get().loading, delete: true }, error: null });

        try {
            const { error } = await supabase
                .from('vessels')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set({
                data: get().data.filter(v => v.id !== id),
                currentItem: get().currentItem?.id === id ? null : get().currentItem,
                loading: { ...get().loading, delete: false }
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete vessel',
                loading: { ...get().loading, delete: false }
            });
            throw error;
        }
    },

    // ========================================================================
    // SEAT LAYOUT OPERATIONS
    // ========================================================================

    fetchSeatLayout: async (vesselId: string) => {
        set({ loading: { ...get().loading, fetchLayout: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('vessel_seat_layouts_view')
                .select('*')
                .eq('vessel_id', vesselId)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

            set({
                currentSeatLayout: data || null,
                loading: { ...get().loading, fetchLayout: false }
            });

            return data || null;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch seat layout',
                loading: { ...get().loading, fetchLayout: false }
            });
            return null;
        }
    },

    createSeatLayout: async (vesselId: string, data: SeatLayoutFormData) => {
        set({ loading: { ...get().loading, createLayout: true }, error: null });

        try {
            // First, deactivate any existing active layout
            await supabase
                .from('vessel_seat_layouts')
                .update({ is_active: false })
                .eq('vessel_id', vesselId)
                .eq('is_active', true);

            // Create new layout
            const { data: layout, error: layoutError } = await supabase
                .from('vessel_seat_layouts')
                .insert([{
                    vessel_id: vesselId,
                    layout_name: data.layout_name,
                    rows: data.layout_data.rows,
                    columns: data.layout_data.columns,
                    aisles: data.layout_data.aisles,
                    premium_rows: data.layout_data.premium_rows,
                    disabled_seats: data.layout_data.disabled_seats,
                    crew_seats: data.layout_data.crew_seats,
                    is_active: true
                }])
                .select()
                .single();

            if (layoutError) throw layoutError;

            // Generate seats for the layout
            const { error: generateError } = await supabase
                .rpc('generate_seats_for_layout', {
                    layout_uuid: layout.id,
                    max_seats: data.seats.length > 0 ? data.seats.length : null
                });

            if (generateError) throw generateError;

            set({
                currentSeatLayout: layout,
                loading: { ...get().loading, createLayout: false }
            });

            return layout;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to create seat layout',
                loading: { ...get().loading, createLayout: false }
            });
            throw error;
        }
    },

    updateSeatLayout: async (layoutId: string, data: Partial<SeatLayoutFormData>) => {
        set({ loading: { ...get().loading, updateLayout: true }, error: null });

        try {
            const updateData: any = {};
            if (data.layout_name) updateData.layout_name = data.layout_name;
            if (data.layout_data) {
                updateData.rows = data.layout_data.rows;
                updateData.columns = data.layout_data.columns;
                updateData.aisles = data.layout_data.aisles;
                updateData.premium_rows = data.layout_data.premium_rows;
                updateData.disabled_seats = data.layout_data.disabled_seats;
                updateData.crew_seats = data.layout_data.crew_seats;
            }

            const { data: layout, error: layoutError } = await supabase
                .from('vessel_seat_layouts')
                .update(updateData)
                .eq('id', layoutId)
                .select()
                .single();

            if (layoutError) throw layoutError;

            // Regenerate seats if layout data changed
            if (data.layout_data) {
                const { error: generateError } = await supabase
                    .rpc('generate_seats_for_layout', {
                        layout_uuid: layoutId,
                        max_seats: data.seats?.length || null
                    });

                if (generateError) throw generateError;
            }

            set({
                currentSeatLayout: layout,
                loading: { ...get().loading, updateLayout: false }
            });

            return layout;
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update seat layout',
                loading: { ...get().loading, updateLayout: false }
            });
            throw error;
        }
    },

    deleteSeatLayout: async (layoutId: string) => {
        set({ loading: { ...get().loading, deleteLayout: true }, error: null });

        try {
            // Delete seats first
            await supabase
                .from('seats')
                .delete()
                .eq('layout_id', layoutId);

            // Delete layout
            const { error } = await supabase
                .from('vessel_seat_layouts')
                .delete()
                .eq('id', layoutId);

            if (error) throw error;

            set({
                currentSeatLayout: null,
                loading: { ...get().loading, deleteLayout: false }
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to delete seat layout',
                loading: { ...get().loading, deleteLayout: false }
            });
            throw error;
        }
    },

    fetchSeats: async (vesselId: string) => {
        set({ loading: { ...get().loading, fetchSeats: true }, error: null });

        try {
            const { data, error } = await supabase
                .from('seats')
                .select('*')
                .eq('vessel_id', vesselId)
                .order('row_number', { ascending: true })
                .order('seat_number', { ascending: true });

            if (error) throw error;

            set({
                seats: data || [],
                currentSeats: data || [],
                loading: { ...get().loading, fetchSeats: false }
            });

            return data || [];
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch seats',
                loading: { ...get().loading, fetchSeats: false }
            });
            return [];
        }
    },

    updateSeats: async (vesselId: string, seats: Seat[]) => {
        set({ loading: { ...get().loading, updateSeats: true }, error: null });

        try {
            // Delete existing seats
            await supabase
                .from('seats')
                .delete()
                .eq('vessel_id', vesselId);

            // Insert new seats
            const { error } = await supabase
                .from('seats')
                .insert(seats);

            if (error) throw error;

            set({
                seats,
                currentSeats: seats,
                loading: { ...get().loading, updateSeats: false }
            });
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to update seats',
                loading: { ...get().loading, updateSeats: false }
            });
            throw error;
        }
    },

    // ========================================================================
    // FERRY-SPECIFIC SEAT LAYOUT FUNCTIONS
    // ========================================================================

    generateFerryLayout: async (vesselId: string, capacity: number, vesselType: string, layoutConfig?: any) => {
        set({ loading: { ...get().loading, generateLayout: true }, error: null });

        try {
            const optimalConfig = calculateOptimalLayout(capacity, vesselType);
            const ferryLayout = generateFerrySeatLayout(capacity, vesselType, { ...optimalConfig, ...layoutConfig });

            // Generate seats for all floors
            const allSeats: Seat[] = [];
            ferryLayout.floors.forEach(floor => {
                const floorSeats = generateSeatsForFloor(floor, vesselId);
                allSeats.push(...floorSeats);
            });

            // Create layout record
            const layoutData: SeatLayoutFormData = {
                layout_name: `${vesselType.charAt(0).toUpperCase() + vesselType.slice(1)} Layout - ${new Date().toLocaleDateString()}`,
                layout_data: {
                    rows: ferryLayout.floors.reduce((sum, floor) => sum + floor.rows, 0),
                    columns: Math.max(...ferryLayout.floors.map(f => f.columns)),
                    aisles: ferryLayout.floors[0]?.aisles || [],
                    premium_rows: ferryLayout.floors.flatMap(f => f.premium_rows),
                    disabled_seats: ferryLayout.floors.flatMap(f => f.disabled_seats),
                    crew_seats: ferryLayout.floors.flatMap(f => f.crew_seats),
                    floors: ferryLayout.floors,
                },
                seats: allSeats,
            };

            // Save layout to database
            const layout = await get().createSeatLayout(vesselId, layoutData);

            set({
                currentSeatLayout: layout,
                seats: allSeats,
                currentSeats: allSeats,
                loading: { ...get().loading, generateLayout: false }
            });

            return { layout, seats: allSeats };
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to generate ferry layout',
                loading: { ...get().loading, generateLayout: false }
            });
            throw error;
        }
    },

    validateFerryLayoutData: (layoutData: AdminManagement.SeatLayoutData) => {
        return validateFerryLayout(layoutData);
    },

    getLayoutStatistics: (seats: Seat[]) => {
        const totalSeats = seats.length;
        const activeSeats = seats.filter(s => !s.is_disabled).length;
        const premiumSeats = seats.filter(s => s.is_premium).length;
        const crewSeats = seats.filter(s => s.seat_type === 'crew').length;
        const disabledSeats = seats.filter(s => s.is_disabled).length;
        const windowSeats = seats.filter(s => s.is_window).length;
        const aisleSeats = seats.filter(s => s.is_aisle).length;

        return {
            total: totalSeats,
            active: activeSeats,
            premium: premiumSeats,
            crew: crewSeats,
            disabled: disabledSeats,
            window: windowSeats,
            aisle: aisleSeats,
            utilizationRate: totalSeats > 0 ? (activeSeats / totalSeats) * 100 : 0,
            revenuePotential: seats.reduce((sum, seat) => sum + seat.price_multiplier, 0),
        };
    },

    getFloorSeats: (seats: Seat[], floorNumber: number) => {
        return seats.filter(seat => {
            const seatFloor = seat.seat_number.startsWith(floorNumber.toString())
                ? parseInt(seat.seat_number[0])
                : 1;
            return seatFloor === floorNumber;
        });
    },

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    setCurrentItem: (item) => set({ currentItem: item }),
    setCurrentVessel: (vessel) => set({ currentItem: vessel }),
    setCurrentSeatLayout: (layout) => set({ currentSeatLayout: layout }),
    clearError: () => set({ error: null }),
    setError: (error) => set({ error }),

    // ========================================================================
    // SEARCH AND FILTER
    // ========================================================================

    setSearchQuery: (query) => {
        set({ searchQuery: query });
        get().calculateComputedData();
    },

    setFilters: (filters) => {
        set({ filters: { ...get().filters, ...filters } });
        get().calculateComputedData();
    },

    clearFilters: () => {
        set({ filters: {}, searchQuery: '' });
        get().calculateComputedData();
    },

    // ========================================================================
    // SORT ACTIONS
    // ========================================================================

    setSortBy: (sortBy) => {
        set({ sortBy });
        get().calculateComputedData();
    },

    setSortOrder: (order) => {
        set({ sortOrder: order });
        get().calculateComputedData();
    },

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    getVesselById: (id) => get().data.find(v => v.id === id),
    getVesselsByStatus: (status) => get().data.filter(v => v.status === status),

    validateVesselData: (data) => {
        const errors: Record<string, string> = {};

        if (!data.name?.trim()) {
            errors.name = 'Vessel name is required';
        }

        if (!data.seating_capacity || data.seating_capacity <= 0) {
            errors.seating_capacity = 'Seating capacity must be greater than 0';
        }

        if (data.vessel_type && !['passenger', 'cargo', 'mixed', 'luxury', 'speedboat'].includes(data.vessel_type)) {
            errors.vessel_type = 'Invalid vessel type';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    },

    refreshAll: async () => {
        await get().fetchAll();
    },

    resetStore: () => {
        set({
            data: [],
            currentItem: null,
            seatLayouts: [],
            currentSeatLayout: null,
            seats: [],
            currentSeats: [],
            loading: {},
            error: null,
            searchQuery: '',
            filters: {},
            sortBy: 'name',
            sortOrder: 'asc',
            filteredVessels: [],
            sortedVessels: [],
            vesselsByStatus: {},
            stats: {
                total: 0,
                active: 0,
                inactive: 0,
                maintenance: 0,
                totalTrips30d: 0,
                totalBookings30d: 0,
                totalRevenue30d: 0,
                avgUtilization: 0,
                avgCapacity: 0,
                totalCapacity: 0,
            }
        });
    },

    // ========================================================================
    // SEARCH AND FILTER FUNCTIONS
    // ========================================================================

    searchItems: (items, query) => {
        if (!query.trim()) return items;

        const searchTerm = query.toLowerCase();
        return items.filter(item =>
            item.name.toLowerCase().includes(searchTerm) ||
            item.registration_number?.toLowerCase().includes(searchTerm) ||
            item.captain_name?.toLowerCase().includes(searchTerm) ||
            item.vessel_type?.toLowerCase().includes(searchTerm)
        );
    },

    filterItems: (items, filters) => {
        let filtered = items;

        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(item => item.status === filters.status);
        }

        if (filters.is_active !== undefined && filters.is_active !== null) {
            filtered = filtered.filter(item => item.is_active === filters.is_active);
        }

        if (filters.min_capacity) {
            filtered = filtered.filter(item => item.seating_capacity >= filters.min_capacity!);
        }

        if (filters.max_capacity) {
            filtered = filtered.filter(item => item.seating_capacity <= filters.max_capacity!);
        }

        if (filters.has_trips !== undefined) {
            filtered = filtered.filter(item =>
                filters.has_trips ? (item.total_trips_30d || 0) > 0 : (item.total_trips_30d || 0) === 0
            );
        }

        return filtered;
    },

    sortItems: (items, sortBy, order) => {
        return [...items].sort((a, b) => {
            let aValue: any = a[sortBy as keyof Vessel];
            let bValue: any = b[sortBy as keyof Vessel];

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) aValue = order === 'asc' ? Infinity : -Infinity;
            if (bValue === null || bValue === undefined) bValue = order === 'asc' ? Infinity : -Infinity;

            // Handle string comparison
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (order === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
            }
        });
    },

    // ========================================================================
    // COMPUTED DATA CALCULATION
    // ========================================================================

    calculateComputedData: () => {
        const { data, searchQuery, filters, sortBy, sortOrder } = get();

        // Apply search
        let filtered = get().searchItems(data, searchQuery);

        // Apply filters
        filtered = get().filterItems(filtered, filters);

        // Apply sort
        const sorted = get().sortItems(filtered, sortBy, sortOrder);

        // Group by status
        const vesselsByStatus: Record<string, Vessel[]> = {};
        data.forEach(vessel => {
            const status = vessel.status || 'active';
            if (!vesselsByStatus[status]) {
                vesselsByStatus[status] = [];
            }
            vesselsByStatus[status].push(vessel);
        });

        // Calculate stats
        const stats = {
            total: data.length,
            active: data.filter(v => v.is_active).length,
            inactive: data.filter(v => !v.is_active).length,
            maintenance: data.filter(v => v.status === 'maintenance').length,
            totalTrips30d: data.reduce((sum, v) => sum + (v.total_trips_30d || 0), 0),
            totalBookings30d: data.reduce((sum, v) => sum + (v.total_bookings_30d || 0), 0),
            totalRevenue30d: data.reduce((sum, v) => sum + (v.total_revenue_30d || 0), 0),
            avgUtilization: data.length > 0
                ? data.reduce((sum, v) => sum + (v.capacity_utilization_30d || 0), 0) / data.length
                : 0,
            avgCapacity: data.length > 0
                ? data.reduce((sum, v) => sum + v.seating_capacity, 0) / data.length
                : 0,
            totalCapacity: data.reduce((sum, v) => sum + v.seating_capacity, 0),
        };

        set({
            filteredVessels: filtered,
            sortedVessels: sorted,
            vesselsByStatus,
            stats
        });
    },
}));
