import React from 'react';
import { StyleSheet, Text, Pressable, View, Dimensions } from 'react-native';
import { colors } from '@/constants/adminColors';
import { ChevronRight } from 'lucide-react-native';

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  subtitle?: string;
  action?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}

const { width: screenWidth } = Dimensions.get('window');

export default function SectionHeader({
  title,
  onSeeAll,
  subtitle,
  action,
  size = 'medium',
}: SectionHeaderProps) {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          titleSize: isSmallScreen ? 14 : 16,
          subtitleSize: isSmallScreen ? 11 : 12,
          marginBottom: 12,
          iconSize: 14,
        };
      case 'large':
        return {
          titleSize: isTablet ? 24 : isSmallScreen ? 18 : 20,
          subtitleSize: isTablet ? 16 : isSmallScreen ? 13 : 14,
          marginBottom: 20,
          iconSize: 18,
        };
      case 'medium':
      default:
        return {
          titleSize: isTablet ? 20 : isSmallScreen ? 16 : 18,
          subtitleSize: isTablet ? 15 : isSmallScreen ? 12 : 14,
          marginBottom: 16,
          iconSize: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View style={[styles.container, { marginBottom: sizeStyles.marginBottom }]}>
      <View style={styles.titleContainer}>
        <Text
          style={[styles.title, { fontSize: sizeStyles.titleSize }]}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { fontSize: sizeStyles.subtitleSize }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.actionContainer}>
        {action && <View style={styles.actionWrapper}>{action}</View>}
        {onSeeAll && (
          <Pressable
            style={styles.seeAllButton}
            onPress={onSeeAll}
            accessibilityRole='button'
            accessibilityLabel={`See all ${title}`}
          >
            <Text
              style={[styles.seeAllText, { fontSize: sizeStyles.subtitleSize }]}
            >
              See All
            </Text>
            <ChevronRight size={sizeStyles.iconSize} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontWeight: '700',
    color: colors.text,
    lineHeight: 24,
  },
  subtitle: {
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 18,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  actionWrapper: {
    // Wrapper to ensure proper alignment
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: `${colors.primary}10`,
  },
  seeAllText: {
    color: colors.primary,
    fontWeight: '600',
    marginRight: 4,
  },
});
