import { useMemo } from 'react';
import { useContentStore } from '@/store/admin/contentStore';
import { TermsAndConditions, Promotion } from '@/types/content';

export const useContentData = () => {
  const {
    terms,
    promotions,
    currentTerms,
    currentPromotion,
    loading,
    error,
    searchQuery,
    filters,
    stats,
    setSearchQuery,
    setFilters,
    refreshAll,
  } = useContentStore();

  // Filter and search logic for terms
  const filteredTerms = useMemo(() => {
    let filtered = terms;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        term =>
          term.title.toLowerCase().includes(query) ||
          term.content.toLowerCase().includes(query) ||
          term.version.toLowerCase().includes(query)
      );
    }

    // Version filter
    if (filters.terms.version) {
      filtered = filtered.filter(
        term => term.version === filters.terms.version
      );
    }

    // Active status filter
    if (filters.terms.is_active !== undefined) {
      filtered = filtered.filter(
        term => term.is_active === filters.terms.is_active
      );
    }

    // Date range filter
    if (filters.terms.effective_date_from || filters.terms.effective_date_to) {
      filtered = filtered.filter(term => {
        const effectiveDate = new Date(term.effective_date);
        const fromDate = filters.terms.effective_date_from
          ? new Date(filters.terms.effective_date_from)
          : null;
        const toDate = filters.terms.effective_date_to
          ? new Date(filters.terms.effective_date_to)
          : null;

        if (fromDate && effectiveDate < fromDate) return false;
        if (toDate && effectiveDate > toDate) return false;
        return true;
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.effective_date).getTime() -
        new Date(a.effective_date).getTime()
    );
  }, [terms, searchQuery, filters.terms]);

  // Filter and search logic for promotions
  const filteredPromotions = useMemo(() => {
    let filtered = promotions;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        promotion =>
          promotion.name.toLowerCase().includes(query) ||
          (promotion.description &&
            promotion.description.toLowerCase().includes(query))
      );
    }

    // Active status filter
    if (filters.promotions.is_active !== undefined) {
      filtered = filtered.filter(
        promotion => promotion.is_active === filters.promotions.is_active
      );
    }

    // First time booking filter
    if (filters.promotions.is_first_time_booking_only !== undefined) {
      filtered = filtered.filter(
        promotion =>
          promotion.is_first_time_booking_only ===
          filters.promotions.is_first_time_booking_only
      );
    }

    // Discount range filter
    if (filters.promotions.discount_range) {
      const { min, max } = filters.promotions.discount_range;
      filtered = filtered.filter(
        promotion =>
          promotion.discount_percentage >= min &&
          promotion.discount_percentage <= max
      );
    }

    // Date range filter
    if (filters.promotions.date_range) {
      const { start, end } = filters.promotions.date_range;
      filtered = filtered.filter(promotion => {
        const promotionStart = new Date(promotion.start_date);
        const promotionEnd = new Date(promotion.end_date);
        const filterStart = new Date(start);
        const filterEnd = new Date(end);

        return promotionStart <= filterEnd && promotionEnd >= filterStart;
      });
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [promotions, searchQuery, filters.promotions]);

  // Get terms statistics
  const termsStats = useMemo(() => {
    const active = terms.filter(t => t.is_active);
    const versions = [...new Set(terms.map(t => t.version))];

    return {
      total: terms.length,
      active: active.length,
      inactive: terms.length - active.length,
      versions: versions.length,
      currentVersion: active.length > 0 ? active[0].version : '',
    };
  }, [terms]);

  // Get promotions statistics
  const promotionsStats = useMemo(() => {
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

    const averageDiscount =
      active.length > 0
        ? Math.round(
            active.reduce((sum, p) => sum + p.discount_percentage, 0) /
              active.length
          )
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
  }, [promotions]);

  return {
    // Data
    terms,
    promotions,
    currentTerms,
    currentPromotion,

    // Filtered data
    filteredTerms,
    filteredPromotions,

    // State
    loading,
    error,
    searchQuery,
    filters,
    stats,

    // Statistics
    termsStats,
    promotionsStats,

    // Actions
    setSearchQuery,
    setFilters,
    refreshAll,

    // Search functions
    searchTerms: (query: string) => {
      return terms.filter(
        term =>
          term.title.toLowerCase().includes(query.toLowerCase()) ||
          term.content.toLowerCase().includes(query.toLowerCase()) ||
          term.version.toLowerCase().includes(query.toLowerCase())
      );
    },
    searchPromotions: (query: string) => {
      return promotions.filter(
        promotion =>
          promotion.name.toLowerCase().includes(query.toLowerCase()) ||
          promotion.description?.toLowerCase().includes(query.toLowerCase())
      );
    },
    getTermsByVersion: (version: string) => {
      return terms.filter(term => term.version === version);
    },
    getActiveTerms: () => {
      return terms.filter(term => term.is_active);
    },
    getCurrentPromotions: () => {
      const now = new Date();
      return promotions.filter(promotion => {
        const start = new Date(promotion.start_date);
        const end = new Date(promotion.end_date);
        return start <= now && end >= now && promotion.is_active;
      });
    },
    getUpcomingPromotions: () => {
      const now = new Date();
      return promotions.filter(promotion => {
        const start = new Date(promotion.start_date);
        return start > now && promotion.is_active;
      });
    },
  };
};

export default useContentData;
