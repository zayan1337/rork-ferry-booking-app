import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton, {
  SkeletonText,
  SkeletonCard,
  SkeletonContainer,
} from '../common/Skeleton';
import Colors from '@/constants/colors';

// Agent Info Card Skeleton
export const SkeletonAgentInfo: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={100}>
    <View style={styles.agentInfoContent}>
      <View style={styles.agentInfoHeader}>
        <SkeletonText lines={1} lineHeight={16} delay={delay} />
        <Skeleton width={80} height={24} borderRadius={4} delay={delay + 50} />
      </View>
      <View style={styles.agentInfoRow}>
        <View style={styles.agentInfoItem}>
          <Skeleton width={60} height={12} delay={delay + 100} />
          <Skeleton
            width={80}
            height={16}
            style={{ marginTop: 4 }}
            delay={delay + 150}
          />
        </View>
        <View style={styles.agentInfoItem}>
          <Skeleton width={60} height={12} delay={delay + 200} />
          <Skeleton
            width={40}
            height={16}
            style={{ marginTop: 4 }}
            delay={delay + 250}
          />
        </View>
        <View style={styles.agentInfoItem}>
          <Skeleton width={60} height={12} delay={delay + 300} />
          <Skeleton
            width={30}
            height={16}
            style={{ marginTop: 4 }}
            delay={delay + 350}
          />
        </View>
      </View>
    </View>
  </SkeletonCard>
);

// Enhanced Agent Booking Card Skeleton - matches exact AgentBookingCard layout
export const SkeletonAgentBookingCard: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={140} style={styles.bookingCard}>
    {/* Header: Route and Status */}
    <View style={styles.bookingHeader}>
      <Skeleton width='60%' height={18} delay={delay} />
      <Skeleton width={70} height={20} borderRadius={4} delay={delay + 50} />
    </View>

    {/* Info Row: Date and Passengers */}
    <View style={styles.bookingInfoRow}>
      <View style={styles.bookingInfoItem}>
        <Skeleton width={16} height={16} borderRadius={8} delay={delay + 100} />
        <Skeleton
          width={120}
          height={14}
          style={{ marginLeft: 6 }}
          delay={delay + 150}
        />
      </View>
      <View style={styles.bookingInfoItem}>
        <Skeleton width={16} height={16} borderRadius={8} delay={delay + 200} />
        <Skeleton
          width={80}
          height={14}
          style={{ marginLeft: 6 }}
          delay={delay + 250}
        />
      </View>
    </View>

    {/* Divider */}
    <View style={styles.bookingDivider} />

    {/* Footer: Client Info and Price */}
    <View style={styles.bookingFooter}>
      <View style={styles.bookingClientInfo}>
        <Skeleton width='70%' height={16} delay={delay + 300} />
        <Skeleton
          width='50%'
          height={12}
          style={{ marginTop: 2 }}
          delay={delay + 350}
        />
      </View>
      <View style={styles.bookingPriceInfo}>
        <Skeleton width={60} height={18} delay={delay + 400} />
        <Skeleton
          width={50}
          height={14}
          style={{ marginTop: 2 }}
          delay={delay + 450}
        />
      </View>
    </View>
  </SkeletonCard>
);

// Enhanced Client Card Skeleton - matches exact ClientCard layout
export const SkeletonClientCard: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={120} style={styles.clientCard}>
    {/* Header: Avatar, Name, and Bookings Count */}
    <View style={styles.clientHeader}>
      <Skeleton width={48} height={48} borderRadius={24} delay={delay} />
      <View style={styles.clientInfo}>
        <View style={styles.clientNameRow}>
          <Skeleton width='70%' height={16} delay={delay + 50} />
          <Skeleton
            width={60}
            height={16}
            borderRadius={8}
            delay={delay + 100}
          />
        </View>
        <Skeleton
          width='80%'
          height={14}
          style={{ marginTop: 2 }}
          delay={delay + 150}
        />
      </View>
      <View style={styles.clientBookingsInfo}>
        <Skeleton
          width={40}
          height={24}
          borderRadius={12}
          delay={delay + 200}
        />
        <Skeleton
          width={30}
          height={16}
          borderRadius={8}
          style={{ marginTop: 4 }}
          delay={delay + 250}
        />
      </View>
    </View>

    {/* Divider */}
    <View style={styles.clientDivider} />

    {/* Contact Info */}
    <View style={styles.clientContactInfo}>
      <View style={styles.clientContactRow}>
        <Skeleton width={14} height={14} borderRadius={7} delay={delay + 300} />
        <Skeleton
          width='40%'
          height={12}
          style={{ marginLeft: 6 }}
          delay={delay + 350}
        />
      </View>
      <View style={styles.clientContactRow}>
        <Skeleton width={14} height={14} borderRadius={7} delay={delay + 400} />
        <Skeleton
          width='50%'
          height={12}
          style={{ marginLeft: 6 }}
          delay={delay + 450}
        />
      </View>
    </View>
  </SkeletonCard>
);

// Enhanced Credit Transaction Card Skeleton - matches exact CreditTransactionCard layout
export const SkeletonCreditTransactionCard: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={120} style={styles.transactionCard}>
    <View style={styles.transactionHeader}>
      {/* Enhanced Icon */}
      <Skeleton width={40} height={40} borderRadius={20} delay={delay} />

      <View style={styles.transactionMainContent}>
        {/* Top Row */}
        <View style={styles.transactionTopRow}>
          <View style={styles.transactionTitleSection}>
            {/* Type Label */}
            <Skeleton width={80} height={10} delay={delay + 50} />
            {/* Description */}
            <Skeleton
              width='90%'
              height={15}
              style={{ marginTop: 4 }}
              delay={delay + 100}
            />
          </View>

          {/* Amount Section */}
          <View style={styles.transactionAmountSection}>
            <Skeleton width={80} height={18} delay={delay + 150} />
            <View style={styles.transactionBalanceContainer}>
              <Skeleton
                width={12}
                height={12}
                borderRadius={6}
                delay={delay + 200}
              />
              <Skeleton
                width={60}
                height={12}
                style={{ marginLeft: 4 }}
                delay={delay + 250}
              />
            </View>
          </View>
        </View>

        {/* Metadata Row */}
        <View style={styles.transactionMetadataRow}>
          <View style={styles.transactionLeftMetadata}>
            {/* Date and Time */}
            <View style={styles.transactionDateTimeContainer}>
              <Skeleton
                width={12}
                height={12}
                borderRadius={6}
                delay={delay + 300}
              />
              <Skeleton
                width={70}
                height={12}
                style={{ marginLeft: 4 }}
                delay={delay + 350}
              />
              <Skeleton
                width={12}
                height={12}
                borderRadius={6}
                style={{ marginLeft: 8 }}
                delay={delay + 400}
              />
              <Skeleton
                width={50}
                height={12}
                style={{ marginLeft: 4 }}
                delay={delay + 450}
              />
            </View>

            {/* Booking Number */}
            <View style={styles.transactionBookingContainer}>
              <Skeleton
                width={12}
                height={12}
                borderRadius={6}
                delay={delay + 500}
              />
              <Skeleton
                width={60}
                height={12}
                style={{ marginLeft: 4 }}
                delay={delay + 550}
              />
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.transactionRightMetadata}>
            <Skeleton
              width={50}
              height={20}
              borderRadius={12}
              delay={delay + 600}
            />
          </View>
        </View>
      </View>
    </View>
  </SkeletonCard>
);

// Stat Card Skeleton
export const SkeletonStat: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <SkeletonContainer style={styles.statCard}>
    <View style={styles.statHeader}>
      <Skeleton width={20} height={20} borderRadius={4} delay={delay} />
      <SkeletonText lines={1} lineHeight={14} delay={delay + 50} />
    </View>
    <Skeleton
      width={40}
      height={24}
      style={{ marginTop: 8 }}
      delay={delay + 100}
    />
  </SkeletonContainer>
);

// Dashboard Header Skeleton
export const SkeletonDashboardHeader: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <View style={styles.headerContent}>
    <SkeletonText lines={1} lineHeight={24} delay={delay} />
    <View style={{ marginTop: 4 }}>
      <SkeletonText
        lines={1}
        lineHeight={16}
        lastLineWidth='80%'
        delay={delay + 100}
      />
    </View>
  </View>
);

// Search Header Skeleton - for pages with search functionality
export const SkeletonSearchHeader: React.FC<{
  delay?: number;
  showAddButton?: boolean;
}> = ({ delay = 0, showAddButton = true }) => (
  <View style={styles.searchHeaderContainer}>
    <View style={styles.searchInputContainer}>
      <Skeleton width='100%' height={40} borderRadius={8} delay={delay} />
    </View>
    {showAddButton && (
      <Skeleton
        width={40}
        height={40}
        borderRadius={8}
        style={{ marginLeft: 12 }}
        delay={delay + 50}
      />
    )}
  </View>
);

// Tab Navigation Skeleton
export const SkeletonTabNavigation: React.FC<{
  tabCount?: number;
  delay?: number;
}> = ({ tabCount = 4, delay = 0 }) => (
  <View style={styles.tabContainer}>
    {Array.from({ length: tabCount }).map((_, index) => (
      <Skeleton
        key={`tab-${index}`}
        width={80}
        height={32}
        borderRadius={16}
        style={{ marginRight: 12 }}
        delay={delay + index * 50}
      />
    ))}
  </View>
);

// Stats Summary Skeleton - for client stats
export const SkeletonStatsContainer: React.FC<{ count?: number }> = ({
  count = 8,
}) => (
  <>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonStat key={`stat-skeleton-${index}`} delay={index * 150} />
    ))}
  </>
);

// Credit Summary Card Skeleton
export const SkeletonCreditSummary: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={160} style={{ marginBottom: 16 }}>
    {/* Credit Balance Section */}
    <View style={styles.creditBalanceContainer}>
      <Skeleton width={24} height={24} borderRadius={4} delay={delay} />
      <View style={styles.creditBalanceText}>
        <Skeleton width={120} height={14} delay={delay + 50} />
        <Skeleton
          width={100}
          height={24}
          style={{ marginTop: 4 }}
          delay={delay + 100}
        />
      </View>
    </View>

    {/* Credit Limit Bar */}
    <View style={styles.creditLimitContainer}>
      <Skeleton width='100%' height={8} borderRadius={4} delay={delay + 150} />
      <Skeleton
        width={150}
        height={12}
        style={{ marginTop: 8, alignSelf: 'flex-end' }}
        delay={delay + 200}
      />
    </View>

    {/* Request Credit Button */}
    <Skeleton
      width='100%'
      height={40}
      borderRadius={8}
      style={{ marginTop: 16 }}
      delay={delay + 250}
    />
  </SkeletonCard>
);

// Transaction Summary Card Skeleton
export const SkeletonTransactionSummary: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={80} style={styles.transactionSummaryCard}>
    <View style={styles.transactionSummaryItem}>
      <Skeleton width={32} height={32} borderRadius={16} delay={delay} />
      <View style={{ marginLeft: 12 }}>
        <Skeleton width={80} height={12} delay={delay + 50} />
        <Skeleton
          width={60}
          height={16}
          style={{ marginTop: 4 }}
          delay={delay + 100}
        />
      </View>
    </View>
    <View style={styles.transactionSummaryDivider} />
    <View style={styles.transactionSummaryItem}>
      <Skeleton width={32} height={32} borderRadius={16} delay={delay + 150} />
      <View style={{ marginLeft: 12 }}>
        <Skeleton width={80} height={12} delay={delay + 200} />
        <Skeleton
          width={60}
          height={16}
          style={{ marginTop: 4 }}
          delay={delay + 250}
        />
      </View>
    </View>
  </SkeletonCard>
);

// Client Stats Summary Skeleton
export const SkeletonClientStats: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={60} style={styles.clientStatsCard}>
    <View style={styles.clientStatsRow}>
      <View style={styles.clientStatItem}>
        <Skeleton width={30} height={20} delay={delay} />
        <Skeleton
          width={60}
          height={12}
          style={{ marginTop: 4 }}
          delay={delay + 50}
        />
      </View>
      <View style={styles.clientStatDivider} />
      <View style={styles.clientStatItem}>
        <Skeleton width={30} height={20} delay={delay + 100} />
        <Skeleton
          width={80}
          height={12}
          style={{ marginTop: 4 }}
          delay={delay + 150}
        />
      </View>
      <View style={styles.clientStatDivider} />
      <View style={styles.clientStatItem}>
        <Skeleton width={30} height={20} delay={delay + 200} />
        <Skeleton
          width={70}
          height={12}
          style={{ marginTop: 4 }}
          delay={delay + 250}
        />
      </View>
    </View>
  </SkeletonCard>
);

// Granular skeleton components for inline use (only data parts)
export const SkeletonAgentInfoSection: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <SkeletonCard height={120}>
    <View style={styles.agentInfoHeader}>
      <SkeletonText
        lines={1}
        lineHeight={16}
        lastLineWidth='50%'
        delay={delay + 50}
      />
      <Skeleton width={80} height={24} borderRadius={12} delay={delay + 100} />
    </View>
    <View style={styles.agentInfoContent}>
      <View style={styles.agentInfoRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.agentInfoItem}>
            <SkeletonText
              lines={1}
              lineHeight={12}
              lastLineWidth='70%'
              delay={delay + 150 + index * 50}
            />
            <SkeletonText
              lines={1}
              lineHeight={16}
              lastLineWidth='80%'
              delay={delay + 200 + index * 50}
            />
          </View>
        ))}
      </View>
    </View>
  </SkeletonCard>
);

export const SkeletonStatsSection: React.FC<{ delay?: number }> = ({
  delay = 0,
}) => (
  <View style={styles.statsScrollContainer}>
    {Array.from({ length: 8 }).map((_, index) => (
      <SkeletonStat key={index} delay={delay + index * 50} />
    ))}
  </View>
);

export const SkeletonRecentBookingsList: React.FC<{
  count?: number;
  delay?: number;
}> = ({ count = 3, delay = 0 }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonAgentBookingCard key={index} delay={delay + index * 100} />
    ))}
  </View>
);

export const SkeletonBookingsList: React.FC<{
  count?: number;
  delay?: number;
}> = ({ count = 6, delay = 0 }) => (
  <View style={styles.bookingsListContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonAgentBookingCard key={index} delay={delay + index * 80} />
    ))}
  </View>
);

export const SkeletonClientsList: React.FC<{
  count?: number;
  delay?: number;
}> = ({ count = 7, delay = 0 }) => (
  <View style={styles.clientsListContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonClientCard key={index} delay={delay + index * 80} />
    ))}
  </View>
);

export const SkeletonCreditTransactionsList: React.FC<{
  count?: number;
  delay?: number;
}> = ({ count = 8, delay = 0 }) => (
  <View style={styles.transactionsListContainer}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCreditTransactionCard key={index} delay={delay + index * 60} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  // Agent Info styles
  agentInfoContent: {
    flex: 1,
  },
  agentInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  agentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  agentInfoItem: {
    flex: 1,
  },

  // Booking Card styles
  bookingCard: {
    marginBottom: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bookingInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  bookingDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingClientInfo: {
    flex: 1,
  },
  bookingPriceInfo: {
    alignItems: 'flex-end',
  },

  // Client Card styles
  clientCard: {
    marginBottom: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  clientBookingsInfo: {
    alignItems: 'flex-end',
  },
  clientDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 12,
  },
  clientContactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clientContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  // Transaction Card styles
  transactionCard: {
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  transactionMainContent: {
    flex: 1,
    marginLeft: 12,
  },
  transactionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  transactionAmountSection: {
    alignItems: 'flex-end',
  },
  transactionBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  transactionLeftMetadata: {
    flex: 1,
  },
  transactionDateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionBookingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionRightMetadata: {
    alignItems: 'flex-end',
  },

  // Stat Card styles
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Header styles
  headerContent: {
    flex: 1,
  },

  // Search Header styles
  searchHeaderContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flex: 1,
  },

  // Tab Navigation styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Credit Summary styles
  creditBalanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditBalanceText: {
    marginLeft: 12,
  },
  creditLimitContainer: {
    marginBottom: 16,
  },

  // Transaction Summary styles
  transactionSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionSummaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionSummaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },

  // Client Stats styles
  clientStatsCard: {
    margin: 16,
  },
  clientStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  clientStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },

  // New styles for granular components
  statsScrollContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  bookingsListContainer: {
    paddingTop: 8,
  },
  clientsListContainer: {
    paddingTop: 8,
  },
  transactionsListContainer: {
    paddingTop: 8,
  },
});
