import React from 'react';
import { StyleSheet, Text, Pressable, ScrollView } from 'react-native';
import { colors } from '@/constants/adminColors';

export interface TabOption {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  count?: number;
  disabled?: boolean;
}

interface TabSelectorProps {
  options: TabOption[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  variant?: 'pills' | 'underline' | 'cards';
  showIcons?: boolean;
  showCounts?: boolean;
  style?: any;
}

export default function TabSelector({
  options,
  activeTab,
  onTabChange,
  variant = 'pills',
  showIcons = false,
  showCounts = false,
  style,
}: TabSelectorProps) {
  const getTabStyle = () => {
    switch (variant) {
      case 'underline':
        return styles.underlineContainer;
      case 'cards':
        return styles.cardsContainer;
      default:
        return styles.pillsContainer;
    }
  };

  const getTabItemStyle = (isActive: boolean) => {
    switch (variant) {
      case 'underline':
        return [styles.underlineTab, isActive && styles.underlineTabActive];
      case 'cards':
        return [styles.cardTab, isActive && styles.cardTabActive];
      default:
        return [styles.pillTab, isActive && styles.pillTabActive];
    }
  };

  const getTextStyle = (isActive: boolean) => {
    return [styles.tabText, isActive && styles.tabTextActive];
  };

  const getCountStyle = (isActive: boolean) => {
    return [styles.tabCount, isActive && styles.tabCountActive];
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={getTabStyle()}
      style={[styles.scrollView, style]}
    >
      {(options || []).map(option => {
        const isActive = activeTab === option.key;
        const IconComponent = option.icon;

        return (
          <Pressable
            key={option.key}
            style={getTabItemStyle(isActive)}
            onPress={() => onTabChange(option.key)}
            disabled={option.disabled}
          >
            {showIcons && IconComponent && (
              <IconComponent
                size={16}
                color={isActive ? colors.primary : colors.textSecondary}
              />
            )}
            <Text style={getTextStyle(isActive)}>{option.label}</Text>
            {showCounts && option.count !== undefined && (
              <Text style={getCountStyle(isActive)}>{option.count}</Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },

  // Pills variant (like FilterTabs)
  pillsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pillTab: {
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pillTabActive: {
    backgroundColor: `${colors.primary}15`,
  },

  // Cards variant (like SectionSelector)
  cardsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    flexGrow: 1,
  },
  cardTab: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  cardTabActive: {
    backgroundColor: `${colors.primary}15`,
  },

  // Underline variant
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  underlineTab: {
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  underlineTabActive: {
    borderBottomColor: colors.primary,
  },

  // Common text styles
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabCountActive: {
    color: colors.primary,
  },
});
