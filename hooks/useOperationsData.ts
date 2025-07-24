import { useState, useMemo, useEffect } from "react";
import { useOperationsStore } from "@/store/admin/operationsStore";
import { OperationsSection } from "@/types/admin/dashboard";

export const useOperationsData = () => {
    const {
        routes,
        trips,
        vessels,
        todaySchedule,
        loading,
        searchQueries,
        stats,
        setSearchQuery,
        fetchRoutes,
        fetchTrips,
        fetchVessels,
        fetchTodaySchedule,
        refreshAll,
    } = useOperationsStore();

    const [activeSection, setActiveSection] = useState<OperationsSection>("routes");

    // Initialize data on first load
    useEffect(() => {
        if (routes.length === 0 && trips.length === 0 && vessels.length === 0) {
            refreshAll();
        }
    }, [routes.length, trips.length, vessels.length, refreshAll]);

    // Filtered data based on search queries
    const filteredRoutes = useMemo(() => {
        const query = searchQueries.routes?.toLowerCase() || "";
        if (!query) return routes.slice(0, 5);

        return routes.filter(route =>
            route.name?.toLowerCase().includes(query) ||
            route.origin?.toLowerCase().includes(query) ||
            route.destination?.toLowerCase().includes(query) ||
            route.route_name?.toLowerCase().includes(query) ||
            route.from_island_name?.toLowerCase().includes(query) ||
            route.to_island_name?.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [routes, searchQueries.routes]);

    const filteredTrips = useMemo(() => {
        const query = searchQueries.trips?.toLowerCase() || "";
        if (!query) return trips.slice(0, 5);

        return trips.filter(trip =>
            trip.routeName?.toLowerCase().includes(query) ||
            trip.vesselName?.toLowerCase().includes(query) ||
            trip.route_name?.toLowerCase().includes(query) ||
            trip.vessel_name?.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [trips, searchQueries.trips]);

    const filteredVessels = useMemo(() => {
        const query = searchQueries.vessels?.toLowerCase() || "";
        if (!query) return vessels.slice(0, 5);

        return vessels.filter(vessel =>
            vessel.name.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [vessels, searchQueries.vessels]);



    // Enhanced stats with real data
    const enhancedStats = useMemo(() => ({
        activeRoutes: stats.activeRoutes,
        totalRoutes: stats.totalRoutes,
        activeVessels: stats.activeVessels,
        totalVessels: stats.totalVessels,
        todayTrips: stats.todayTrips,
        totalCapacity: stats.totalCapacity,
    }), [stats]);

    return {
        stats: enhancedStats,
        activeSection,
        setActiveSection,
        filteredRoutes,
        filteredTrips,
        filteredVessels,
        todaySchedule,
        searchQueries,
        setSearchQuery,
        loading: loading.routes || loading.trips || loading.vessels || loading.schedule,
        // Additional data and functions for detail pages
        allRoutes: routes,
        allTrips: trips,
        allVessels: vessels,
        // Refresh functions
        refreshRoutes: fetchRoutes,
        refreshTrips: fetchTrips,
        refreshVessels: fetchVessels,
        refreshSchedule: fetchTodaySchedule,
        refreshAll,
    };
}; 