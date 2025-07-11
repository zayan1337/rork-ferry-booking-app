import { useState, useMemo } from "react";
import { useAdminStore } from "@/store/admin/adminStore";
import { OperationsSection, OperationsStatsData } from "@/types/admin/dashboard";

export const useOperationsData = () => {
    const {
        routes,
        trips,
        vessels,
        loading,
        searchQueries,
        setSearchQuery,
    } = useAdminStore();

    const [activeSection, setActiveSection] = useState<OperationsSection>("routes");

    // Calculate statistics
    const stats: OperationsStatsData = useMemo(() => {
        const activeRoutes = routes.filter(r => r.status === "active").length;
        const activeVessels = vessels.filter(v => v.status === "active").length;
        const todayTrips = trips.filter(t =>
            t.travel_date === new Date().toISOString().split('T')[0] && t.is_active
        ).length;
        const totalCapacity = vessels.reduce((sum, v) => sum + v.seating_capacity, 0);

        return {
            activeRoutes,
            totalRoutes: routes.length,
            activeVessels,
            totalVessels: vessels.length,
            todayTrips,
            totalCapacity,
        };
    }, [routes, vessels, trips]);

    // Filtered data based on search queries
    const filteredRoutes = useMemo(() => {
        const query = searchQueries.routes?.toLowerCase() || "";
        if (!query) return routes.slice(0, 5);

        return routes.filter(route =>
            route.name.toLowerCase().includes(query) ||
            route.origin.toLowerCase().includes(query) ||
            route.destination.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [routes, searchQueries.routes]);

    const filteredTrips = useMemo(() => {
        const query = searchQueries.trips?.toLowerCase() || "";
        if (!query) return trips.slice(0, 5);

        return trips.filter(trip =>
            trip.routeName?.toLowerCase().includes(query) ||
            trip.vesselName?.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [trips, searchQueries.trips]);

    const filteredVessels = useMemo(() => {
        const query = searchQueries.vessels?.toLowerCase() || "";
        if (!query) return vessels.slice(0, 5);

        return vessels.filter(vessel =>
            vessel.name.toLowerCase().includes(query)
        ).slice(0, 5);
    }, [vessels, searchQueries.vessels]);

    const todaySchedule = useMemo(() => {
        return trips
            .filter(t => t.travel_date === new Date().toISOString().split('T')[0])
            .slice(0, 6);
    }, [trips]);

    return {
        stats,
        activeSection,
        setActiveSection,
        filteredRoutes,
        filteredTrips,
        filteredVessels,
        todaySchedule,
        searchQueries,
        setSearchQuery,
        loading,
    };
}; 