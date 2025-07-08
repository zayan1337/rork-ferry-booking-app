import { create } from 'zustand';
import { AdminVessel, AdminPagination } from '@/types/admin';

interface VesselFilters {
    status?: boolean;
    search?: string;
}

interface AdminVesselsState {
    vessels: AdminVessel[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    filters: VesselFilters;
    selectedVessels: string[];

    // Actions
    setVessels: (vessels: AdminVessel[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPagination: (pagination: AdminPagination) => void;
    setFilters: (filters: VesselFilters) => void;
    updateVessel: (vesselId: string, updates: Partial<AdminVessel>) => void;
    removeVessel: (vesselId: string) => void;
    addVessel: (vessel: AdminVessel) => void;
    setSelectedVessels: (vesselIds: string[]) => void;
    toggleVesselSelection: (vesselId: string) => void;
    selectAllVessels: () => void;
    clearVesselSelection: () => void;
    clearState: () => void;

    // Filter helpers
    getActiveVessels: () => AdminVessel[];
    getInactiveVessels: () => AdminVessel[];
    getVesselsByCapacityRange: (minCapacity: number, maxCapacity: number) => AdminVessel[];
}

const initialState = {
    vessels: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0
    },
    filters: {},
    selectedVessels: []
};

export const useAdminVesselsStore = create<AdminVesselsState>((set, get) => ({
    ...initialState,

    setVessels: (vessels) => set({ vessels }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    setPagination: (pagination) => set({ pagination }),

    setFilters: (filters) => set({ filters }),

    updateVessel: (vesselId, updates) => set((state) => ({
        vessels: state.vessels.map(vessel =>
            vessel.id === vesselId ? { ...vessel, ...updates } : vessel
        )
    })),

    removeVessel: (vesselId) => set((state) => ({
        vessels: state.vessels.filter(vessel => vessel.id !== vesselId),
        selectedVessels: state.selectedVessels.filter(id => id !== vesselId),
        pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1)
        }
    })),

    addVessel: (vessel) => set((state) => ({
        vessels: [vessel, ...state.vessels],
        pagination: {
            ...state.pagination,
            total: state.pagination.total + 1
        }
    })),

    setSelectedVessels: (vesselIds) => set({ selectedVessels: vesselIds }),

    toggleVesselSelection: (vesselId) => set((state) => {
        const isSelected = state.selectedVessels.includes(vesselId);
        return {
            selectedVessels: isSelected
                ? state.selectedVessels.filter(id => id !== vesselId)
                : [...state.selectedVessels, vesselId]
        };
    }),

    selectAllVessels: () => set((state) => ({
        selectedVessels: state.vessels.map(vessel => vessel.id)
    })),

    clearVesselSelection: () => set({ selectedVessels: [] }),

    clearState: () => set(initialState),

    // Filter helpers
    getActiveVessels: () => get().vessels.filter(vessel => vessel.is_active),

    getInactiveVessels: () => get().vessels.filter(vessel => !vessel.is_active),

    getVesselsByCapacityRange: (minCapacity, maxCapacity) =>
        get().vessels.filter(vessel =>
            vessel.seating_capacity >= minCapacity && vessel.seating_capacity <= maxCapacity
        )
})); 