import { Dimensions } from "react-native";
import { QuickAction } from "@/types/admin/dashboard";

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
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "AD";
};

export const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString();
};

export const formatTime = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleTimeString();
};

export const formatCurrency = (amount: number, currency = "MVR"): string => {
    return `${currency} ${amount.toFixed(2)}`;
};

export const calculatePercentageChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};

export const getTodayString = (): string => {
    return new Date().toISOString().split('T')[0];
};

export const getYesterdayString = (): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}; 