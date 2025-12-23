import { Dimensions } from 'react-native';
import {
  formatDateInMaldives,
  getMaldivesTodayString,
  getMaldivesTimeComponents,
} from '@/utils/timezoneUtils';

const { width: screenWidth } = Dimensions.get('window');

export const getResponsiveDimensions = () => {
  const isTablet = screenWidth >= 768;
  const isSmallScreen = screenWidth < 480;

  return {
    isTablet,
    isSmallScreen,
    screenWidth,
  };
};

export const getResponsivePadding = () => {
  const { isTablet, isSmallScreen } = getResponsiveDimensions();

  return {
    paddingHorizontal: isTablet ? 24 : isSmallScreen ? 12 : 16,
    paddingVertical: isTablet ? 20 : 16,
  };
};

export const getInitials = (name: string): string => {
  return name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'AD';
};

export const formatDate = (date: string | Date): string => {
  return formatDateInMaldives(date, 'short-date');
};

export const formatTime = (date: string | Date): string => {
  return formatDateInMaldives(date, 'time');
};

export const formatCurrency = (amount: number, currency = 'MVR'): string => {
  return `${currency} ${amount.toFixed(2)}`;
};

export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const getTodayString = (): string => {
  return getMaldivesTodayString();
};

export const getYesterdayString = (): string => {
  const maldivesTime = getMaldivesTimeComponents(new Date());
  const yesterday = new Date(
    Date.UTC(maldivesTime.year, maldivesTime.month - 1, maldivesTime.day - 1)
  );
  return formatDateInMaldives(yesterday, 'YYYY-MM-DD');
};
