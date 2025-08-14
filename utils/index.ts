export * from './supabase';
export * from './dateUtils';
export * from './currencyUtils';
export * from './bookingUtils';
export * from './customerUtils';
export * from './faqUtils';
export * from './paymentUtils';
export * from './qrCodeUtils';
export * from './seatSelectionUtils';
export * from './clientUtils';

// Agent utilities with explicit re-exports to avoid conflicts
export * from './agentUtils';
export {
  formatCurrency as agentFormatCurrency,
  formatBookingDate as agentFormatBookingDate,
  formatAgentId as agentFormatAgentId,
  isAgentCreditLow as agentIsAgentCreditLow,
} from './agentFormatters';
export * from './agentDashboard';
export {
  formatBookingDate as bookingDetailsFormatBookingDate,
  shareBookingTicket as bookingDetailsShareBookingTicket,
} from './bookingDetailsUtils';
export * from './bookingFormUtils';
export { shareBookingTicket as shareUtilsShareBookingTicket } from './shareUtils';

// Dashboard utilities with explicit re-exports
export {
  formatCurrency as dashboardFormatCurrency,
  formatTime as dashboardFormatTime,
  getResponsivePadding as dashboardGetResponsivePadding,
  getResponsiveDimensions,
} from './dashboardUtils';

// Settings utilities with explicit re-exports
export {
  getUserInitials as settingsGetUserInitials,
  getResponsivePadding as settingsGetResponsivePadding,
} from './settingsUtils';

// Operations utilities
// export * from './routeUtils';
// export * from './vesselUtils';
export * from './tripUtils';
export * from './islandUtils';

// User management utilities
export * from './userManagementUtils';
export * from './admin/userManagementUtils';
