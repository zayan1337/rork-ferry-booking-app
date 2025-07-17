import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import {
    FAQ,
    FAQCategory,
    FAQFormData,
    FAQCategoryFormData,
    FAQStats,
    FAQFilters,
    FAQWithDetails,
    FAQCategoryWithStats
} from '@/types/content';
import {
    DatabaseFAQ,
    DatabaseFAQCategory,
    FAQManagementView,
    FAQCategoryManagementView
} from '@/types/database';

interface FAQLoadingStates {
    faqs: boolean;
    categories: boolean;
    singleFAQ: boolean;
    singleCategory: boolean;
}

interface FAQStoreState {
    // Data
    faqs: FAQ[];
    categories: FAQCategory[];
    currentFAQ: FAQ | null;
    currentCategory: FAQCategory | null;

    // Loading states
    loading: FAQLoadingStates;

    // Error states
    error: string | null;

    // Search and filters
    searchQuery: string;
    filters: FAQFilters;

    // Statistics
    stats: FAQStats;
}

interface FAQStoreActions {
    // FAQ CRUD
    fetchFAQs: () => Promise<void>;
    fetchFAQ: (id: string) => Promise<FAQ | null>;
    createFAQ: (data: FAQFormData) => Promise<FAQ>;
    updateFAQ: (id: string, data: Partial<FAQFormData>) => Promise<FAQ>;
    deleteFAQ: (id: string) => Promise<void>;

    // FAQ Category CRUD
    fetchCategories: () => Promise<void>;
    fetchCategory: (id: string) => Promise<FAQCategory | null>;
    createCategory: (data: FAQCategoryFormData) => Promise<FAQCategory>;
    updateCategory: (id: string, data: Partial<FAQCategoryFormData>) => Promise<FAQCategory>;
    deleteCategory: (id: string) => Promise<void>;

    // Search and filter
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<FAQFilters>) => void;
    clearFilters: () => void;

    // Utility methods
    searchFAQs: (query: string) => FAQ[];
    filterFAQsByCategory: (categoryId: string) => FAQ[];
    filterFAQsByStatus: (isActive: boolean) => FAQ[];
    calculateStats: () => void;

    // Error handling
    clearError: () => void;
    setError: (error: string) => void;

    // Reset methods
    resetCurrentFAQ: () => void;
    resetCurrentCategory: () => void;
    resetStore: () => void;
}

type FAQStore = FAQStoreState & FAQStoreActions;

const initialState: FAQStoreState = {
    faqs: [],
    categories: [],
    currentFAQ: null,
    currentCategory: null,
    loading: {
        faqs: false,
        categories: false,
        singleFAQ: false,
        singleCategory: false,
    },
    error: null,
    searchQuery: '',
    filters: {},
    stats: {
        total: 0,
        active: 0,
        inactive: 0,
        byCategory: {},
        recentlyUpdated: 0,
        totalCategories: 0,
        activeCategories: 0,
    },
};

export const useFAQManagementStore = create<FAQStore>((set, get) => ({
    ...initialState,

    // FAQ CRUD Operations
    fetchFAQs: async () => {
        set((state) => ({
            loading: { ...state.loading, faqs: true },
            error: null
        }));

        try {
            const { data: faqs, error } = await supabase
                .from('faqs')
                .select(`
          *,
          category:faq_categories(*)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const processedFAQs: FAQ[] = (faqs || []).map(faq => ({
                id: faq.id,
                category_id: faq.category_id,
                question: faq.question,
                answer: faq.answer,
                is_active: true, // Default value since not in DB schema
                order_index: 0, // Default value since not in DB schema  
                created_at: faq.created_at,
                updated_at: faq.updated_at,
                category: faq.category,
            }));

            set((state) => ({
                faqs: processedFAQs,
                loading: { ...state.loading, faqs: false }
            }));

            get().calculateStats();
        } catch (error) {
            console.error('Error fetching FAQs:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to fetch FAQs',
                loading: { ...state.loading, faqs: false }
            }));
        }
    },

    fetchFAQ: async (id: string) => {
        set((state) => ({
            loading: { ...state.loading, singleFAQ: true },
            error: null
        }));

        try {
            const { data: faq, error } = await supabase
                .from('faqs')
                .select(`
          *,
          category:faq_categories(*)
        `)
                .eq('id', id)
                .single();

            if (error) throw error;

            if (faq) {
                const processedFAQ: FAQ = {
                    id: faq.id,
                    category_id: faq.category_id,
                    question: faq.question,
                    answer: faq.answer,
                    is_active: true,
                    order_index: 0,
                    created_at: faq.created_at,
                    updated_at: faq.updated_at,
                    category: faq.category,
                };

                set((state) => ({
                    currentFAQ: processedFAQ,
                    loading: { ...state.loading, singleFAQ: false }
                }));

                return processedFAQ;
            }

            set((state) => ({
                loading: { ...state.loading, singleFAQ: false }
            }));
            return null;
        } catch (error) {
            console.error('Error fetching FAQ:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to fetch FAQ',
                loading: { ...state.loading, singleFAQ: false }
            }));
            return null;
        }
    },

    createFAQ: async (data: FAQFormData) => {
        set((state) => ({
            loading: { ...state.loading, faqs: true },
            error: null
        }));

        try {
            const { data: newFAQ, error } = await supabase
                .from('faqs')
                .insert([{
                    category_id: data.category_id,
                    question: data.question,
                    answer: data.answer,
                }])
                .select(`
          *,
          category:faq_categories(*)
        `)
                .single();

            if (error) throw error;

            const processedFAQ: FAQ = {
                id: newFAQ.id,
                category_id: newFAQ.category_id,
                question: newFAQ.question,
                answer: newFAQ.answer,
                is_active: data.is_active,
                order_index: data.order_index,
                created_at: newFAQ.created_at,
                updated_at: newFAQ.updated_at,
                category: newFAQ.category,
            };

            set((state) => ({
                faqs: [processedFAQ, ...state.faqs],
                loading: { ...state.loading, faqs: false }
            }));

            get().calculateStats();
            return processedFAQ;
        } catch (error) {
            console.error('Error creating FAQ:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create FAQ';
            set((state) => ({
                error: errorMessage,
                loading: { ...state.loading, faqs: false }
            }));
            throw new Error(errorMessage);
        }
    },

    updateFAQ: async (id: string, data: Partial<FAQFormData>) => {
        set((state) => ({
            loading: { ...state.loading, faqs: true },
            error: null
        }));

        try {
            const updateData: any = {};
            if (data.category_id) updateData.category_id = data.category_id;
            if (data.question) updateData.question = data.question;
            if (data.answer) updateData.answer = data.answer;

            const { data: updatedFAQ, error } = await supabase
                .from('faqs')
                .update(updateData)
                .eq('id', id)
                .select(`
          *,
          category:faq_categories(*)
        `)
                .single();

            if (error) throw error;

            const processedFAQ: FAQ = {
                id: updatedFAQ.id,
                category_id: updatedFAQ.category_id,
                question: updatedFAQ.question,
                answer: updatedFAQ.answer,
                is_active: data.is_active !== undefined ? data.is_active : true,
                order_index: data.order_index !== undefined ? data.order_index : 0,
                created_at: updatedFAQ.created_at,
                updated_at: updatedFAQ.updated_at,
                category: updatedFAQ.category,
            };

            set((state) => ({
                faqs: state.faqs.map(faq => faq.id === id ? processedFAQ : faq),
                currentFAQ: state.currentFAQ?.id === id ? processedFAQ : state.currentFAQ,
                loading: { ...state.loading, faqs: false }
            }));

            get().calculateStats();
            return processedFAQ;
        } catch (error) {
            console.error('Error updating FAQ:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update FAQ';
            set((state) => ({
                error: errorMessage,
                loading: { ...state.loading, faqs: false }
            }));
            throw new Error(errorMessage);
        }
    },

    deleteFAQ: async (id: string) => {
        set((state) => ({
            loading: { ...state.loading, faqs: true },
            error: null
        }));

        try {
            const { error } = await supabase
                .from('faqs')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                faqs: state.faqs.filter(faq => faq.id !== id),
                currentFAQ: state.currentFAQ?.id === id ? null : state.currentFAQ,
                loading: { ...state.loading, faqs: false }
            }));

            get().calculateStats();
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete FAQ';
            set((state) => ({
                error: errorMessage,
                loading: { ...state.loading, faqs: false }
            }));
            throw new Error(errorMessage);
        }
    },

    // FAQ Category CRUD Operations
    fetchCategories: async () => {
        set((state) => ({
            loading: { ...state.loading, categories: true },
            error: null
        }));

        try {
            const { data: categories, error } = await supabase
                .from('faq_categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            const processedCategories: FAQCategory[] = (categories || []).map(category => ({
                id: category.id,
                name: category.name,
                description: '',
                order_index: 0,
                is_active: true,
                created_at: category.created_at,
                updated_at: category.created_at, // Use created_at as updated_at since not in schema
            }));

            set((state) => ({
                categories: processedCategories,
                loading: { ...state.loading, categories: false }
            }));

            get().calculateStats();
        } catch (error) {
            console.error('Error fetching categories:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to fetch categories',
                loading: { ...state.loading, categories: false }
            }));
        }
    },

    fetchCategory: async (id: string) => {
        set((state) => ({
            loading: { ...state.loading, singleCategory: true },
            error: null
        }));

        try {
            const { data: category, error } = await supabase
                .from('faq_categories')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (category) {
                const processedCategory: FAQCategory = {
                    id: category.id,
                    name: category.name,
                    description: '',
                    order_index: 0,
                    is_active: true,
                    created_at: category.created_at,
                    updated_at: category.created_at,
                };

                set((state) => ({
                    currentCategory: processedCategory,
                    loading: { ...state.loading, singleCategory: false }
                }));

                return processedCategory;
            }

            set((state) => ({
                loading: { ...state.loading, singleCategory: false }
            }));
            return null;
        } catch (error) {
            console.error('Error fetching category:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to fetch category',
                loading: { ...state.loading, singleCategory: false }
            }));
            return null;
        }
    },

    createCategory: async (data: FAQCategoryFormData) => {
        set((state) => ({
            loading: { ...state.loading, categories: true },
            error: null
        }));

        try {
            const { data: newCategory, error } = await supabase
                .from('faq_categories')
                .insert([{
                    name: data.name,
                }])
                .select('*')
                .single();

            if (error) throw error;

            const processedCategory: FAQCategory = {
                id: newCategory.id,
                name: newCategory.name,
                description: data.description || '',
                order_index: data.order_index,
                is_active: data.is_active,
                created_at: newCategory.created_at,
                updated_at: newCategory.created_at,
            };

            set((state) => ({
                categories: [processedCategory, ...state.categories],
                loading: { ...state.loading, categories: false }
            }));

            get().calculateStats();
            return processedCategory;
        } catch (error) {
            console.error('Error creating category:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create category';
            set((state) => ({
                error: errorMessage,
                loading: { ...state.loading, categories: false }
            }));
            throw new Error(errorMessage);
        }
    },

    updateCategory: async (id: string, data: Partial<FAQCategoryFormData>) => {
        set((state) => ({
            loading: { ...state.loading, categories: true },
            error: null
        }));

        try {
            const updateData: any = {};
            if (data.name) updateData.name = data.name;

            const { data: updatedCategory, error } = await supabase
                .from('faq_categories')
                .update(updateData)
                .eq('id', id)
                .select('*')
                .single();

            if (error) throw error;

            const processedCategory: FAQCategory = {
                id: updatedCategory.id,
                name: updatedCategory.name,
                description: data.description || '',
                order_index: data.order_index !== undefined ? data.order_index : 0,
                is_active: data.is_active !== undefined ? data.is_active : true,
                created_at: updatedCategory.created_at,
                updated_at: updatedCategory.created_at,
            };

            set((state) => ({
                categories: state.categories.map(cat => cat.id === id ? processedCategory : cat),
                currentCategory: state.currentCategory?.id === id ? processedCategory : state.currentCategory,
                loading: { ...state.loading, categories: false }
            }));

            get().calculateStats();
            return processedCategory;
        } catch (error) {
            console.error('Error updating category:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
            set((state) => ({
                error: errorMessage,
                loading: { ...state.loading, categories: false }
            }));
            throw new Error(errorMessage);
        }
    },

    deleteCategory: async (id: string) => {
        set((state) => ({
            loading: { ...state.loading, categories: true },
            error: null
        }));

        try {
            // Check if category has FAQs
            const { faqs } = get();
            const categoryFAQs = faqs.filter(faq => faq.category_id === id);

            if (categoryFAQs.length > 0) {
                throw new Error('Cannot delete category with existing FAQs. Please move or delete the FAQs first.');
            }

            const { error } = await supabase
                .from('faq_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                categories: state.categories.filter(cat => cat.id !== id),
                currentCategory: state.currentCategory?.id === id ? null : state.currentCategory,
                loading: { ...state.loading, categories: false }
            }));

            get().calculateStats();
        } catch (error) {
            console.error('Error deleting category:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete category';
            set((state) => ({
                error: errorMessage,
                loading: { ...state.loading, categories: false }
            }));
            throw new Error(errorMessage);
        }
    },

    // Search and filter methods
    setSearchQuery: (query: string) => {
        set({ searchQuery: query });
    },

    setFilters: (filters: Partial<FAQFilters>) => {
        set((state) => ({
            filters: { ...state.filters, ...filters }
        }));
    },

    clearFilters: () => {
        set({
            filters: {},
            searchQuery: ''
        });
    },

    searchFAQs: (query: string) => {
        const { faqs } = get();
        if (!query.trim()) return faqs;

        const lowerQuery = query.toLowerCase();
        return faqs.filter(faq =>
            faq.question.toLowerCase().includes(lowerQuery) ||
            faq.answer.toLowerCase().includes(lowerQuery)
        );
    },

    filterFAQsByCategory: (categoryId: string) => {
        const { faqs } = get();
        return faqs.filter(faq => faq.category_id === categoryId);
    },

    filterFAQsByStatus: (isActive: boolean) => {
        const { faqs } = get();
        return faqs.filter(faq => faq.is_active === isActive);
    },

    calculateStats: () => {
        const { faqs, categories } = get();

        const stats: FAQStats = {
            total: faqs.length,
            active: faqs.filter(faq => faq.is_active).length,
            inactive: faqs.filter(faq => !faq.is_active).length,
            byCategory: {},
            recentlyUpdated: 0,
            totalCategories: categories.length,
            activeCategories: categories.filter(cat => cat.is_active).length,
        };

        // Count FAQs by category
        faqs.forEach(faq => {
            if (stats.byCategory[faq.category_id]) {
                stats.byCategory[faq.category_id]++;
            } else {
                stats.byCategory[faq.category_id] = 1;
            }
        });

        // Count recently updated (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        stats.recentlyUpdated = faqs.filter(faq =>
            new Date(faq.updated_at) > sevenDaysAgo
        ).length;

        set({ stats });
    },

    // Error handling
    clearError: () => {
        set({ error: null });
    },

    setError: (error: string) => {
        set({ error });
    },

    // Reset methods
    resetCurrentFAQ: () => {
        set({ currentFAQ: null });
    },

    resetCurrentCategory: () => {
        set({ currentCategory: null });
    },

    resetStore: () => {
        set(initialState);
    },
})); 