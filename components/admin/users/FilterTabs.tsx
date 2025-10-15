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

type FilterRole =
  | 'all'
  | 'admin'
  | 'agent'
  | 'customer'
  | 'passenger'
  | 'captain';

interface FilterTabsProps {
  filterRole: FilterRole;
  onRoleChange: (role: FilterRole) => void;
  getCount: (role: FilterRole) => number;
}

const { width: screenWidth } = Dimensions.get('window');

const FilterTabs: React.FC<FilterTabsProps> = ({
  filterRole,
  onRoleChange,
  getCount,
}) => {
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentScrollX, setCurrentScrollX] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const roles: FilterRole[] = [
    'all',
    'admin',
    'agent',
    'customer',
    'captain',
    'passenger',
  ];

  // Optimized scroll to active tab - only when filterRole changes and user isn't manually scrolling
  const scrollToActiveTab = useCallback(
    (immediate = false) => {
      if (isUserScrolling) return;

      const tabIndex = roles.findIndex(role => role === filterRole);
      if (tabIndex === -1 || !tabScrollRef.current) return;

      const tabWidth = 100; // Approximate tab width
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
    [filterRole, roles, currentScrollX, isUserScrolling, screenWidth]
  );

  // Only scroll when filterRole changes, not on every re-render
  useEffect(() => {
    scrollToActiveTab();
  }, [filterRole]); // Removed scrollToActiveTab from dependencies to prevent loops

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
        {roles.map(role => (
          <Pressable
            key={role}
            style={[
              styles.filterTab,
              filterRole === role && styles.filterTabActive,
            ]}
            onPress={() => onRoleChange(role)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterRole === role && styles.filterTabTextActive,
              ]}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
            <Text
              style={[
                styles.filterTabCount,
                filterRole === role && styles.filterTabCountActive,
              ]}
            >
              {getCount(role)}
            </Text>
            {filterRole === role && <View style={styles.tabIndicator} />}
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
    minWidth: 80,
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
