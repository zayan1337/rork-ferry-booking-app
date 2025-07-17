import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFAQManagementStore } from '@/store/admin/faqStore';
import { FAQ, FAQCategory, FAQFormData, FAQCategoryFormData, FAQFilters } from '@/types/content';
import {
    sortFaqs,
    sortFaqCategories,
    filterFaqs,
    calculateFaqStats,
    calculateCategoryStats,
    getCategoriesWithFaqCount,
    validateFaqData,
    validateCategoryData,
    canDeleteCategory,
    getNextFaqOrderIndex,
    getNextCategoryOrderIndex,
    groupFaqsByCategory,
} from '@/utils/faqUtils';

interface UseFAQManagementOptions {
    autoLoad?: boolean;
    defaultSortBy?: 'question' | 'category' | 'order_index' | 'created_at' | 'updated_at';
    defaultSortOrder?: 'asc' | 'desc';
    defaultCategorySortBy?: 'name' | 'order_index' | 'created_at';
}

interface UseFAQManagementReturn {
    // Data
    faqs: FAQ[];
    categories: FAQCategory[];
    currentFAQ: FAQ | null;
    currentCategory: FAQCategory | null;
    filteredFaqs: FAQ[];
    sortedCategories: FAQCategory[];
    categoriesWithCounts: Array<FAQCategory & { faq_count: number; active_faq_count: number }>;
    groupedFaqs: Array<{ category: FAQCategory; faqs: FAQ[] }>;

    // Loading states
    loading: {
        faqs: boolean;
        categories: boolean;
        singleFAQ: boolean;
        singleCategory: boolean;
    };

    // Error state
    error: string | null;

    // Statistics
    faqStats: ReturnType<typeof calculateFaqStats>;
    categoryStats: ReturnType<typeof calculateCategoryStats>;

    // Search and filters
    searchQuery: string;
    filters: FAQFilters;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    categorySortBy: string;

    // Actions
    // FAQ Actions
    loadFAQs: () => Promise<void>;
    loadFAQ: (id: string) => Promise<FAQ | null>;
    createFAQ: (data: FAQFormData) => Promise<FAQ>;
    updateFAQ: (id: string, data: Partial<FAQFormData>) => Promise<FAQ>;
    deleteFAQ: (id: string) => Promise<void>;
    duplicateFAQ: (id: string) => Promise<FAQ>;

    // Category Actions
    loadCategories: () => Promise<void>;
    loadCategory: (id: string) => Promise<FAQCategory | null>;
    createCategory: (data: FAQCategoryFormData) => Promise<FAQCategory>;
    updateCategory: (id: string, data: Partial<FAQCategoryFormData>) => Promise<FAQCategory>;
    deleteCategory: (id: string) => Promise<void>;

    // Search and Filter Actions
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<FAQFilters>) => void;
    clearFilters: () => void;
    setSortBy: (sortBy: 'question' | 'category' | 'order_index' | 'created_at' | 'updated_at') => void;
    setSortOrder: (order: 'asc' | 'desc') => void;
    setCategorySortBy: (sortBy: 'name' | 'order_index' | 'created_at') => void;

    // Utility Actions
    refreshAll: () => Promise<void>;
    getFAQById: (id: string) => FAQ | null;
    getCategoryById: (id: string) => FAQCategory | null;
    validateFAQData: (data: Partial<FAQFormData>) => { isValid: boolean; errors: Record<string, string> };
    validateCategoryData: (data: Partial<FAQCategoryFormData>) => { isValid: boolean; errors: Record<string, string> };
    canDeleteCategory: (categoryId: string) => boolean;
    getNextFAQOrderIndex: (categoryId?: string) => number;
    getNextCategoryOrderIndex: () => number;

    // Error handling
    clearError: () => void;

    // Reset actions
    resetCurrentFAQ: () => void;
    resetCurrentCategory: () => void;
}

export const useFAQManagement = (options: UseFAQManagementOptions = {}): UseFAQManagementReturn => {
    const {
        autoLoad = true,
        defaultSortBy = 'order_index',
        defaultSortOrder = 'asc',
        defaultCategorySortBy = 'order_index',
    } = options;

    // Store state
    const store = useFAQManagementStore();

    // Local state for sorting and filtering
    const [sortBy, setSortBy] = useState(defaultSortBy);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
    const [categorySortBy, setCategorySortBy] = useState(defaultCategorySortBy);

    // Auto-load data on mount
    useEffect(() => {
        if (autoLoad) {
            Promise.all([
                store.fetchFAQs(),
                store.fetchCategories(),
            ]).catch(console.error);
        }
    }, [autoLoad, store.fetchFAQs, store.fetchCategories]);

    // Computed values
    const filteredFaqs = useMemo(() => {
        const filtered = filterFaqs(store.faqs, store.filters);
        return sortFaqs(filtered, sortBy as any, sortOrder);
    }, [store.faqs, store.filters, sortBy, sortOrder]);

    const sortedCategories = useMemo(() => {
        return sortFaqCategories(store.categories, categorySortBy as any, 'asc');
    }, [store.categories, categorySortBy]);

    const categoriesWithCounts = useMemo(() => {
        return getCategoriesWithFaqCount(sortedCategories, store.faqs);
    }, [sortedCategories, store.faqs]);

    const groupedFaqs = useMemo(() => {
        return groupFaqsByCategory(filteredFaqs, sortedCategories);
    }, [filteredFaqs, sortedCategories]);

    const faqStats = useMemo(() => {
        return calculateFaqStats(store.faqs, store.categories);
    }, [store.faqs, store.categories]);

    const categoryStats = useMemo(() => {
        return calculateCategoryStats(store.categories, store.faqs);
    }, [store.categories, store.faqs]);

    // FAQ Actions
    const loadFAQs = useCallback(async () => {
        await store.fetchFAQs();
    }, [store.fetchFAQs]);

    const loadFAQ = useCallback(async (id: string) => {
        return await store.fetchFAQ(id);
    }, [store.fetchFAQ]);

    const createFAQ = useCallback(async (data: FAQFormData) => {
        const enhancedData = {
            ...data,
            order_index: data.order_index || getNextFaqOrderIndex(store.faqs, data.category_id),
        };
        return await store.createFAQ(enhancedData);
    }, [store.createFAQ, store.faqs]);

    const updateFAQ = useCallback(async (id: string, data: Partial<FAQFormData>) => {
        return await store.updateFAQ(id, data);
    }, [store.updateFAQ]);

    const deleteFAQ = useCallback(async (id: string) => {
        await store.deleteFAQ(id);
    }, [store.deleteFAQ]);

    const duplicateFAQ = useCallback(async (id: string) => {
        const originalFAQ = store.faqs.find(faq => faq.id === id);
        if (!originalFAQ) {
            throw new Error('FAQ not found');
        }

        const duplicateData: FAQFormData = {
            category_id: originalFAQ.category_id,
            question: `${originalFAQ.question} (Copy)`,
            answer: originalFAQ.answer,
            is_active: false, // Start as inactive
            order_index: getNextFaqOrderIndex(store.faqs, originalFAQ.category_id),
        };

        return await store.createFAQ(duplicateData);
    }, [store.faqs, store.createFAQ]);

    // Category Actions
    const loadCategories = useCallback(async () => {
        await store.fetchCategories();
    }, [store.fetchCategories]);

    const loadCategory = useCallback(async (id: string) => {
        return await store.fetchCategory(id);
    }, [store.fetchCategory]);

    const createCategory = useCallback(async (data: FAQCategoryFormData) => {
        const enhancedData = {
            ...data,
            order_index: data.order_index || getNextCategoryOrderIndex(store.categories),
        };
        return await store.createCategory(enhancedData);
    }, [store.createCategory, store.categories]);

    const updateCategory = useCallback(async (id: string, data: Partial<FAQCategoryFormData>) => {
        return await store.updateCategory(id, data);
    }, [store.updateCategory]);

    const deleteCategory = useCallback(async (id: string) => {
        // Check if category can be deleted
        if (!canDeleteCategory(id, store.faqs)) {
            throw new Error('Cannot delete category that contains FAQs');
        }
        await store.deleteCategory(id);
    }, [store.deleteCategory, store.faqs]);

    // Search and Filter Actions
    const setSearchQuery = useCallback((query: string) => {
        store.setSearchQuery(query);
    }, [store.setSearchQuery]);

    const setFilters = useCallback((filters: Partial<FAQFilters>) => {
        store.setFilters(filters);
    }, [store.setFilters]);

    const clearFilters = useCallback(() => {
        store.clearFilters();
    }, [store.clearFilters]);

    // Utility Actions
    const refreshAll = useCallback(async () => {
        await Promise.all([
            store.fetchFAQs(),
            store.fetchCategories(),
        ]);
    }, [store.fetchFAQs, store.fetchCategories]);

    const getFAQById = useCallback((id: string) => {
        return store.faqs.find(faq => faq.id === id) || null;
    }, [store.faqs]);

    const getCategoryById = useCallback((id: string) => {
        return store.categories.find(category => category.id === id) || null;
    }, [store.categories]);

    const validateFAQDataCallback = useCallback((data: Partial<FAQFormData>) => {
        return validateFaqData({
            question: data.question || '',
            answer: data.answer || '',
            category_id: data.category_id || '',
        });
    }, []);

    const validateCategoryDataCallback = useCallback((data: Partial<FAQCategoryFormData>) => {
        return validateCategoryData({
            name: data.name || '',
            description: data.description,
        });
    }, []);

    const canDeleteCategoryCallback = useCallback((categoryId: string) => {
        return canDeleteCategory(categoryId, store.faqs);
    }, [store.faqs]);

    const getNextFAQOrderIndexCallback = useCallback((categoryId?: string) => {
        return getNextFaqOrderIndex(store.faqs, categoryId);
    }, [store.faqs]);

    const getNextCategoryOrderIndexCallback = useCallback(() => {
        return getNextCategoryOrderIndex(store.categories);
    }, [store.categories]);

    return {
        // Data
        faqs: store.faqs,
        categories: store.categories,
        currentFAQ: store.currentFAQ,
        currentCategory: store.currentCategory,
        filteredFaqs,
        sortedCategories,
        categoriesWithCounts,
        groupedFaqs,

        // Loading states
        loading: store.loading,

        // Error state
        error: store.error,

        // Statistics
        faqStats,
        categoryStats,

        // Search and filters
        searchQuery: store.searchQuery,
        filters: store.filters,
        sortBy,
        sortOrder,
        categorySortBy,

        // FAQ Actions
        loadFAQs,
        loadFAQ,
        createFAQ,
        updateFAQ,
        deleteFAQ,
        duplicateFAQ,

        // Category Actions
        loadCategories,
        loadCategory,
        createCategory,
        updateCategory,
        deleteCategory,

        // Search and Filter Actions
        setSearchQuery,
        setFilters,
        clearFilters,
        setSortBy,
        setSortOrder,
        setCategorySortBy,

        // Utility Actions
        refreshAll,
        getFAQById,
        getCategoryById,
        validateFAQData: validateFAQDataCallback,
        validateCategoryData: validateCategoryDataCallback,
        canDeleteCategory: canDeleteCategoryCallback,
        getNextFAQOrderIndex: getNextFAQOrderIndexCallback,
        getNextCategoryOrderIndex: getNextCategoryOrderIndexCallback,

        // Error handling
        clearError: store.clearError,

        // Reset actions
        resetCurrentFAQ: store.resetCurrentFAQ,
        resetCurrentCategory: store.resetCurrentCategory,
    };
}; 