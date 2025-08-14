// Common skeleton components
export {
  default as Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonContainer,
} from './common/Skeleton';

// Agent-specific skeleton components
export * from './agent/dashboard';

// Enhanced component-specific skeletons that match exact layouts
export {
  SkeletonAgentInfo,
  SkeletonAgentBookingCard,
  SkeletonClientCard,
  SkeletonCreditTransactionCard,
  SkeletonStat,
  SkeletonDashboardHeader,
  SkeletonSearchHeader,
  SkeletonTabNavigation,
  SkeletonStatsContainer,
  SkeletonCreditSummary,
  SkeletonTransactionSummary,
  SkeletonClientStats,
  // New granular components for inline use
  SkeletonAgentInfoSection,
  SkeletonStatsSection,
  SkeletonRecentBookingsList,
  SkeletonBookingsList,
  SkeletonClientsList,
  SkeletonCreditTransactionsList,
} from './agent/dashboard';

// Page-specific skeleton layouts
export {
  SkeletonBookingsPage,
  SkeletonClientsPage,
  SkeletonCreditPage,
  SkeletonDashboardPage,
  SkeletonProfilePage,
} from './agent/pages';
