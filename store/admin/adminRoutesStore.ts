import { create } from 'zustand';
import { AdminRoute, AdminIsland, AdminPagination } from '@/types/admin';

interface RouteFilters {
    status?: boolean;
    from_island_id?: string;
    to_island_id?: string;
    search?: string;
}

interface AdminRoutesState {
    routes: AdminRoute[];
    islands: AdminIsland[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    filters: RouteFilters;
    selectedRoutes: string[];

    // Actions
    setRoutes: (routes: AdminRoute[]) => void;
    setIslands: (islands: AdminIsland[]) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setPagination: (pagination: AdminPagination) => void;
    setFilters: (filters: RouteFilters) => void;
    updateRoute: (routeId: string, updates: Partial<AdminRoute>) => void;
    removeRoute: (routeId: string) => void;
    addRoute: (route: AdminRoute) => void;
    setSelectedRoutes: (routeIds: string[]) => void;
    toggleRouteSelection: (routeId: string) => void;
    selectAllRoutes: () => void;
    clearRouteSelection: () => void;
    clearState: () => void;

    // Filter helpers
    getActiveRoutes: () => AdminRoute[];
    getInactiveRoutes: () => AdminRoute[];
    getRoutesByIsland: (islandId: string) => AdminRoute[];
}

const initialState = {
    routes: [],
    islands: [],
    loading: false,
    error: null,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0
    },
    filters: {},
    selectedRoutes: []
};

export const useAdminRoutesStore = create<AdminRoutesState>((set, get) => ({
    ...initialState,

    setRoutes: (routes) => set({ routes }),

    setIslands: (islands) => set({ islands }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    setPagination: (pagination) => set({ pagination }),

    setFilters: (filters) => set({ filters }),

    updateRoute: (routeId, updates) => set((state) => ({
        routes: state.routes.map(route =>
            route.id === routeId ? { ...route, ...updates } : route
        )
    })),

    removeRoute: (routeId) => set((state) => ({
        routes: state.routes.filter(route => route.id !== routeId),
        selectedRoutes: state.selectedRoutes.filter(id => id !== routeId),
        pagination: {
            ...state.pagination,
            total: Math.max(0, state.pagination.total - 1)
        }
    })),

    addRoute: (route) => set((state) => ({
        routes: [route, ...state.routes],
        pagination: {
            ...state.pagination,
            total: state.pagination.total + 1
        }
    })),

    setSelectedRoutes: (routeIds) => set({ selectedRoutes: routeIds }),

    toggleRouteSelection: (routeId) => set((state) => {
        const isSelected = state.selectedRoutes.includes(routeId);
        return {
            selectedRoutes: isSelected
                ? state.selectedRoutes.filter(id => id !== routeId)
                : [...state.selectedRoutes, routeId]
        };
    }),

    selectAllRoutes: () => set((state) => ({
        selectedRoutes: state.routes.map(route => route.id)
    })),

    clearRouteSelection: () => set({ selectedRoutes: [] }),

    clearState: () => set(initialState),

    // Filter helpers
    getActiveRoutes: () => get().routes.filter(route => route.is_active),

    getInactiveRoutes: () => get().routes.filter(route => !route.is_active),

    getRoutesByIsland: (islandId) => get().routes.filter(route =>
        route.from_island_id === islandId || route.to_island_id === islandId
    )
})); 