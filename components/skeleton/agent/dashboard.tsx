import React from 'react';
import { View, StyleSheet } from 'react-native';
import Skeleton, { SkeletonText, SkeletonCard, SkeletonContainer } from '../common/Skeleton';
import Colors from '@/constants/colors';

// Agent Info Card Skeleton
export const SkeletonAgentInfo: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
    <SkeletonCard height={100}>
        <View style={styles.agentInfoContent}>
            <View style={styles.agentInfoHeader}>
                <SkeletonText lines={1} lineHeight={16} delay={delay} />
                <Skeleton width={80} height={24} borderRadius={4} delay={delay + 50} />
            </View>
            <View style={styles.agentInfoRow}>
                <View style={styles.agentInfoItem}>
                    <Skeleton width={60} height={12} delay={delay + 100} />
                    <Skeleton width={80} height={16} style={{ marginTop: 4 }} delay={delay + 150} />
                </View>
                <View style={styles.agentInfoItem}>
                    <Skeleton width={60} height={12} delay={delay + 200} />
                    <Skeleton width={40} height={16} style={{ marginTop: 4 }} delay={delay + 250} />
                </View>
                <View style={styles.agentInfoItem}>
                    <Skeleton width={60} height={12} delay={delay + 300} />
                    <Skeleton width={30} height={16} style={{ marginTop: 4 }} delay={delay + 350} />
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
        <Skeleton width={40} height={24} style={{ marginTop: 8 }} delay={delay + 100} />
    </SkeletonContainer>
);

// Booking Card Skeleton
export const SkeletonBooking: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
    <SkeletonCard height={100}>
        <View style={styles.bookingContent}>
            <View style={styles.bookingHeader}>
                <SkeletonText lines={1} lineHeight={16} delay={delay} />
                <Skeleton width={60} height={20} borderRadius={10} delay={delay + 50} />
            </View>
            <View style={styles.bookingDetails}>
                <SkeletonText lines={2} spacing={6} lastLineWidth="80%" delay={delay + 100} />
            </View>
            <View style={styles.bookingFooter}>
                <Skeleton width={80} height={14} delay={delay + 200} />
                <Skeleton width={60} height={14} delay={delay + 250} />
            </View>
        </View>
    </SkeletonCard>
);

// Dashboard Header Skeleton
export const SkeletonDashboardHeader: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
    <View style={styles.headerContent}>
        <SkeletonText lines={1} lineHeight={24} delay={delay} />
        <View style={{ marginTop: 4 }}>
            <SkeletonText lines={1} lineHeight={16} lastLineWidth="80%" delay={delay + 100} />
        </View>
    </View>
);

// Stats Container Skeleton
export const SkeletonStatsContainer: React.FC<{ count?: number }> = ({ count = 8 }) => (
    <>
        {Array.from({ length: count }).map((_, index) => (
            <SkeletonStat key={`stat-skeleton-${index}`} delay={index * 150} />
        ))}
    </>
);

// Recent Bookings Skeleton
export const SkeletonRecentBookings: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <>
        {Array.from({ length: count }).map((_, index) => (
            <SkeletonBooking key={`booking-skeleton-${index}`} delay={index * 200} />
        ))}
    </>
);

const styles = StyleSheet.create({
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
    bookingContent: {
        flex: 1,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    bookingDetails: {
        flex: 1,
        marginBottom: 8,
    },
    bookingFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
    },
}); 