import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Skeleton, { SkeletonText, SkeletonCard } from '../common/Skeleton';
import {
  SkeletonSearchHeader,
  SkeletonTabNavigation,
  SkeletonAgentBookingCard,
  SkeletonClientCard,
  SkeletonClientStats,
  SkeletonCreditSummary,
  SkeletonTransactionSummary,
  SkeletonCreditTransactionCard,
  SkeletonDashboardHeader,
  SkeletonAgentInfo,
  SkeletonStatsContainer,
} from './dashboard';
import Colors from '@/constants/colors';

// Complete Bookings Page Skeleton
export const SkeletonBookingsPage: React.FC<{ bookingCount?: number }> = ({
  bookingCount = 5,
}) => (
  <View style={styles.pageContainer}>
    {/* Search Header */}
    <SkeletonSearchHeader showAddButton={true} />

    {/* Tab Navigation */}
    <SkeletonTabNavigation tabCount={4} delay={100} />

    {/* Bookings List */}
    <ScrollView
      style={styles.listContainer}
      contentContainerStyle={styles.listContent}
    >
      {Array.from({ length: bookingCount }).map((_, index) => (
        <SkeletonAgentBookingCard
          key={`booking-${index}`}
          delay={200 + index * 100}
        />
      ))}
    </ScrollView>
  </View>
);

// Complete Clients Page Skeleton
export const SkeletonClientsPage: React.FC<{ clientCount?: number }> = ({
  clientCount = 6,
}) => (
  <View style={styles.pageContainer}>
    {/* Search Header */}
    <SkeletonSearchHeader showAddButton={true} />

    {/* Client Stats */}
    <SkeletonClientStats delay={100} />

    {/* Clients List */}
    <ScrollView
      style={styles.listContainer}
      contentContainerStyle={styles.listContent}
    >
      {Array.from({ length: clientCount }).map((_, index) => (
        <SkeletonClientCard key={`client-${index}`} delay={200 + index * 100} />
      ))}
    </ScrollView>
  </View>
);

// Complete Credit Page Skeleton
export const SkeletonCreditPage: React.FC<{ transactionCount?: number }> = ({
  transactionCount = 8,
}) => (
  <View style={styles.pageContainer}>
    {/* Credit Summary */}
    <View style={styles.creditSummaryContainer}>
      <SkeletonCreditSummary delay={0} />
    </View>

    {/* Transaction Summary */}
    <View style={styles.transactionSummaryContainer}>
      <SkeletonTransactionSummary delay={100} />
    </View>

    {/* Transactions Header */}
    <View style={styles.sectionHeaderContainer}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <SkeletonText
            lines={1}
            lineHeight={18}
            lastLineWidth='60%'
            delay={200}
          />
        </View>
      </View>
    </View>

    {/* Transactions List */}
    <ScrollView
      style={styles.listContainer}
      contentContainerStyle={styles.listContent}
    >
      {Array.from({ length: transactionCount }).map((_, index) => (
        <SkeletonCreditTransactionCard
          key={`transaction-${index}`}
          delay={250 + index * 80}
        />
      ))}
    </ScrollView>
  </View>
);

// Complete Dashboard Page Skeleton
export const SkeletonDashboardPage: React.FC<{
  recentBookingCount?: number;
}> = ({ recentBookingCount = 3 }) => (
  <ScrollView
    style={styles.pageContainer}
    contentContainerStyle={styles.dashboardContent}
  >
    {/* Header with greeting and new booking button */}
    <View style={styles.dashboardHeader}>
      <View style={styles.headerTextContainer}>
        <SkeletonDashboardHeader delay={0} />
      </View>
      <View style={styles.newBookingButtonContainer}>
        <Skeleton width={120} height={36} borderRadius={8} delay={50} />
      </View>
    </View>

    {/* Agent Info Card */}
    <View style={styles.agentInfoContainer}>
      <SkeletonAgentInfo delay={100} />
    </View>

    {/* Performance Overview Section */}
    <View style={styles.sectionContainer}>
      <View style={styles.sectionTitleContainer}>
        <SkeletonText
          lines={1}
          lineHeight={18}
          lastLineWidth='50%'
          delay={150}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        <SkeletonStatsContainer count={8} />
      </ScrollView>
    </View>

    {/* Recent Bookings Section */}
    <View style={styles.sectionContainer}>
      <View style={styles.recentBookingsHeader}>
        <View style={styles.sectionTitleContainer}>
          <SkeletonText
            lines={1}
            lineHeight={18}
            lastLineWidth='40%'
            delay={200}
          />
        </View>
        <Skeleton width={80} height={24} borderRadius={4} delay={250} />
      </View>
      {Array.from({ length: recentBookingCount }).map((_, index) => (
        <SkeletonAgentBookingCard
          key={`recent-booking-${index}`}
          delay={300 + index * 100}
        />
      ))}
    </View>
  </ScrollView>
);

// Profile Page Skeleton
export const SkeletonProfilePage: React.FC = () => (
  <ScrollView
    style={styles.pageContainer}
    contentContainerStyle={styles.profileContent}
  >
    {/* Profile Header */}
    <View style={styles.profileHeader}>
      <Skeleton width={80} height={80} borderRadius={40} delay={0} />
      <View style={styles.profileHeaderText}>
        <SkeletonText
          lines={1}
          lineHeight={20}
          lastLineWidth='70%'
          delay={50}
        />
        <SkeletonText
          lines={1}
          lineHeight={14}
          lastLineWidth='60%'
          delay={100}
        />
      </View>
    </View>

    {/* Profile Info Cards */}
    <View style={styles.profileInfoContainer}>
      <SkeletonCard height={120} style={styles.profileInfoCard}>
        <View style={styles.profileCardHeader}>
          <SkeletonText
            lines={1}
            lineHeight={16}
            lastLineWidth='40%'
            delay={150}
          />
        </View>
        <View style={styles.profileCardContent}>
          <SkeletonText lines={3} lineHeight={14} spacing={8} delay={200} />
        </View>
      </SkeletonCard>

      <SkeletonCard height={100} style={styles.profileInfoCard}>
        <View style={styles.profileCardHeader}>
          <SkeletonText
            lines={1}
            lineHeight={16}
            lastLineWidth='35%'
            delay={250}
          />
        </View>
        <View style={styles.profileCardContent}>
          <SkeletonText lines={2} lineHeight={14} spacing={8} delay={300} />
        </View>
      </SkeletonCard>

      <SkeletonCard height={140} style={styles.profileInfoCard}>
        <View style={styles.profileCardHeader}>
          <SkeletonText
            lines={1}
            lineHeight={16}
            lastLineWidth='45%'
            delay={350}
          />
        </View>
        <View style={styles.profileCardContent}>
          <SkeletonText lines={4} lineHeight={14} spacing={8} delay={400} />
        </View>
      </SkeletonCard>
    </View>

    {/* Action Buttons */}
    <View style={styles.profileActions}>
      <Skeleton width='100%' height={44} borderRadius={8} delay={450} />
      <Skeleton
        width='100%'
        height={44}
        borderRadius={8}
        style={{ marginTop: 12 }}
        delay={500}
      />
    </View>
  </ScrollView>
);

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },

  // Dashboard styles
  dashboardContent: {
    padding: 16,
  },
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  newBookingButtonContainer: {
    marginLeft: 16,
  },
  agentInfoContainer: {
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitleContainer: {
    marginBottom: 16,
  },
  statsContainer: {
    paddingRight: 16,
  },
  recentBookingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  // Credit page styles
  creditSummaryContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  transactionSummaryContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionHeaderContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Profile page styles
  profileContent: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  profileHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  profileInfoContainer: {
    marginBottom: 24,
  },
  profileInfoCard: {
    marginBottom: 16,
  },
  profileCardHeader: {
    marginBottom: 12,
  },
  profileCardContent: {
    flex: 1,
  },
  profileActions: {
    marginTop: 16,
  },
});
