import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import { AdminManagement } from '@/types';
import {
    generateFerrySeatLayout,
    calculateOptimalLayout,
    generateSeatsForFloor,
    validateFerryLayout,
    calculateOptimalRowColumnRatio,
    generateDefaultSeatLayoutConfig,
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
            // First, get all vessels with their basic data
            const { data: vessels, error: vesselsError } = await supabase
                .from('vessels')
                .select('*')
                .order('name', { ascending: true });

            if (vesselsError) throw vesselsError;

            // Then, get statistics from the operations view
            const { data: statsData, error: statsError } = await supabase
                .from('operations_vessels_view')
                .select('*');

            if (statsError) throw statsError;

            // Create a map of vessel stats by vessel ID
            const statsMap = new Map();
            (statsData || []).forEach(stat => {
                statsMap.set(stat.id, stat);
            });

            // Combine vessel data with statistics
            const vesselsWithDefaults = (vessels || []).map(vessel => {
                const stats = statsMap.get(vessel.id) || {};
                return {
                    ...vessel,
                    // Include all statistical data from the view
                    total_trips_30d: stats.total_trips_30d || 0,
                    total_bookings_30d: stats.total_bookings_30d || 0,
                    total_passengers_30d: stats.total_passengers_30d || 0,
                    capacity_utilization_30d: stats.capacity_utilization_30d || 0,
                    total_revenue_30d: stats.total_revenue_30d || 0,
                    avg_passengers_per_trip: stats.avg_passengers_per_trip || 0,
                    days_in_service_30d: stats.days_in_service_30d || 0,
                    current_route: stats.current_route || null,
                    next_departure: stats.next_departure || null,
                    // Add additional fields that might be expected
                    trips_today: 0,
                    trips_7d: 0,
                    bookings_today: 0,
                    bookings_7d: 0,
                    revenue_today: 0,
                    revenue_7d: 0,
                    maintenance_cost_30d: 0,
                    fuel_consumption_30d: 0,
                    average_rating: 0
                };
            });

            set({
                data: vesselsWithDefaults,
                loading: { ...get().loading, fetchAll: false }
            });

            // Calculate computed data
            get().calculateComputedData();
        } catch (error) {
            console.error('Error fetching vessels:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch vessels',
                loading: { ...get().loading, fetchAll: false }
            });
        }
    },

    fetchById: async (id: string) => {
        set({ loading: { ...get().loading, fetchById: true }, error: null });

        try {
            // First, get the vessel with its basic data
            const { data: vessel, error: vesselError } = await supabase
                .from('vessels')
                .select('*')
                .eq('id', id)
                .single();

            if (vesselError) throw vesselError;

            // Then, get statistics from the operations view
            const { data: statsData, error: statsError } = await supabase
                .from('operations_vessels_view')
                .select('*')
                .eq('id', id)
                .single();

            // Combine vessel data with statistics
            const stats = statsData || {};
            const vesselWithDefaults = {
                ...vessel,
                // Include all statistical data from the view
                total_trips_30d: stats.total_trips_30d || 0,
                total_bookings_30d: stats.total_bookings_30d || 0,
                total_passengers_30d: stats.total_passengers_30d || 0,
                capacity_utilization_30d: stats.capacity_utilization_30d || 0,
                total_revenue_30d: stats.total_revenue_30d || 0,
                avg_passengers_per_trip: stats.avg_passengers_per_trip || 0,
                days_in_service_30d: stats.days_in_service_30d || 0,
                current_route: stats.current_route || null,
                next_departure: stats.next_departure || null,
                // Add additional fields that might be expected
                trips_today: 0,
                trips_7d: 0,
                bookings_today: 0,
                bookings_7d: 0,
                revenue_today: 0,
                revenue_7d: 0,
                maintenance_cost_30d: 0,
                fuel_consumption_30d: 0,
                average_rating: 0
            };

            set({
                currentItem: vesselWithDefaults,
                loading: { ...get().loading, fetchById: false }
            });

            return vesselWithDefaults;
        } catch (error) {
            console.error('Error fetching vessel:', error);
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
            // First, get the vessel with its basic data
            const { data: vessel, error: vesselError } = await supabase
                .from('vessels')
                .select('*')
                .eq('id', id)
                .single();

            if (vesselError) throw vesselError;

            // Then, get statistics from the operations view
            const { data: statsData, error: statsError } = await supabase
                .from('operations_vessels_view')
                .select('*')
                .eq('id', id)
                .single();

            // Get individual seat data
            const { data: seatsData, error: seatsError } = await supabase
                .from('seats')
                .select('*')
                .eq('vessel_id', id)
                .order('row_number', { ascending: true })
                .order('position_x', { ascending: true });

            // Get seat layout data using the function
            const { data: layoutData, error: layoutError } = await supabase
                .rpc('get_vessel_seat_layout', { vessel_id_param: id });

            // Combine vessel data with statistics, layout, and seats
            const stats = statsData || {};
            const layout = layoutData || null;
            const seats = seatsData || [];

            const vesselWithDefaults = {
                ...vessel,
                // Include all statistical data from the view
                total_trips_30d: stats.total_trips_30d || 0,
                total_bookings_30d: stats.total_bookings_30d || 0,
                total_passengers_30d: stats.total_passengers_30d || 0,
                capacity_utilization_30d: stats.capacity_utilization_30d || 0,
                total_revenue_30d: stats.total_revenue_30d || 0,
                avg_passengers_per_trip: stats.avg_passengers_per_trip || 0,
                days_in_service_30d: stats.days_in_service_30d || 0,
                current_route: stats.current_route || null,
                next_departure: stats.next_departure || null,
                // Include seat layout data
                seatLayout: layout,
                seats: seats,
                // Add additional fields that might be expected
                trips_today: 0,
                trips_7d: 0,
                bookings_today: 0,
                bookings_7d: 0,
                revenue_today: 0,
                revenue_7d: 0,
                maintenance_cost_30d: 0,
                fuel_consumption_30d: 0,
                average_rating: 0
            };

            set({
                loading: { ...get().loading, fetchDetails: false }
            });

            return vesselWithDefaults || null;
        } catch (error) {
            console.error('Error fetching vessel details:', error);
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
            // First, get vessels with the specified status
            const { data: vessels, error: vesselsError } = await supabase
                .from('vessels')
                .select('*')
                .eq('status', status)
                .order('name', { ascending: true });

            if (vesselsError) throw vesselsError;

            // Then, get statistics from the operations view for these vessels
            const vesselIds = vessels?.map(v => v.id) || [];
            const { data: statsData, error: statsError } = await supabase
                .from('operations_vessels_view')
                .select('*')
                .in('id', vesselIds);

            if (statsError) throw statsError;

            // Create a map of vessel stats by vessel ID
            const statsMap = new Map();
            (statsData || []).forEach(stat => {
                statsMap.set(stat.id, stat);
            });

            // Combine vessel data with statistics
            const vesselsWithDefaults = (vessels || []).map(vessel => {
                const stats = statsMap.get(vessel.id) || {};
                return {
                    ...vessel,
                    // Include all statistical data from the view
                    total_trips_30d: stats.total_trips_30d || 0,
                    total_bookings_30d: stats.total_bookings_30d || 0,
                    total_passengers_30d: stats.total_passengers_30d || 0,
                    capacity_utilization_30d: stats.capacity_utilization_30d || 0,
                    total_revenue_30d: stats.total_revenue_30d || 0,
                    avg_passengers_per_trip: stats.avg_passengers_per_trip || 0,
                    days_in_service_30d: stats.days_in_service_30d || 0,
                    current_route: stats.current_route || null,
                    next_departure: stats.next_departure || null,
                    // Add additional fields that might be expected
                    trips_today: 0,
                    trips_7d: 0,
                    bookings_today: 0,
                    bookings_7d: 0,
                    revenue_today: 0,
                    revenue_7d: 0,
                    maintenance_cost_30d: 0,
                    fuel_consumption_30d: 0,
                    average_rating: 0
                };
            });

            set({
                loading: { ...get().loading, fetchByStatus: false }
            });

            return vesselsWithDefaults;
        } catch (error) {
            console.error('Error fetching vessels by status:', error);
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
            // Extract custom layout data and auto-generation flag if provided
            const customSeatLayout = (data as any).customSeatLayout;
            const autoGenerateLayout = (data as any).autoGenerateLayout !== false; // Default to true if not specified
            const cleanData = { ...data };
            delete (cleanData as any).customSeatLayout;
            delete (cleanData as any).autoGenerateLayout;

            // Create vessel (the database trigger will create default seats automatically)
            const { data: vessel, error } = await supabase
                .from('vessels')
                .insert([cleanData])
                .select()
                .single();

            if (error) throw error;

            // Handle custom seat layout after vessel creation
            if (vessel && data.seating_capacity && data.seating_capacity > 0) {
                try {
                    if (customSeatLayout) {
                        // Use custom seat layout
                        await get().saveCustomSeatLayout(
                            vessel.id,
                            customSeatLayout.layout.layout_data,
                            customSeatLayout.seats
                        );
                    } else if (!autoGenerateLayout) {
                        // If auto-generate is disabled, remove the default seats created by trigger
                        await supabase
                            .from('seats')
                            .delete()
                            .eq('vessel_id', vessel.id);
                    }
                } catch (layoutError) {
                    console.warn('Failed to handle seat layout:', layoutError);
                    // Don't fail the vessel creation if seat layout handling fails
                }
            }

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

    // Generate automatic seat layout for new vessels using database function
    generateAutomaticSeatLayout: async (vesselId: string, capacity: number, vesselType: string) => {
        set({ loading: { ...get().loading, generateAutoLayout: true }, error: null });

        try {
            // Use the database function to generate default seats
            const { error } = await supabase
                .rpc('generate_default_vessel_seats', {
                    vessel_id_param: vesselId,
                    capacity: capacity,
                    vessel_type: vesselType
                });

            if (error) throw error;

            // Fetch the generated seats
            const { data: seats, error: seatsError } = await supabase
                .from('seats')
                .select('*')
                .eq('vessel_id', vesselId)
                .order('row_number', { ascending: true })
                .order('position_x', { ascending: true });

            if (seatsError) throw seatsError;

            set({
                seats: seats || [],
                currentSeats: seats || [],
                loading: { ...get().loading, generateAutoLayout: false }
            });

            return { seats: seats || [] };
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to generate automatic seat layout',
                loading: { ...get().loading, generateAutoLayout: false }
            });
            throw error;
        }
    },

    update: async (id: string, data: Partial<VesselFormData>) => {
        set({ loading: { ...get().loading, update: true }, error: null });

        try {
            // Extract auto-generation flag if provided
            const autoGenerateLayout = (data as any).autoGenerateLayout;
            const cleanData = { ...data };
            delete (cleanData as any).autoGenerateLayout;

            const { data: vessel, error } = await supabase
                .from('vessels')
                .update(cleanData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            // Handle seat layout generation for updates if auto-generate is enabled
            if (vessel && autoGenerateLayout && data.seating_capacity && data.seating_capacity > 0) {
                try {
                    // Check if vessel already has a seat layout
                    const { data: existingLayout } = await supabase
                        .from('vessel_seat_layouts')
                        .select('id')
                        .eq('vessel_id', id)
                        .eq('is_active', true)
                        .single();

                    if (!existingLayout) {
                        // No existing layout, generate one
                        console.log('Auto-generating seat layout for updated vessel:', id, {
                            capacity: data.seating_capacity,
                            vesselType: data.vessel_type || 'passenger'
                        });
                        await get().generateAutomaticSeatLayout(id, data.seating_capacity, data.vessel_type || 'passenger');
                    } else {
                        console.log('Vessel already has seat layout, skipping auto-generation');
                    }
                } catch (layoutError) {
                    console.warn('Failed to generate seat layout during update:', layoutError);
                    // Don't fail the vessel update if seat layout generation fails
                }
            }

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
            // Get seat layout data using the database function
            const { data, error } = await supabase
                .rpc('get_vessel_seat_layout', { vessel_id_param: vesselId });

            if (error) throw error;

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

    // Save custom seat layout using the new simplified approach
    saveCustomSeatLayout: async (vesselId: string, layoutData: any, seats: Seat[]) => {
        set({ loading: { ...get().loading, saveCustomLayout: true }, error: null });

        try {
            // Convert seats to the format expected by the database function
            const seatsData = seats.map(seat => ({
                seat_number: seat.seat_number,
                row_number: seat.row_number,
                position_x: seat.position_x,
                position_y: seat.position_y,
                is_window: seat.is_window,
                is_aisle: seat.is_aisle,
                is_row_aisle: seat.is_row_aisle || false,
                seat_type: seat.seat_type,
                seat_class: seat.seat_class,
                is_disabled: seat.is_disabled,
                is_premium: seat.is_premium,
                price_multiplier: seat.price_multiplier
            }));

            // Use the database function to save the seat layout
            const { error } = await supabase
                .rpc('save_vessel_seat_layout', {
                    vessel_id_param: vesselId,
                    layout_data: layoutData,
                    seats_data: seatsData
                });

            if (error) throw error;

            set({
                seats,
                currentSeats: seats,
                loading: { ...get().loading, saveCustomLayout: false }
            });

            return { seats };
        } catch (error) {
            set({
                error: error instanceof Error ? error.message : 'Failed to save custom seat layout',
                loading: { ...get().loading, saveCustomLayout: false }
            });
            throw error;
        }
    },

    // Create custom seat layout with predefined seats (legacy method for backward compatibility)
    createCustomSeatLayout: async (vesselId: string, layoutData: any, seats: Seat[]) => {
        return get().saveCustomSeatLayout(vesselId, layoutData, seats);
    },

    // ========================================================================
    // FERRY-SPECIFIC SEAT LAYOUT FUNCTIONS
    // ========================================================================

    generateFerryLayout: async (vesselId: string, capacity: number, vesselType: string, layoutConfig?: any) => {
        set({ loading: { ...get().loading, generateLayout: true }, error: null });

        try {
            let layoutData: SeatLayoutFormData;
            let allSeats: Seat[] = [];

            // Check if layoutConfig contains custom seat data
            if (layoutConfig && layoutConfig.floors && layoutConfig.floors[0] && layoutConfig.floors[0].seat_count > 0) {
                // This is a custom layout with predefined seat data
                console.log('Processing custom ferry layout with predefined seats');

                // Extract seat data from the floors
                if (layoutConfig.floors[0].customSeats && layoutConfig.floors[0].customSeats.length > 0) {
                    allSeats = layoutConfig.floors[0].customSeats;
                }

                layoutData = {
                    layout_name: `Custom ${vesselType.charAt(0).toUpperCase() + vesselType.slice(1)} Layout - ${new Date().toLocaleDateString()}`,
                    layout_data: {
                        rows: layoutConfig.rows || layoutConfig.floors[0].rows,
                        columns: layoutConfig.columns || layoutConfig.floors[0].columns,
                        aisles: layoutConfig.aisles || layoutConfig.floors[0].aisles || [],
                        rowAisles: layoutConfig.rowAisles || layoutConfig.floors[0].rowAisles || [],
                        premium_rows: layoutConfig.premium_rows || layoutConfig.floors[0].premium_rows || [],
                        disabled_seats: layoutConfig.disabled_seats || layoutConfig.floors[0].disabled_seats || [],
                        crew_seats: layoutConfig.crew_seats || layoutConfig.floors[0].crew_seats || [],
                        floors: layoutConfig.floors,
                    },
                    seats: allSeats,
                };
            } else {
                // Generate automatic layout
                console.log('Generating automatic ferry layout');
                const optimalConfig = calculateOptimalLayout(capacity, vesselType);
                const ferryLayout = generateFerrySeatLayout(capacity, vesselType, { ...optimalConfig, ...layoutConfig });

                // Generate seats for all floors
                ferryLayout.floors.forEach(floor => {
                    const floorSeats = generateSeatsForFloor(floor, vesselId);
                    allSeats.push(...floorSeats);
                });

                layoutData = {
                    layout_name: `${vesselType.charAt(0).toUpperCase() + vesselType.slice(1)} Layout - ${new Date().toLocaleDateString()}`,
                    layout_data: {
                        rows: ferryLayout.floors.reduce((sum, floor) => sum + floor.rows, 0),
                        columns: Math.max(...ferryLayout.floors.map(f => f.columns)),
                        aisles: ferryLayout.floors[0]?.aisles || [],
                        rowAisles: ferryLayout.floors.flatMap(f => f.rowAisles || []),
                        premium_rows: ferryLayout.floors.flatMap(f => f.premium_rows),
                        disabled_seats: ferryLayout.floors.flatMap(f => f.disabled_seats),
                        crew_seats: ferryLayout.floors.flatMap(f => f.crew_seats),
                        floors: ferryLayout.floors,
                    },
                    seats: allSeats,
                };
            }

            // Save layout to database
            const result = await get().saveCustomSeatLayout(vesselId, layoutData.layout_data, allSeats);

            set({
                seats: allSeats,
                currentSeats: allSeats,
                loading: { ...get().loading, generateLayout: false }
            });

            return { seats: allSeats };
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
        if (!query.trim() || !items || !Array.isArray(items)) return items || [];

        const searchTerm = query.toLowerCase();
        return items.filter(item =>
            item && (
                (item.name && item.name.toLowerCase().includes(searchTerm)) ||
                (item.registration_number && item.registration_number.toLowerCase().includes(searchTerm)) ||
                (item.captain_name && item.captain_name.toLowerCase().includes(searchTerm)) ||
                (item.vessel_type && item.vessel_type.toLowerCase().includes(searchTerm))
            )
        );
    },

    filterItems: (items, filters) => {
        if (!items || !Array.isArray(items)) return [];

        let filtered = items.filter(item => item); // Remove any null/undefined items

        if (filters.status && filters.status !== 'all') {
            filtered = filtered.filter(item => item && item.status === filters.status);
        }

        if (filters.is_active !== undefined && filters.is_active !== null) {
            filtered = filtered.filter(item => item && item.is_active === filters.is_active);
        }

        if (filters.min_capacity) {
            filtered = filtered.filter(item => item && item.seating_capacity >= filters.min_capacity!);
        }

        if (filters.max_capacity) {
            filtered = filtered.filter(item => item && item.seating_capacity <= filters.max_capacity!);
        }

        if (filters.has_trips !== undefined) {
            filtered = filtered.filter(item =>
                item && (filters.has_trips ? (item.total_trips_30d || 0) > 0 : (item.total_trips_30d || 0) === 0)
            );
        }

        return filtered;
    },

    sortItems: (items, sortBy, order) => {
        if (!items || !Array.isArray(items)) return [];

        return [...items].filter(item => item).sort((a, b) => {
            if (!a || !b) return 0;

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
        if (data && Array.isArray(data)) {
            data.forEach(vessel => {
                if (vessel) {
                    const status = vessel.status || 'active';
                    if (!vesselsByStatus[status]) {
                        vesselsByStatus[status] = [];
                    }
                    vesselsByStatus[status].push(vessel);
                }
            });
        }

        // Calculate stats
        const validData = data && Array.isArray(data) ? data.filter(v => v) : [];
        const stats = {
            total: validData.length,
            active: validData.filter(v => v && v.is_active).length,
            inactive: validData.filter(v => v && !v.is_active).length,
            maintenance: validData.filter(v => v && v.status === 'maintenance').length,
            totalTrips30d: validData.reduce((sum, v) => sum + (v?.total_trips_30d || 0), 0),
            totalBookings30d: validData.reduce((sum, v) => sum + (v?.total_bookings_30d || 0), 0),
            totalRevenue30d: validData.reduce((sum, v) => sum + (v?.total_revenue_30d || 0), 0),
            avgUtilization: validData.length > 0
                ? validData.reduce((sum, v) => sum + (v?.capacity_utilization_30d || 0), 0) / validData.length
                : 0,
            avgCapacity: validData.length > 0
                ? validData.reduce((sum, v) => sum + (v?.seating_capacity || 0), 0) / validData.length
                : 0,
            totalCapacity: validData.reduce((sum, v) => sum + (v?.seating_capacity || 0), 0),
        };

        set({
            filteredVessels: filtered,
            sortedVessels: sorted,
            vesselsByStatus,
            stats
        });
    },
}));
