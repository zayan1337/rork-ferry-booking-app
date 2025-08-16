// Common skeleton components
export {
  default as Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonContainer,
} from './common/Skeleton';

// Agent-specific skeleton components
export * from './agent/dashboard';

// Page-specific skeleton layouts
export {
  SkeletonBookingsPage,
  SkeletonClientsPage,
  SkeletonCreditPage,
  SkeletonDashboardPage,
  SkeletonProfilePage,
} from './agent/pages';
