import { Vessel, VesselFormData, VesselValidationErrors, VesselFilters } from "@/types/operations";

/**
 * Validates vessel form data
 */
export const validateVesselForm = (formData: VesselFormData): VesselValidationErrors => {
    const errors: VesselValidationErrors = {};

    // Name validation
    if (!formData.name || formData.name.trim().length < 2) {
        errors.name = "Vessel name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
        errors.name = "Vessel name cannot exceed 100 characters";
    }

    // Registration number validation
    if (!formData.registration_number || formData.registration_number.trim().length === 0) {
        errors.registration_number = "Registration number is required";
    } else if (formData.registration_number.trim().length > 20) {
        errors.registration_number = "Registration number cannot exceed 20 characters";
    }

    // Capacity validation
    if (!formData.capacity || formData.capacity <= 0) {
        errors.capacity = "Total capacity must be greater than 0";
    } else if (formData.capacity > 1000) {
        errors.capacity = "Total capacity cannot exceed 1000";
    }

    // Seating capacity validation
    if (!formData.seating_capacity || formData.seating_capacity <= 0) {
        errors.seating_capacity = "Seating capacity must be greater than 0";
    } else if (formData.seating_capacity > formData.capacity) {
        errors.seating_capacity = "Seating capacity cannot exceed total capacity";
    }

    // Crew capacity validation
    if (!formData.crew_capacity || formData.crew_capacity <= 0) {
        errors.crew_capacity = "Crew capacity must be greater than 0";
    } else if (formData.crew_capacity > 50) {
        errors.crew_capacity = "Crew capacity cannot exceed 50";
    }

    // Year built validation
    if (formData.year_built) {
        const currentYear = new Date().getFullYear();
        if (formData.year_built < 1900 || formData.year_built > currentYear) {
            errors.year_built = `Year built must be between 1900 and ${currentYear}`;
        }
    }

    // Specifications validation
    if (formData.specifications) {
        const specs = formData.specifications;
        const specErrors: any = {};

        if (specs.length && (specs.length <= 0 || specs.length > 200)) {
            specErrors.length = "Length must be between 0 and 200 meters";
        }

        if (specs.width && (specs.width <= 0 || specs.width > 50)) {
            specErrors.width = "Width must be between 0 and 50 meters";
        }

        if (specs.max_speed && (specs.max_speed <= 0 || specs.max_speed > 100)) {
            specErrors.max_speed = "Max speed must be between 0 and 100 knots";
        }

        if (specs.fuel_capacity && (specs.fuel_capacity <= 0 || specs.fuel_capacity > 100000)) {
            specErrors.fuel_capacity = "Fuel capacity must be between 0 and 100,000 liters";
        }

        if (specs.engine_type && specs.engine_type.trim().length > 50) {
            specErrors.engine_type = "Engine type cannot exceed 50 characters";
        }

        if (Object.keys(specErrors).length > 0) {
            errors.specifications = specErrors;
        }
    }

    return errors;
};

/**
 * Formats vessel capacity for display
 */
export const formatVesselCapacity = (vessel: Vessel): string => {
    const { seating_capacity, crew_capacity, capacity } = vessel;
    return `${seating_capacity} pax + ${crew_capacity} crew (${capacity} total)`;
};

/**
 * Gets vessel age in years
 */
export const getVesselAge = (vessel: Vessel): number => {
    if (!vessel.year_built) return 0;
    return new Date().getFullYear() - vessel.year_built;
};

/**
 * Formats vessel age for display
 */
export const formatVesselAge = (vessel: Vessel): string => {
    const age = getVesselAge(vessel);
    if (age === 0) return "Unknown";
    return `${age} ${age === 1 ? "year" : "years"} old`;
};

/**
 * Gets vessel efficiency rating based on utilization and age
 */
export const getVesselEfficiencyRating = (vessel: Vessel): "excellent" | "good" | "fair" | "poor" => {
    const utilization = vessel.capacity_utilization_30d || 0;
    const age = getVesselAge(vessel);

    let score = 0;

    // Utilization score (0-50 points)
    if (utilization >= 80) score += 50;
    else if (utilization >= 60) score += 40;
    else if (utilization >= 40) score += 30;
    else if (utilization >= 20) score += 20;
    else score += 10;

    // Age score (0-30 points)
    if (age <= 5) score += 30;
    else if (age <= 10) score += 25;
    else if (age <= 15) score += 20;
    else if (age <= 20) score += 15;
    else score += 10;

    // Status score (0-20 points)
    if (vessel.status === "active") score += 20;
    else if (vessel.status === "maintenance") score += 10;
    else score += 0;

    if (score >= 85) return "excellent";
    if (score >= 70) return "good";
    if (score >= 50) return "fair";
    return "poor";
};

/**
 * Calculates vessel utilization percentage
 */
export const calculateVesselUtilization = (vessel: Vessel): number => {
    return vessel.capacity_utilization_30d || 0;
};

/**
 * Formats vessel specifications for display
 */
export const formatVesselSpecifications = (vessel: Vessel): string[] => {
    const specs = vessel.specifications;
    if (!specs) return [];

    const formatted: string[] = [];

    if (specs.length) formatted.push(`Length: ${specs.length}m`);
    if (specs.width) formatted.push(`Width: ${specs.width}m`);
    if (specs.max_speed) formatted.push(`Max Speed: ${specs.max_speed} knots`);
    if (specs.fuel_capacity) formatted.push(`Fuel Capacity: ${specs.fuel_capacity}L`);
    if (specs.engine_type) formatted.push(`Engine: ${specs.engine_type}`);

    return formatted;
};

/**
 * Filters vessels based on criteria
 */
export const filterVessels = (vessels: Vessel[], filters: VesselFilters): Vessel[] => {
    return vessels.filter(vessel => {
        // Status filter
        if (filters.status && filters.status !== "all" && vessel.status !== filters.status) {
            return false;
        }

        // Vessel type filter
        if (filters.vessel_type && filters.vessel_type !== "all" && vessel.vessel_type !== filters.vessel_type) {
            return false;
        }

        // Capacity range filter
        if (filters.capacity_range) {
            if (vessel.seating_capacity < filters.capacity_range.min || vessel.seating_capacity > filters.capacity_range.max) {
                return false;
            }
        }

        // Year range filter
        if (filters.year_range && vessel.year_built) {
            if (vessel.year_built < filters.year_range.min || vessel.year_built > filters.year_range.max) {
                return false;
            }
        }

        return true;
    });
};

/**
 * Searches vessels by text
 */
export const searchVessels = (vessels: Vessel[], searchTerm: string): Vessel[] => {
    if (!searchTerm.trim()) return vessels;

    const term = searchTerm.toLowerCase().trim();

    return vessels.filter(vessel =>
        vessel.name.toLowerCase().includes(term) ||
        vessel.registration_number.toLowerCase().includes(term) ||
        vessel.vessel_type.toLowerCase().includes(term) ||
        vessel.manufacturer?.toLowerCase().includes(term) ||
        vessel.specifications?.engine_type?.toLowerCase().includes(term)
    );
};

/**
 * Gets vessel maintenance status
 */
export const getVesselMaintenanceStatus = (vessel: Vessel): "overdue" | "due_soon" | "up_to_date" => {
    if (!vessel.next_maintenance) return "up_to_date";

    const nextMaintenance = new Date(vessel.next_maintenance);
    const now = new Date();
    const daysUntilMaintenance = Math.ceil((nextMaintenance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilMaintenance < 0) return "overdue";
    if (daysUntilMaintenance <= 30) return "due_soon";
    return "up_to_date";
};

/**
 * Gets vessel performance metrics
 */
export const getVesselPerformanceMetrics = (vessel: Vessel) => {
    const trips = vessel.total_trips_30d || 0;
    const utilization = vessel.capacity_utilization_30d || 0;
    const revenue = vessel.total_revenue_30d || 0;
    const maintenanceCost = vessel.maintenance_cost_30d || 0;
    const fuelConsumption = vessel.fuel_consumption_30d || 0;
    const rating = vessel.average_rating || 0;

    return {
        tripsPerDay: trips / 30,
        utilizationRate: utilization,
        revenuePerTrip: trips > 0 ? revenue / trips : 0,
        maintenanceCostPerTrip: trips > 0 ? maintenanceCost / trips : 0,
        fuelConsumptionPerTrip: trips > 0 ? fuelConsumption / trips : 0,
        profitMargin: revenue > 0 ? ((revenue - maintenanceCost) / revenue) * 100 : 0,
        customerSatisfaction: rating,
        efficiency: utilization > 0 ? (revenue / utilization) * 100 : 0
    };
};

/**
 * Validates vessel uniqueness
 */
export const validateVesselUniqueness = (
    formData: VesselFormData,
    existingVessels: Vessel[],
    currentVesselId?: string
): { nameExists: boolean; registrationExists: boolean } => {
    const nameExists = existingVessels.some(vessel =>
        vessel.id !== currentVesselId &&
        vessel.name.toLowerCase() === formData.name.toLowerCase()
    );

    const registrationExists = existingVessels.some(vessel =>
        vessel.id !== currentVesselId &&
        vessel.registration_number.toLowerCase() === formData.registration_number.toLowerCase()
    );

    return { nameExists, registrationExists };
};

/**
 * Estimates vessel operating costs
 */
export const estimateVesselOperatingCosts = (vessel: Vessel): {
    fuelCost: number;
    maintenanceCost: number;
    crewCost: number;
    totalCost: number;
} => {
    const fuelConsumption = vessel.fuel_consumption_30d || 0;
    const fuelPricePerLiter = 15; // MVR per liter (estimated)
    const maintenanceCost = vessel.maintenance_cost_30d || 0;
    const crewCost = vessel.crew_capacity * 30 * 8000; // 8000 MVR per crew member per month

    const fuelCost = fuelConsumption * fuelPricePerLiter;
    const totalCost = fuelCost + maintenanceCost + crewCost;

    return {
        fuelCost,
        maintenanceCost,
        crewCost,
        totalCost
    };
};

/**
 * Gets vessel type information
 */
export const getVesselTypeInfo = (vesselType: string): {
    displayName: string;
    description: string;
    typicalCapacity: string;
    advantages: string[];
} => {
    const typeMap = {
        speedboat: {
            displayName: "Speedboat",
            description: "Fast passenger vessel for short-distance travel",
            typicalCapacity: "10-40 passengers",
            advantages: ["Fast travel", "Efficient fuel use", "Maneuverable"]
        },
        dhoni: {
            displayName: "Dhoni",
            description: "Traditional Maldivian boat",
            typicalCapacity: "8-20 passengers",
            advantages: ["Cultural significance", "Stable in calm waters", "Cost-effective"]
        },
        seaplane: {
            displayName: "Seaplane",
            description: "Aircraft for scenic water-to-water travel",
            typicalCapacity: "15-50 passengers",
            advantages: ["Scenic views", "Very fast", "Direct routes"]
        },
        ferry: {
            displayName: "Ferry",
            description: "Large passenger and cargo vessel",
            typicalCapacity: "50-200 passengers",
            advantages: ["High capacity", "Stable", "Can carry vehicles"]
        },
        yacht: {
            displayName: "Yacht",
            description: "Luxury passenger vessel",
            typicalCapacity: "10-50 passengers",
            advantages: ["Luxury experience", "Comfortable", "Premium service"]
        }
    };

    return typeMap[vesselType as keyof typeof typeMap] || {
        displayName: vesselType,
        description: "Unknown vessel type",
        typicalCapacity: "Unknown",
        advantages: []
    };
};

// All functions are already exported individually above 