import { create } from 'zustand';
import type { TermsStore } from '@/types';
import { fetchActiveTerms } from '@/utils/termsService';

export const useTermsStore = create<TermsStore>((set, get) => ({
  terms: [],
  isLoading: false,
  error: null,

  fetchTerms: async () => {
    set({ isLoading: true, error: null });
    try {
      const terms = await fetchActiveTerms();
      set({ terms, isLoading: false });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch terms and conditions';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  getActiveTerms: () => {
    const { terms } = get();
    return terms.filter(term => term.is_active);
  },

  clearError: () => {
    set({ error: null });
  },
}));
