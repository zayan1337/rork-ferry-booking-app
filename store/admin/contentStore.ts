import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import {
  TermsAndConditions,
  Promotion,
  TermsFormData,
  PromotionFormData,
  ContentStats,
  ContentFilters,
} from '@/types/content';

interface ContentLoadingStates {
  terms: boolean;
  promotions: boolean;
  singleTerms: boolean;
  singlePromotion: boolean;
}

interface ContentManagementStoreState {
  // Data
  terms: TermsAndConditions[];
  promotions: Promotion[];
  currentTerms: TermsAndConditions | null;
  currentPromotion: Promotion | null;

  // Loading states
  loading: ContentLoadingStates;

  // Error state
  error: string | null;

  // Search and filters
  searchQuery: string;
  filters: ContentFilters;

  // Statistics
  stats: ContentStats;
}

interface ContentManagementStoreActions {
  // Terms CRUD Operations
  fetchTerms: () => Promise<void>;
  fetchTermsById: (id: string) => Promise<TermsAndConditions | null>;
  createTerms: (data: TermsFormData) => Promise<TermsAndConditions>;
  updateTerms: (
    id: string,
    data: Partial<TermsFormData>
  ) => Promise<TermsAndConditions>;
  deleteTerms: (id: string) => Promise<void>;

  // Promotions CRUD Operations
  fetchPromotions: () => Promise<void>;
  fetchPromotionById: (id: string) => Promise<Promotion | null>;
  createPromotion: (data: PromotionFormData) => Promise<Promotion>;
  updatePromotion: (
    id: string,
    data: Partial<PromotionFormData>
  ) => Promise<Promotion>;
  deletePromotion: (id: string) => Promise<void>;

  // Search and Filter Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ContentFilters>) => void;
  clearFilters: () => void;

  // Utility Actions
  calculateStats: () => void;
  clearError: () => void;
  resetCurrentTerms: () => void;
  resetCurrentPromotion: () => void;
  refreshAll: () => Promise<void>;
}

type ContentManagementStore = ContentManagementStoreState &
  ContentManagementStoreActions;

const initialState: ContentManagementStoreState = {
  terms: [],
  promotions: [],
  currentTerms: null,
  currentPromotion: null,
  loading: {
    terms: false,
    promotions: false,
    singleTerms: false,
    singlePromotion: false,
  },
  error: null,
  searchQuery: '',
  filters: {
    terms: {},
    promotions: {},
  },
  stats: {
    totalPromotions: 0,
    activePromotions: 0,
    totalTerms: 0,
    activeTerms: 0,
    currentTermsVersion: '',
  },
};

export const useContentStore = create<ContentManagementStore>((set, get) => ({
  ...initialState,

  // ========================================================================
  // TERMS OPERATIONS
  // ========================================================================

  fetchTerms: async () => {
    set(state => ({
      loading: { ...state.loading, terms: true },
      error: null,
    }));

    try {
      const { data: terms, error } = await supabase
        .from('terms_and_conditions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedTerms: TermsAndConditions[] = (terms || []).map(term => ({
        id: term.id,
        title: term.title,
        content: term.content,
        version: term.version,
        effective_date: term.effective_date,
        is_active: term.is_active,
        created_at: term.created_at,
        updated_at: term.updated_at,
      }));

      set(state => ({
        terms: processedTerms,
        loading: { ...state.loading, terms: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error fetching terms:', error);
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to fetch terms',
        loading: { ...state.loading, terms: false },
      }));
    }
  },

  fetchTermsById: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, singleTerms: true },
      error: null,
    }));

    try {
      const { data: term, error } = await supabase
        .from('terms_and_conditions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (term) {
        const processedTerm: TermsAndConditions = {
          id: term.id,
          title: term.title,
          content: term.content,
          version: term.version,
          effective_date: term.effective_date,
          is_active: term.is_active,
          created_at: term.created_at,
          updated_at: term.updated_at,
        };

        set(state => ({
          currentTerms: processedTerm,
          loading: { ...state.loading, singleTerms: false },
        }));

        return processedTerm;
      }

      set(state => ({
        loading: { ...state.loading, singleTerms: false },
      }));
      return null;
    } catch (error) {
      console.error('Error fetching term:', error);
      set(state => ({
        error: error instanceof Error ? error.message : 'Failed to fetch term',
        loading: { ...state.loading, singleTerms: false },
      }));
      return null;
    }
  },

  createTerms: async (data: TermsFormData) => {
    set(state => ({
      loading: { ...state.loading, terms: true },
      error: null,
    }));

    try {
      const { data: newTerm, error } = await supabase
        .from('terms_and_conditions')
        .insert([
          {
            title: data.title.trim(),
            content: data.content.trim(),
            version: data.version.trim(),
            effective_date: data.effective_date,
            is_active: data.is_active,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const processedTerm: TermsAndConditions = {
        id: newTerm.id,
        title: newTerm.title,
        content: newTerm.content,
        version: newTerm.version,
        effective_date: newTerm.effective_date,
        is_active: newTerm.is_active,
        created_at: newTerm.created_at,
        updated_at: newTerm.updated_at,
      };

      set(state => ({
        terms: [processedTerm, ...state.terms],
        loading: { ...state.loading, terms: false },
      }));

      get().calculateStats();
      return processedTerm;
    } catch (error) {
      console.error('Error creating terms:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to create terms',
        loading: { ...state.loading, terms: false },
      }));
      throw error;
    }
  },

  updateTerms: async (id: string, data: Partial<TermsFormData>) => {
    set(state => ({
      loading: { ...state.loading, terms: true },
      error: null,
    }));

    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title.trim();
      if (data.content !== undefined) updateData.content = data.content.trim();
      if (data.version !== undefined) updateData.version = data.version.trim();
      if (data.effective_date !== undefined)
        updateData.effective_date = data.effective_date;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { data: updatedTerm, error } = await supabase
        .from('terms_and_conditions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const processedTerm: TermsAndConditions = {
        id: updatedTerm.id,
        title: updatedTerm.title,
        content: updatedTerm.content,
        version: updatedTerm.version,
        effective_date: updatedTerm.effective_date,
        is_active: updatedTerm.is_active,
        created_at: updatedTerm.created_at,
        updated_at: updatedTerm.updated_at,
      };

      set(state => ({
        terms: state.terms.map(term => (term.id === id ? processedTerm : term)),
        currentTerms:
          state.currentTerms?.id === id ? processedTerm : state.currentTerms,
        loading: { ...state.loading, terms: false },
      }));

      get().calculateStats();
      return processedTerm;
    } catch (error) {
      console.error('Error updating terms:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to update terms',
        loading: { ...state.loading, terms: false },
      }));
      throw error;
    }
  },

  deleteTerms: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, terms: true },
      error: null,
    }));

    try {
      const { error } = await supabase
        .from('terms_and_conditions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        terms: state.terms.filter(term => term.id !== id),
        currentTerms: state.currentTerms?.id === id ? null : state.currentTerms,
        loading: { ...state.loading, terms: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error deleting terms:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to delete terms',
        loading: { ...state.loading, terms: false },
      }));
      throw error;
    }
  },

  // ========================================================================
  // PROMOTIONS OPERATIONS
  // ========================================================================

  fetchPromotions: async () => {
    set(state => ({
      loading: { ...state.loading, promotions: true },
      error: null,
    }));

    try {
      const { data: promotions, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedPromotions: Promotion[] = (promotions || []).map(
        promotion => ({
          id: promotion.id,
          name: promotion.name,
          description: promotion.description,
          discount_percentage: promotion.discount_percentage,
          start_date: promotion.start_date,
          end_date: promotion.end_date,
          is_first_time_booking_only: promotion.is_first_time_booking_only,
          is_active: promotion.is_active,
          created_at: promotion.created_at,
          updated_at: promotion.updated_at,
        })
      );

      set(state => ({
        promotions: processedPromotions,
        loading: { ...state.loading, promotions: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error fetching promotions:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to fetch promotions',
        loading: { ...state.loading, promotions: false },
      }));
    }
  },

  fetchPromotionById: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, singlePromotion: true },
      error: null,
    }));

    try {
      const { data: promotion, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (promotion) {
        const processedPromotion: Promotion = {
          id: promotion.id,
          name: promotion.name,
          description: promotion.description,
          discount_percentage: promotion.discount_percentage,
          start_date: promotion.start_date,
          end_date: promotion.end_date,
          is_first_time_booking_only: promotion.is_first_time_booking_only,
          is_active: promotion.is_active,
          created_at: promotion.created_at,
          updated_at: promotion.updated_at,
        };

        set(state => ({
          currentPromotion: processedPromotion,
          loading: { ...state.loading, singlePromotion: false },
        }));

        return processedPromotion;
      }

      set(state => ({
        loading: { ...state.loading, singlePromotion: false },
      }));
      return null;
    } catch (error) {
      console.error('Error fetching promotion:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to fetch promotion',
        loading: { ...state.loading, singlePromotion: false },
      }));
      return null;
    }
  },

  createPromotion: async (data: PromotionFormData) => {
    set(state => ({
      loading: { ...state.loading, promotions: true },
      error: null,
    }));

    try {
      const { data: newPromotion, error } = await supabase
        .from('promotions')
        .insert([
          {
            name: data.name.trim(),
            description: data.description?.trim() || null,
            discount_percentage: data.discount_percentage,
            start_date: data.start_date,
            end_date: data.end_date,
            is_first_time_booking_only: data.is_first_time_booking_only,
            is_active: data.is_active,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const processedPromotion: Promotion = {
        id: newPromotion.id,
        name: newPromotion.name,
        description: newPromotion.description,
        discount_percentage: newPromotion.discount_percentage,
        start_date: newPromotion.start_date,
        end_date: newPromotion.end_date,
        is_first_time_booking_only: newPromotion.is_first_time_booking_only,
        is_active: newPromotion.is_active,
        created_at: newPromotion.created_at,
        updated_at: newPromotion.updated_at,
      };

      set(state => ({
        promotions: [processedPromotion, ...state.promotions],
        loading: { ...state.loading, promotions: false },
      }));

      get().calculateStats();
      return processedPromotion;
    } catch (error) {
      console.error('Error creating promotion:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to create promotion',
        loading: { ...state.loading, promotions: false },
      }));
      throw error;
    }
  },

  updatePromotion: async (id: string, data: Partial<PromotionFormData>) => {
    set(state => ({
      loading: { ...state.loading, promotions: true },
      error: null,
    }));

    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name.trim();
      if (data.description !== undefined)
        updateData.description = data.description?.trim() || null;
      if (data.discount_percentage !== undefined)
        updateData.discount_percentage = data.discount_percentage;
      if (data.start_date !== undefined)
        updateData.start_date = data.start_date;
      if (data.end_date !== undefined) updateData.end_date = data.end_date;
      if (data.is_first_time_booking_only !== undefined)
        updateData.is_first_time_booking_only = data.is_first_time_booking_only;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { data: updatedPromotion, error } = await supabase
        .from('promotions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const processedPromotion: Promotion = {
        id: updatedPromotion.id,
        name: updatedPromotion.name,
        description: updatedPromotion.description,
        discount_percentage: updatedPromotion.discount_percentage,
        start_date: updatedPromotion.start_date,
        end_date: updatedPromotion.end_date,
        is_first_time_booking_only: updatedPromotion.is_first_time_booking_only,
        is_active: updatedPromotion.is_active,
        created_at: updatedPromotion.created_at,
        updated_at: updatedPromotion.updated_at,
      };

      set(state => ({
        promotions: state.promotions.map(promotion =>
          promotion.id === id ? processedPromotion : promotion
        ),
        currentPromotion:
          state.currentPromotion?.id === id
            ? processedPromotion
            : state.currentPromotion,
        loading: { ...state.loading, promotions: false },
      }));

      get().calculateStats();
      return processedPromotion;
    } catch (error) {
      console.error('Error updating promotion:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to update promotion',
        loading: { ...state.loading, promotions: false },
      }));
      throw error;
    }
  },

  deletePromotion: async (id: string) => {
    set(state => ({
      loading: { ...state.loading, promotions: true },
      error: null,
    }));

    try {
      const { error } = await supabase.from('promotions').delete().eq('id', id);

      if (error) throw error;

      set(state => ({
        promotions: state.promotions.filter(promotion => promotion.id !== id),
        currentPromotion:
          state.currentPromotion?.id === id ? null : state.currentPromotion,
        loading: { ...state.loading, promotions: false },
      }));

      get().calculateStats();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      set(state => ({
        error:
          error instanceof Error ? error.message : 'Failed to delete promotion',
        loading: { ...state.loading, promotions: false },
      }));
      throw error;
    }
  },

  // ========================================================================
  // UTILITY ACTIONS
  // ========================================================================

  refreshAll: async () => {
    await Promise.all([get().fetchTerms(), get().fetchPromotions()]);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setFilters: (filters: Partial<ContentFilters>) => {
    set(state => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => {
    set(state => ({
      filters: {
        ...state.filters,
        terms: {},
        promotions: {},
      },
    }));
  },

  calculateStats: () => {
    const state = get();
    const stats: ContentStats = {
      ...state.stats,
      totalTerms: state.terms.length,
      activeTerms: state.terms.filter(t => t.is_active).length,
      totalPromotions: state.promotions.length,
      activePromotions: state.promotions.filter(p => p.is_active).length,
    };

    set({ stats });
  },

  clearError: () => {
    set({ error: null });
  },

  resetCurrentTerms: () => {
    set({ currentTerms: null });
  },

  resetCurrentPromotion: () => {
    set({ currentPromotion: null });
  },
}));
