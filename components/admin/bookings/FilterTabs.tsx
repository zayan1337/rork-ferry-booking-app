import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { BookingStatus } from '@/types/admin/management';

type FilterStatus = BookingStatus | 'all';

interface FilterTabsProps {
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  getStatusCount: (status: FilterStatus) => number;
}

const { width: screenWidth } = Dimensions.get('window');

const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  getStatusCount,
}) => {
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const statuses: FilterStatus[] = [
    'all',
    'reserved',
    'pending_payment',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
  ];

  // Optimized scroll to active tab - only when activeFilter changes and user isn't manually scrolling
  const scrollToActiveTab = useCallback(
    (immediate = false) => {
      if (isUserScrolling) return;

      const tabIndex = statuses.findIndex(status => status === activeFilter);
      if (tabIndex === -1 || !tabScrollRef.current) return;

      const tabWidth = 120; // Approximate tab width for booking statuses
      const targetScrollX = Math.max(
        0,
        tabIndex * tabWidth - screenWidth / 2 + tabWidth / 2
      );

      // Only scroll if the target position is significantly different from current
      const scrollDifference = Math.abs(targetScrollX - currentScrollX);
      if (scrollDifference < 50) return; // Don't scroll if tab is already roughly in view

      const scrollAction = () => {
        tabScrollRef.current?.scrollTo({
          x: targetScrollX,
          animated: !immediate,
        });
      };

      if (immediate) {
        scrollAction();
      } else {
        setTimeout(scrollAction, 100);
      }
    },
    [activeFilter, statuses, currentScrollX, isUserScrolling, screenWidth]
  );

  // Only scroll when activeFilter changes, not on every re-render
  useEffect(() => {
    scrollToActiveTab();
  }, [activeFilter]); // Removed scrollToActiveTab from dependencies to prevent loops

  const getStatusLabel = (status: FilterStatus): string => {
    switch (status) {
      case 'all':
        return 'All';
      case 'reserved':
        return 'Reserved';
      case 'pending_payment':
        return 'Pending Payment';
      case 'confirmed':
        return 'Confirmed';
      case 'checked_in':
        return 'Checked In';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <View style={styles.filterTabs}>
      <ScrollView
        ref={tabScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabScrollContainer}
        style={styles.tabScrollView}
        bounces={false}
        decelerationRate='fast'
        onScroll={event => {
          setCurrentScrollX(event.nativeEvent.contentOffset.x);
        }}
        onScrollBeginDrag={() => setIsUserScrolling(true)}
        onScrollEndDrag={() => {
          setTimeout(() => setIsUserScrolling(false), 500);
        }}
        scrollEventThrottle={16}
      >
        {statuses.map(status => (
          <Pressable
            key={status}
            style={[
              styles.filterTab,
              activeFilter === status && styles.filterTabActive,
            ]}
            onPress={() => onFilterChange(status)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === status && styles.filterTabTextActive,
              ]}
            >
              {getStatusLabel(status)}
            </Text>
            <Text
              style={[
                styles.filterTabCount,
                activeFilter === status && styles.filterTabCountActive,
              ]}
            >
              {getStatusCount(status)}
            </Text>
            {activeFilter === status && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  filterTabs: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: 64,
  },
  tabScrollView: {
    flex: 1,
  },
  tabScrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: screenWidth,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 3,
    position: 'relative',
    minWidth: 100,
    height: 48,
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: `${colors.primary}15`,
    transform: [{ scale: 1.05 }],
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  filterTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterTabCount: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  filterTabCountActive: {
    color: colors.primary,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '70%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
});

export default FilterTabs;
