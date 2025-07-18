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
    normalizeFaqData,
    normalizeCategoryData,
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

    // Computed values with error handling
    const filteredFaqs = useMemo(() => {
        try {
            const filtered = filterFaqs(store.faqs, store.filters);
            return sortFaqs(filtered, sortBy as any, sortOrder);
        } catch (error) {
            console.error('Error filtering/sorting FAQs:', error);
            return store.faqs;
        }
    }, [store.faqs, store.filters, sortBy, sortOrder]);

    const sortedCategories = useMemo(() => {
        try {
            return sortFaqCategories(store.categories, categorySortBy as any, 'asc');
        } catch (error) {
            console.error('Error sorting categories:', error);
            return store.categories;
        }
    }, [store.categories, categorySortBy]);

    const categoriesWithCounts = useMemo(() => {
        try {
            return getCategoriesWithFaqCount(sortedCategories, store.faqs);
        } catch (error) {
            console.error('Error calculating category counts:', error);
            return sortedCategories.map(cat => ({ ...cat, faq_count: 0, active_faq_count: 0 }));
        }
    }, [sortedCategories, store.faqs]);

    const groupedFaqs = useMemo(() => {
        try {
            return groupFaqsByCategory(filteredFaqs, sortedCategories);
        } catch (error) {
            console.error('Error grouping FAQs:', error);
            return [];
        }
    }, [filteredFaqs, sortedCategories]);

    const faqStats = useMemo(() => {
        try {
            return calculateFaqStats(store.faqs, store.categories);
        } catch (error) {
            console.error('Error calculating FAQ stats:', error);
            return {
                total: 0,
                active: 0,
                inactive: 0,
                byCategory: {},
                recentlyUpdated: 0,
                totalCategories: 0,
                activeCategories: 0,
            };
        }
    }, [store.faqs, store.categories]);

    const categoryStats = useMemo(() => {
        try {
            return calculateCategoryStats(store.categories, store.faqs);
        } catch (error) {
            console.error('Error calculating category stats:', error);
            return {
                total: 0,
                active: 0,
                inactive: 0,
                withFaqs: 0,
                averageFaqsPerCategory: 0,
            };
        }
    }, [store.categories, store.faqs]);

    // FAQ Actions
    const loadFAQs = useCallback(async () => {
        try {
            await store.fetchFAQs();
        } catch (error) {
            console.error('Error loading FAQs:', error);
            throw error;
        }
    }, [store.fetchFAQs]);

    const loadFAQ = useCallback(async (id: string) => {
        try {
            return await store.fetchFAQ(id);
        } catch (error) {
            console.error('Error loading FAQ:', error);
            throw error;
        }
    }, [store.fetchFAQ]);

    const createFAQ = useCallback(async (data: FAQFormData) => {
        try {
            // Validate data before creating
            const validation = validateFaqData({
                question: data.question,
                answer: data.answer,
                category_id: data.category_id,
            });

            if (!validation.isValid) {
                throw new Error(Object.values(validation.errors)[0]);
            }

            const enhancedData = {
                ...data,
                question: data.question.trim(),
                answer: data.answer.trim(),
                order_index: data.order_index || getNextFaqOrderIndex(store.faqs, data.category_id),
            };

            return await store.createFAQ(enhancedData);
        } catch (error) {
            console.error('Error creating FAQ:', error);
            throw error;
        }
    }, [store.createFAQ, store.faqs]);

    const updateFAQ = useCallback(async (id: string, data: Partial<FAQFormData>) => {
        try {
            // Validate data if provided
            if (data.question || data.answer || data.category_id) {
                const existingFAQ = store.faqs.find(faq => faq.id === id);
                if (!existingFAQ) {
                    throw new Error('FAQ not found');
                }

                const validation = validateFaqData({
                    question: data.question || existingFAQ.question,
                    answer: data.answer || existingFAQ.answer,
                    category_id: data.category_id || existingFAQ.category_id,
                });

                if (!validation.isValid) {
                    throw new Error(Object.values(validation.errors)[0]);
                }
            }

            // Trim string fields
            const cleanedData = { ...data };
            if (cleanedData.question) cleanedData.question = cleanedData.question.trim();
            if (cleanedData.answer) cleanedData.answer = cleanedData.answer.trim();

            return await store.updateFAQ(id, cleanedData);
        } catch (error) {
            console.error('Error updating FAQ:', error);
            throw error;
        }
    }, [store.updateFAQ, store.faqs]);

    const deleteFAQ = useCallback(async (id: string) => {
        try {
            await store.deleteFAQ(id);
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            throw error;
        }
    }, [store.deleteFAQ]);

    const duplicateFAQ = useCallback(async (id: string) => {
        try {
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
        } catch (error) {
            console.error('Error duplicating FAQ:', error);
            throw error;
        }
    }, [store.faqs, store.createFAQ]);

    // Category Actions
    const loadCategories = useCallback(async () => {
        try {
            await store.fetchCategories();
        } catch (error) {
            console.error('Error loading categories:', error);
            throw error;
        }
    }, [store.fetchCategories]);

    const loadCategory = useCallback(async (id: string) => {
        try {
            return await store.fetchCategory(id);
        } catch (error) {
            console.error('Error loading category:', error);
            throw error;
        }
    }, [store.fetchCategory]);

    const createCategory = useCallback(async (data: FAQCategoryFormData) => {
        try {
            // Validate data before creating
            const validation = validateCategoryData({
                name: data.name,
                description: data.description,
            });

            if (!validation.isValid) {
                throw new Error(Object.values(validation.errors)[0]);
            }

            const enhancedData = {
                ...data,
                name: data.name.trim(),
                description: data.description?.trim(),
                order_index: data.order_index || getNextCategoryOrderIndex(store.categories),
            };

            return await store.createCategory(enhancedData);
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }, [store.createCategory, store.categories]);

    const updateCategory = useCallback(async (id: string, data: Partial<FAQCategoryFormData>) => {
        try {
            // Validate data if provided
            if (data.name !== undefined) {
                const validation = validateCategoryData({
                    name: data.name,
                    description: data.description,
                });

                if (!validation.isValid) {
                    throw new Error(Object.values(validation.errors)[0]);
                }
            }

            // Trim string fields
            const cleanedData = { ...data };
            if (cleanedData.name) cleanedData.name = cleanedData.name.trim();
            if (cleanedData.description) cleanedData.description = cleanedData.description.trim();

            return await store.updateCategory(id, cleanedData);
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }, [store.updateCategory]);

    const deleteCategory = useCallback(async (id: string) => {
        try {
            // Check if category can be deleted
            if (!canDeleteCategory(id, store.faqs)) {
                throw new Error('Cannot delete category that contains FAQs');
            }
            await store.deleteCategory(id);
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
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
        try {
            await Promise.all([
                store.fetchFAQs(),
                store.fetchCategories(),
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
            throw error;
        }
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