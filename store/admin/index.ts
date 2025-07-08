// New specialized admin stores
export { useAdminDashboardStore } from './adminDashboardStore';
export { useAdminBookingsStore } from './adminBookingsStore';
export { useAdminUsersStore } from './adminUsersStore';
export { useAdminVesselsStore } from './adminVesselsStore';
export { useAdminRoutesStore } from './adminRoutesStore';
export { useAdminTripsStore } from './adminTripsStore';
export { useAdminPermissionsStore } from './adminPermissionsStore';

// Legacy monolithic store (for backward compatibility during transition)
export { useAdminStore } from './adminStore';

// Re-export admin types for convenience
export type {
    AdminUser,
    AdminBooking,
    AdminRoute,
    AdminVessel,
    AdminTrip,
    AdminIsland,
    AdminPayment,
    AdminCancellation,
    AdminAlert,
    AdminDashboardStats,
    AdminUserFilters,
    AdminBookingFilters,
    AdminRouteFilters,
    AdminVesselFilters,
    AdminTripFilters,
} from '@/types/admin'; 