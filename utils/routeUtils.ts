import { Route, RouteFormData, RouteValidationErrors, RouteFilters, Island } from "@/types/operations";

/**
 * Validates route form data
 */
export const validateRouteForm = (formData: RouteFormData): RouteValidationErrors => {
    const errors: RouteValidationErrors = {};

    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
        errors.name = "Route name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
        errors.name = "Route name cannot exceed 100 characters";
    }

    // Island validation
    if (!formData.from_island_id || formData.from_island_id.trim().length === 0) {
        errors.from_island_id = "Origin island is required";
    }

    if (!formData.to_island_id || formData.to_island_id.trim().length === 0) {
        errors.to_island_id = "Destination island is required";
    }

    if (formData.from_island_id === formData.to_island_id) {
        errors.to_island_id = "Origin and destination islands cannot be the same";
    }

    // Distance validation
    if (!formData.distance || formData.distance.trim().length === 0) {
        errors.distance = "Distance is required";
    } else {
        const distanceNum = parseFloat(formData.distance.replace(/[^\d.]/g, ""));
        if (isNaN(distanceNum) || distanceNum <= 0) {
            errors.distance = "Distance must be a positive number";
        } else if (distanceNum > 1000) {
            errors.distance = "Distance cannot exceed 1000 km";
        }
    }

    // Duration validation
    if (!formData.duration || formData.duration.trim().length === 0) {
        errors.duration = "Duration is required";
    } else {
        const durationRegex = /^(?:(\d+)h\s*)?(?:(\d+)m)?$/;
        if (!durationRegex.test(formData.duration.trim())) {
            errors.duration = "Duration must be in format '2h 30m' or '45m'";
        }
    }

    // Base fare validation
    if (!formData.base_fare || formData.base_fare <= 0) {
        errors.base_fare = "Base fare must be greater than 0";
    } else if (formData.base_fare > 10000) {
        errors.base_fare = "Base fare cannot exceed MVR 10,000";
    }

    return errors;
};

/**
 * Formats route distance for display
 */
export const formatRouteDistance = (distance: string): string => {
    const distanceNum = parseFloat(distance.replace(/[^\d.]/g, ""));
    if (isNaN(distanceNum)) return distance;

    if (distanceNum >= 1) {
        return `${distanceNum.toFixed(1)} km`;
    } else {
        return `${(distanceNum * 1000).toFixed(0)} m`;
    }
};

/**
 * Formats route duration for display
 */
export const formatRouteDuration = (duration: string): string => {
    const durationRegex = /^(?:(\d+)h\s*)?(?:(\d+)m)?$/;
    const match = duration.match(durationRegex);

    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return duration;
    }
};

/**
 * Converts duration string to minutes
 */
export const durationToMinutes = (duration: string): number => {
    const durationRegex = /^(?:(\d+)h\s*)?(?:(\d+)m)?$/;
    const match = duration.match(durationRegex);

    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    return hours * 60 + minutes;
};

/**
 * Converts minutes to duration string
 */
export const minutesToDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0 && remainingMinutes > 0) {
        return `${hours}h ${remainingMinutes}m`;
    } else if (hours > 0) {
        return `${hours}h`;
    } else {
        return `${remainingMinutes}m`;
    }
};

/**
 * Generates route display name
 */
export const generateRouteDisplayName = (fromIsland: Island, toIsland: Island): string => {
    return `${fromIsland.name} → ${toIsland.name}`;
};

/**
 * Calculates estimated fare based on distance and base rate
 */
export const calculateEstimatedFare = (distance: string, baseRatePerKm: number = 10): number => {
    const distanceNum = parseFloat(distance.replace(/[^\d.]/g, ""));
    if (isNaN(distanceNum)) return 0;

    const baseFare = distanceNum * baseRatePerKm;
    return Math.max(baseFare, 25); // Minimum fare of MVR 25
};

/**
 * Filters routes based on criteria
 */
export const filterRoutes = (routes: Route[], filters: RouteFilters): Route[] => {
    return routes.filter(route => {
        // Status filter
        if (filters.status && filters.status !== "all" && route.status !== filters.status) {
            return false;
        }

        // From island filter
        if (filters.from_island_id && route.from_island_id !== filters.from_island_id) {
            return false;
        }

        // To island filter
        if (filters.to_island_id && route.to_island_id !== filters.to_island_id) {
            return false;
        }

        // Fare range filter
        if (filters.fare_range) {
            if (route.base_fare < filters.fare_range.min || route.base_fare > filters.fare_range.max) {
                return false;
            }
        }

        // Distance range filter
        if (filters.distance_range) {
            const distance = parseFloat(route.distance.replace(/[^\d.]/g, ""));
            if (!isNaN(distance)) {
                if (distance < filters.distance_range.min || distance > filters.distance_range.max) {
                    return false;
                }
            }
        }

        return true;
    });
};

/**
 * Searches routes by text
 */
export const searchRoutes = (routes: Route[], searchTerm: string): Route[] => {
    if (!searchTerm.trim()) return routes;

    const term = searchTerm.toLowerCase().trim();

    return routes.filter(route =>
        route.name.toLowerCase().includes(term) ||
        route.origin.toLowerCase().includes(term) ||
        route.destination.toLowerCase().includes(term) ||
        route.from_island?.name.toLowerCase().includes(term) ||
        route.to_island?.name.toLowerCase().includes(term) ||
        route.distance.toLowerCase().includes(term) ||
        route.duration.toLowerCase().includes(term)
    );
};

/**
 * Gets route popularity level based on statistics
 */
export const getRoutePopularityLevel = (route: Route): "low" | "medium" | "high" => {
    const trips = route.total_trips_30d || 0;
    const bookings = route.total_bookings_30d || 0;

    if (trips >= 30 && bookings >= 300) return "high";
    if (trips >= 15 && bookings >= 150) return "medium";
    return "low";
};

/**
 * Gets route performance metrics
 */
export const getRoutePerformanceMetrics = (route: Route) => {
    const trips = route.total_trips_30d || 0;
    const bookings = route.total_bookings_30d || 0;
    const revenue = route.total_revenue_30d || 0;
    const occupancy = route.average_occupancy_30d || 0;
    const cancellationRate = route.cancellation_rate_30d || 0;

    return {
        tripsPerDay: trips / 30,
        bookingsPerTrip: trips > 0 ? bookings / trips : 0,
        revenuePerTrip: trips > 0 ? revenue / trips : 0,
        occupancyRate: occupancy,
        cancellationRate: cancellationRate,
        efficiency: occupancy > 0 ? (100 - cancellationRate) * (occupancy / 100) : 0
    };
};

/**
 * Validates route uniqueness
 */
export const validateRouteUniqueness = (
    formData: RouteFormData,
    existingRoutes: Route[],
    currentRouteId?: string
): boolean => {
    return !existingRoutes.some(route =>
        route.id !== currentRouteId &&
        route.from_island_id === formData.from_island_id &&
        route.to_island_id === formData.to_island_id &&
        route.name.toLowerCase() === formData.name.toLowerCase()
    );
};

/**
 * Generates route suggestions based on existing routes
 */
export const generateRouteSuggestions = (
    islands: Island[],
    existingRoutes: Route[]
): { from: Island; to: Island; estimatedFare: number }[] => {
    const suggestions: { from: Island; to: Island; estimatedFare: number }[] = [];

    // Find island pairs that don't have routes yet
    for (const fromIsland of islands) {
        for (const toIsland of islands) {
            if (fromIsland.id !== toIsland.id) {
                const routeExists = existingRoutes.some(route =>
                    route.from_island_id === fromIsland.id && route.to_island_id === toIsland.id
                );

                if (!routeExists) {
                    // Estimate distance based on zone differences (simplified)
                    const estimatedDistance = fromIsland.zone === toIsland.zone ? 15 : 45;
                    const estimatedFare = calculateEstimatedFare(estimatedDistance.toString());

                    suggestions.push({
                        from: fromIsland,
                        to: toIsland,
                        estimatedFare
                    });
                }
            }
        }
    }

    return suggestions.slice(0, 10); // Return top 10 suggestions
};

// All functions are already exported individually above 