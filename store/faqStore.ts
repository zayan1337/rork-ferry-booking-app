import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import type { DBFaq, DBFaqCategory } from '@/types/database';

interface FaqState {
  // Data
  faqs: DBFaq[];
  categories: DBFaqCategory[];
  faqsByCategory: Record<string, DBFaq[]>;

  // Loading states
  isLoadingFaqs: boolean;
  isLoadingCategories: boolean;

  // Error states
  faqsError: string | null;
  categoriesError: string | null;

  // Actions
  fetchFaqs: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchFaqsWithCategories: () => Promise<void>;
  organizeFaqsByCategory: () => void;
  clearErrors: () => void;
}

export const useFaqStore = create<FaqState>((set, get) => ({
  // Initial state
  faqs: [],
  categories: [],
  faqsByCategory: {},
  isLoadingFaqs: false,
  isLoadingCategories: false,
  faqsError: null,
  categoriesError: null,

  // Fetch FAQs
  fetchFaqs: async () => {
    set({ isLoadingFaqs: true, faqsError: null });

    try {
      const { data: faqs, error } = await supabase
        .from('faqs')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      set({
        faqs: faqs || [],
        isLoadingFaqs: false,
      });

      // Organize FAQs by category after fetching
      get().organizeFaqsByCategory();
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      set({
        faqsError:
          error instanceof Error ? error.message : 'Failed to fetch FAQs',
        isLoadingFaqs: false,
      });
    }
  },

  // Fetch FAQ categories
  fetchCategories: async () => {
    set({ isLoadingCategories: true, categoriesError: null });

    try {
      const { data: categories, error } = await supabase
        .from('faq_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      set({
        categories: categories || [],
        isLoadingCategories: false,
      });
    } catch (error) {
      console.error('Error fetching FAQ categories:', error);
      set({
        categoriesError:
          error instanceof Error
            ? error.message
            : 'Failed to fetch FAQ categories',
        isLoadingCategories: false,
      });
    }
  },

  // Fetch FAQs with their categories
  fetchFaqsWithCategories: async () => {
    set({
      isLoadingFaqs: true,
      isLoadingCategories: true,
      faqsError: null,
      categoriesError: null,
    });

    try {
      const { data: faqsWithCategories, error } = await supabase
        .from('faqs')
        .select(
          `
          *,
          category:faq_categories(*)
        `
        )
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      // Extract categories from the response
      const categoriesMap = new Map<string, DBFaqCategory>();
      const processedFaqs: DBFaq[] = [];

      faqsWithCategories?.forEach(faq => {
        if (faq.category) {
          categoriesMap.set(faq.category.id, faq.category);
        }
        processedFaqs.push({
          ...faq,
          category: faq.category,
        });
      });

      const uniqueCategories = Array.from(categoriesMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      set({
        faqs: processedFaqs,
        categories: uniqueCategories,
        isLoadingFaqs: false,
        isLoadingCategories: false,
      });

      // Organize FAQs by category after fetching
      get().organizeFaqsByCategory();
    } catch (error) {
      console.error('Error fetching FAQs with categories:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch FAQs';
      set({
        faqsError: errorMessage,
        categoriesError: errorMessage,
        isLoadingFaqs: false,
        isLoadingCategories: false,
      });
    }
  },

  // Organize FAQs by category
  organizeFaqsByCategory: () => {
    const { faqs } = get();
    const organized: Record<string, DBFaq[]> = {};

    faqs.forEach(faq => {
      const categoryId = faq.category_id;
      if (!organized[categoryId]) {
        organized[categoryId] = [];
      }
      organized[categoryId].push(faq);
    });

    set({ faqsByCategory: organized });
  },

  // Clear all errors
  clearErrors: () => {
    set({
      faqsError: null,
      categoriesError: null,
    });
  },
}));
