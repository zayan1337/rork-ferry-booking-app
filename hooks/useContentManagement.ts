import { useMemo } from 'react';
import { useContentStore } from '@/store/admin/contentStore';
import {
    TermsAndConditions,
    Promotion,
    TermsFormData,
    PromotionFormData,
} from '@/types/content';
import {
    validateTermsData,
    validatePromotionData,
} from '@/utils/contentUtils';

// Stats interfaces
export interface TermsStats {
    total: number;
    active: number;
    inactive: number;
    versions: string[];
    recentTerms: number;
}

export interface PromotionsStats {
    total: number;
    active: number;
    inactive: number;
    current: number;
    upcoming: number;
    expired: number;
    averageDiscount: number;
}

export const useContentManagement = () => {
    const store = useContentStore();

    // Calculate terms statistics
    const termsStats = useMemo<TermsStats>(() => {
        const { terms } = store;
        const active = terms.filter(t => t.is_active);
        const versions = [...new Set(terms.map(t => t.version))];

        // Terms created in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentTerms = terms.filter(t => new Date(t.created_at) > sevenDaysAgo);

        return {
            total: terms.length,
            active: active.length,
            inactive: terms.length - active.length,
            versions,
            recentTerms: recentTerms.length,
        };
    }, [store.terms]);

    // Calculate promotions statistics
    const promotionsStats = useMemo<PromotionsStats>(() => {
        const { promotions } = store;
        const now = new Date();

        const active = promotions.filter(p => p.is_active);
        const current = promotions.filter(p => {
            const start = new Date(p.start_date);
            const end = new Date(p.end_date);
            return start <= now && end >= now && p.is_active;
        });
        const upcoming = promotions.filter(p => {
            const start = new Date(p.start_date);
            return start > now && p.is_active;
        });
        const expired = promotions.filter(p => {
            const end = new Date(p.end_date);
            return end < now;
        });

        const averageDiscount = active.length > 0
            ? Math.round(active.reduce((sum, p) => sum + p.discount_percentage, 0) / active.length)
            : 0;

        return {
            total: promotions.length,
            active: active.length,
            inactive: promotions.length - active.length,
            current: current.length,
            upcoming: upcoming.length,
            expired: expired.length,
            averageDiscount,
        };
    }, [store.promotions]);

    return {
        // Data
        terms: store.terms,
        promotions: store.promotions,
        currentTerms: store.currentTerms,
        currentPromotion: store.currentPromotion,

        // Loading states
        loading: store.loading,
        error: store.error,

        // Statistics
        termsStats,
        promotionsStats,

        // Terms operations
        fetchTerms: store.fetchTerms,
        fetchTermsById: store.fetchTermsById,
        createTerms: store.createTerms,
        updateTerms: store.updateTerms,
        deleteTerms: store.deleteTerms,

        // Promotions operations
        fetchPromotions: store.fetchPromotions,
        fetchPromotionById: store.fetchPromotionById,
        createPromotion: store.createPromotion,
        updatePromotion: store.updatePromotion,
        deletePromotion: store.deletePromotion,
        duplicatePromotion: async (id: string) => {
            const promotion = store.promotions.find(p => p.id === id);
            if (!promotion) throw new Error('Promotion not found');

            const duplicateData: PromotionFormData = {
                name: `${promotion.name} (Copy)`,
                description: promotion.description,
                discount_percentage: promotion.discount_percentage,
                start_date: new Date().toISOString(),
                end_date: promotion.end_date,
                is_first_time_booking_only: promotion.is_first_time_booking_only,
                is_active: false, // Start as inactive
            };

            return store.createPromotion(duplicateData);
        },

        // Utility functions
        refreshAll: store.refreshAll,
        setSearchQuery: store.setSearchQuery,
        setFilters: store.setFilters,
        clearFilters: store.clearFilters,
        clearError: store.clearError,
        resetCurrentTerms: store.resetCurrentTerms,
        resetCurrentPromotion: store.resetCurrentPromotion,

        // Validation functions
        validateTermsData,
        validatePromotionData,
    };
};