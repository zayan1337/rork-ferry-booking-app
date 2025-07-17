import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Zone,
  FAQ,
  FAQCategory,
  TermsAndConditions,
  Translation,
  Promotion,
  Announcement,
  Island,
  ContentStats,
  ContentFilters,
  ContentSearchQueries,
  ContentLoadingStates,
  IslandFormData,
  ZoneFormData,
  FAQFormData,
  TranslationFormData,
} from "@/types/content";
import {
  fetchIslands,
  fetchIsland,
  createIsland,
  updateIsland,
  deleteIsland,
} from "@/utils/operationsService";
import {
  fetchZones as fetchZonesService,
  fetchZone as fetchZoneService,
  createZone as createZoneService,
  updateZone as updateZoneService,
  deleteZone as deleteZoneService,
} from "@/utils/zoneService";
import { supabase } from "@/utils/supabase";

interface ContentState {
  // Data
  islands: Island[];
  zones: Zone[];
  faqs: FAQ[];
  faqCategories: FAQCategory[];
  terms: TermsAndConditions[];
  translations: Translation[];
  promotions: Promotion[];
  announcements: Announcement[];

  // Loading states
  loading: ContentLoadingStates;

  // Search queries
  searchQueries: ContentSearchQueries;

  // Filters
  filters: ContentFilters;

  // Stats
  stats: ContentStats;

  // Actions
  setLoading: (key: keyof ContentLoadingStates, value: boolean) => void;
  setSearchQuery: (key: keyof ContentSearchQueries, query: string) => void;
  setFilter: (key: keyof ContentFilters, filter: any) => void;

  // Islands CRUD
  fetchIslands: () => Promise<void>;
  addIsland: (island: IslandFormData) => Promise<void>;
  updateIsland: (id: string, updates: Partial<IslandFormData>) => Promise<void>;
  deleteIsland: (id: string) => Promise<void>;
  getIsland: (id: string) => Island | undefined;

  // Zones CRUD
  fetchZones: () => Promise<void>;
  addZone: (zone: ZoneFormData) => Promise<void>;
  updateZone: (id: string, updates: Partial<ZoneFormData>) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;
  getZone: (id: string) => Zone | undefined;

  // FAQ CRUD
  fetchFAQs: () => Promise<void>;
  fetchFAQCategories: () => Promise<void>;
  addFAQ: (faq: FAQFormData) => Promise<void>;
  updateFAQ: (id: string, updates: Partial<FAQFormData>) => Promise<void>;
  deleteFAQ: (id: string) => Promise<void>;
  getFAQ: (id: string) => FAQ | undefined;

  addFAQCategory: (category: { name: string; description?: string; order_index: number }) => Promise<void>;
  updateFAQCategory: (id: string, updates: Partial<FAQCategory>) => Promise<void>;
  deleteFAQCategory: (id: string) => Promise<void>;

  // Terms CRUD
  fetchTerms: () => Promise<void>;
  addTerms: (terms: Omit<TermsAndConditions, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTerms: (id: string, updates: Partial<TermsAndConditions>) => Promise<void>;
  deleteTerms: (id: string) => Promise<void>;
  getTerms: (id: string) => TermsAndConditions | undefined;

  // Translations CRUD
  fetchTranslations: () => Promise<void>;
  addTranslation: (translation: TranslationFormData) => Promise<void>;
  updateTranslation: (id: string, updates: Partial<TranslationFormData>) => Promise<void>;
  deleteTranslation: (id: string) => Promise<void>;
  getTranslation: (id: string) => Translation | undefined;

  // Promotions CRUD
  fetchPromotions: () => Promise<void>;
  addPromotion: (promotion: Omit<Promotion, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updatePromotion: (id: string, updates: Partial<Promotion>) => Promise<void>;
  deletePromotion: (id: string) => Promise<void>;
  getPromotion: (id: string) => Promotion | undefined;

  // Announcements CRUD
  fetchAnnouncements: () => Promise<void>;
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  getAnnouncement: (id: string) => Announcement | undefined;

  // Bulk operations
  bulkUpdateIslands: (updates: { id: string; updates: Partial<Island> }[]) => Promise<void>;
  bulkDeleteIslands: (ids: string[]) => Promise<void>;
  bulkUpdateFAQs: (updates: { id: string; updates: Partial<FAQ> }[]) => Promise<void>;
  bulkDeleteFAQs: (ids: string[]) => Promise<void>;

  // Utility functions
  refreshData: () => Promise<void>;
  calculateStats: () => void;
  clearSearchQueries: () => void;
  clearFilters: () => void;

  // FAQ specific methods
  searchFAQs: (query: string) => FAQ[];
  filterFAQsByCategory: (categoryId: string, searchQuery?: string) => FAQ[];
  filterFAQsByStatus: (isActive: boolean) => FAQ[];
  getFAQStats: () => {
    total: number;
    active: number;
    inactive: number;
    byCategory: Record<string, number>;
    recentlyUpdated: number;
    totalCategories: number;
    activeCategories: number;
  };
}

// Mock data for development (islands will be fetched from API)

const mockFAQCategories: FAQCategory[] = [
  {
    id: "1",
    name: "Booking",
    description: "Questions about booking tickets",
    order_index: 1,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    name: "Payment",
    description: "Questions about payment methods",
    order_index: 2,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    name: "Travel",
    description: "Questions about travel and schedules",
    order_index: 3,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const mockFAQs: FAQ[] = [
  {
    id: "1",
    category_id: "1",
    question: "How do I book a ferry ticket?",
    answer: "You can book a ferry ticket through our mobile app or website. Simply select your route, date, and time, then proceed with payment.",
    order_index: 1,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "2",
    category_id: "1",
    question: "Can I modify my booking?",
    answer: "Yes, you can modify your booking up to 2 hours before departure. Modification fees may apply depending on the changes.",
    order_index: 2,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "3",
    category_id: "2",
    question: "What payment methods are accepted?",
    answer: "We accept bank transfers, BML, MIB, Ooredoo m-Faisaa, and FahiPay. Cash payments are not accepted.",
    order_index: 1,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      // Initial data
      islands: [],
      zones: [],
      faqs: mockFAQs,
      faqCategories: mockFAQCategories,
      terms: [],
      translations: [],
      promotions: [],
      announcements: [],

      // Initial loading states
      loading: {
        islands: false,
        zones: false,
        faq: false,
        faqCategories: false,
        translations: false,
        promotions: false,
        announcements: false,
      },

      // Initial search queries
      searchQueries: {
        islands: '',
        zones: '',
        faq: '',
        translations: '',
      },

      // Initial filters
      filters: {
        islands: {},
        zones: {},
        faq: {},
        translations: {},
      },

      // Initial stats
      stats: {
        totalIslands: 0,
        activeIslands: 0,
        totalZones: 0,
        activeZones: 0,
        totalFAQs: 0,
        activeFAQs: 0,
        totalTranslations: 0,
        completedTranslations: 0,
        totalPromotions: 0,
        activePromotions: 0,
        totalAnnouncements: 0,
        activeAnnouncements: 0,
      },

      // Basic actions
      setLoading: (key, value) => {
        set((state) => ({
          loading: { ...state.loading, [key]: value },
        }));
      },

      setSearchQuery: (key, query) => {
        set((state) => ({
          searchQueries: { ...state.searchQueries, [key]: query },
        }));
      },

      setFilter: (key, filter) => {
        set((state) => ({
          filters: { ...state.filters, [key]: filter },
        }));
      },

      // Islands CRUD
      fetchIslands: async () => {
        set((state) => ({ loading: { ...state.loading, islands: true } }));
        try {
          const islands = await fetchIslands();
          set((state) => ({
            islands: islands.map(island => ({
              ...island,
              updated_at: island.created_at, // Add updated_at field
            })),
            loading: { ...state.loading, islands: false }
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to fetch islands:', error);
          set((state) => ({ loading: { ...state.loading, islands: false } }));
        }
      },

      addIsland: async (island) => {
        try {
          const newIsland = await createIsland(island);
          set((state) => ({
            islands: [...state.islands, {
              ...newIsland,
              updated_at: newIsland.created_at, // Add updated_at field
            }],
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to add island:', error);
          throw error;
        }
      },

      updateIsland: async (id, updates) => {
        try {
          const updatedIsland = await updateIsland(id, updates);
          set((state) => ({
            islands: state.islands.map((island) =>
              island.id === id
                ? { ...updatedIsland, updated_at: new Date().toISOString() }
                : island
            ),
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to update island:', error);
          throw error;
        }
      },

      deleteIsland: async (id) => {
        try {
          await deleteIsland(id);
          set((state) => ({
            islands: state.islands.filter((island) => island.id !== id),
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to delete island:', error);
          throw error;
        }
      },

      getIsland: (id) => {
        return get().islands.find((island) => island.id === id);
      },

      // Zones CRUD
      fetchZones: async () => {
        set((state) => ({ loading: { ...state.loading, zones: true } }));
        try {
          const zones = await fetchZonesService();
          set((state) => ({
            zones,
            loading: { ...state.loading, zones: false }
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to fetch zones:', error);
          set((state) => ({ loading: { ...state.loading, zones: false } }));
        }
      },

      addZone: async (zone) => {
        try {
          const newZone = await createZoneService(zone);
          set((state) => ({
            zones: [...state.zones, newZone],
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to add zone:', error);
          throw error;
        }
      },

      updateZone: async (id, updates) => {
        try {
          const updatedZone = await updateZoneService(id, updates);
          set((state) => ({
            zones: state.zones.map((zone) =>
              zone.id === id ? updatedZone : zone
            ),
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to update zone:', error);
          throw error;
        }
      },

      deleteZone: async (id) => {
        try {
          await deleteZoneService(id);
          set((state) => ({
            zones: state.zones.filter((zone) => zone.id !== id),
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to delete zone:', error);
          throw error;
        }
      },

      getZone: (id) => {
        return get().zones.find((zone) => zone.id === id);
      },

      // FAQ CRUD
      fetchFAQs: async () => {
        set((state) => ({ loading: { ...state.loading, faqs: true } }));
        try {
          const { data: faqs, error } = await supabase
            .from('faqs')
            .select(`
              *,
              category:faq_categories(*)
            `)
            .order('order_index', { ascending: true });

          if (error) throw error;

          const processedFaqs = (faqs || []).map(faq => ({
            ...faq,
            is_active: true, // Default since not in DB schema
            order_index: faq.order_index || 0,
          }));

          set((state) => ({
            faqs: processedFaqs,
            loading: { ...state.loading, faq: false }
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to fetch FAQs:', error);
          set((state) => ({ loading: { ...state.loading, faq: false } }));
          throw error;
        }
      },

      fetchFAQCategories: async () => {
        set((state) => ({ loading: { ...state.loading, faqCategories: true } }));
        try {
          const { data: categories, error } = await supabase
            .from('faq_categories')
            .select('*')
            .order('name', { ascending: true });

          if (error) throw error;

          const processedCategories = (categories || []).map(category => ({
            ...category,
            description: category.description || '',
            order_index: category.order_index || 0,
            is_active: true, // Default since not in DB schema
          }));

          set((state) => ({
            faqCategories: processedCategories,
            loading: { ...state.loading, faqCategories: false }
          }));
        } catch (error) {
          console.error('Failed to fetch FAQ categories:', error);
          set((state) => ({ loading: { ...state.loading, faqCategories: false } }));
          throw error;
        }
      },

      addFAQ: async (faqData) => {
        try {
          const { data: newFAQ, error } = await supabase
            .from('faqs')
            .insert([{
              category_id: faqData.category_id,
              question: faqData.question,
              answer: faqData.answer,
            }])
            .select(`
              *,
              category:faq_categories(*)
            `)
            .single();

          if (error) throw error;

          const processedFAQ: FAQ = {
            ...newFAQ,
            is_active: faqData.is_active,
            order_index: faqData.order_index,
          };

          set((state) => ({
            faqs: [...state.faqs, processedFAQ],
          }));
          get().calculateStats();
          return processedFAQ;
        } catch (error) {
          console.error('Failed to add FAQ:', error);
          throw error;
        }
      },

      updateFAQ: async (id, updates) => {
        try {
          const { data: updatedFAQ, error } = await supabase
            .from('faqs')
            .update({
              category_id: updates.category_id,
              question: updates.question,
              answer: updates.answer,
            })
            .eq('id', id)
            .select(`
              *,
              category:faq_categories(*)
            `)
            .single();

          if (error) throw error;

          const processedFAQ: FAQ = {
            ...updatedFAQ,
            is_active: updates.is_active !== undefined ? updates.is_active : true,
            order_index: updates.order_index !== undefined ? updates.order_index : 0,
          };

          set((state) => ({
            faqs: state.faqs.map((faq) =>
              faq.id === id ? processedFAQ : faq
            ),
          }));
          get().calculateStats();
          return processedFAQ;
        } catch (error) {
          console.error('Failed to update FAQ:', error);
          throw error;
        }
      },

      deleteFAQ: async (id) => {
        try {
          const { error } = await supabase
            .from('faqs')
            .delete()
            .eq('id', id);

          if (error) throw error;

          set((state) => ({
            faqs: state.faqs.filter((faq) => faq.id !== id),
          }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to delete FAQ:', error);
          throw error;
        }
      },

      getFAQ: (id) => {
        return get().faqs.find((faq) => faq.id === id);
      },

      addFAQCategory: async (categoryData) => {
        try {
          const { data: newCategory, error } = await supabase
            .from('faq_categories')
            .insert([{
              name: categoryData.name,
            }])
            .select('*')
            .single();

          if (error) throw error;

          const processedCategory: FAQCategory = {
            ...newCategory,
            description: categoryData.description || '',
            order_index: categoryData.order_index,
            is_active: true,
          };

          set((state) => ({
            faqCategories: [...state.faqCategories, processedCategory],
          }));
          return processedCategory;
        } catch (error) {
          console.error('Failed to add FAQ category:', error);
          throw error;
        }
      },

      updateFAQCategory: async (id, updates) => {
        try {
          const { data: updatedCategory, error } = await supabase
            .from('faq_categories')
            .update({
              name: updates.name,
            })
            .eq('id', id)
            .select('*')
            .single();

          if (error) throw error;

          const processedCategory: FAQCategory = {
            ...updatedCategory,
            description: updates.description || '',
            order_index: updates.order_index !== undefined ? updates.order_index : 0,
            is_active: updates.is_active !== undefined ? updates.is_active : true,
          };

          set((state) => ({
            faqCategories: state.faqCategories.map((category) =>
              category.id === id ? processedCategory : category
            ),
          }));
          return processedCategory;
        } catch (error) {
          console.error('Failed to update FAQ category:', error);
          throw error;
        }
      },

      deleteFAQCategory: async (id) => {
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
            faqCategories: state.faqCategories.filter((category) => category.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete FAQ category:', error);
          throw error;
        }
      },

      getFAQCategory: (id) => {
        return get().faqCategories.find((category) => category.id === id);
      },

      // Search and filter methods
      searchFAQs: (query: string) => {
        const { faqs } = get();
        if (!query.trim()) return faqs;

        const lowerQuery = query.toLowerCase();
        return faqs.filter(faq =>
          faq.question.toLowerCase().includes(lowerQuery) ||
          faq.answer.toLowerCase().includes(lowerQuery)
        );
      },

      filterFAQsByCategory: (categoryId: string, searchQuery?: string) => {
        const { faqs } = get();
        let filtered = faqs.filter(faq => faq.category_id === categoryId);

        if (searchQuery?.trim()) {
          const lowerQuery = searchQuery.toLowerCase();
          filtered = filtered.filter(faq =>
            faq.question.toLowerCase().includes(lowerQuery) ||
            faq.answer.toLowerCase().includes(lowerQuery)
          );
        }

        return filtered;
      },

      filterFAQsByStatus: (isActive: boolean) => {
        const { faqs } = get();
        return faqs.filter(faq => faq.is_active === isActive);
      },

      // Stats calculation
      getFAQStats: () => {
        const { faqs, faqCategories } = get();

        const stats = {
          total: faqs.length,
          active: faqs.filter(faq => faq.is_active).length,
          inactive: faqs.filter(faq => !faq.is_active).length,
          byCategory: {} as Record<string, number>,
          recentlyUpdated: 0,
          totalCategories: faqCategories.length,
          activeCategories: faqCategories.filter(cat => cat.is_active).length,
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

        return stats;
      },

      // Terms CRUD
      fetchTerms: async () => {
        // Mock implementation
        await new Promise(resolve => setTimeout(resolve, 1000));
      },

      addTerms: async (terms) => {
        const newTerms: TermsAndConditions = {
          id: Date.now().toString(),
          ...terms,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          terms: [...state.terms, newTerms],
        }));
      },

      updateTerms: async (id, updates) => {
        set((state) => ({
          terms: state.terms.map((term) =>
            term.id === id
              ? { ...term, ...updates, updated_at: new Date().toISOString() }
              : term
          ),
        }));
      },

      deleteTerms: async (id) => {
        set((state) => ({
          terms: state.terms.filter((term) => term.id !== id),
        }));
      },

      getTerms: (id) => {
        return get().terms.find((term) => term.id === id);
      },

      // Translations CRUD
      fetchTranslations: async () => {
        set((state) => ({ loading: { ...state.loading, translations: true } }));
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          set((state) => ({ loading: { ...state.loading, translations: false } }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to fetch translations:', error);
          set((state) => ({ loading: { ...state.loading, translations: false } }));
        }
      },

      addTranslation: async (translation) => {
        const newTranslation: Translation = {
          id: Date.now().toString(),
          ...translation,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          translations: [...state.translations, newTranslation],
        }));
        get().calculateStats();
      },

      updateTranslation: async (id, updates) => {
        set((state) => ({
          translations: state.translations.map((translation) =>
            translation.id === id
              ? { ...translation, ...updates, updated_at: new Date().toISOString() }
              : translation
          ),
        }));
        get().calculateStats();
      },

      deleteTranslation: async (id) => {
        set((state) => ({
          translations: state.translations.filter((translation) => translation.id !== id),
        }));
        get().calculateStats();
      },

      getTranslation: (id) => {
        return get().translations.find((translation) => translation.id === id);
      },

      // Promotions CRUD
      fetchPromotions: async () => {
        set((state) => ({ loading: { ...state.loading, promotions: true } }));
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          set((state) => ({ loading: { ...state.loading, promotions: false } }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to fetch promotions:', error);
          set((state) => ({ loading: { ...state.loading, promotions: false } }));
        }
      },

      addPromotion: async (promotion) => {
        const newPromotion: Promotion = {
          id: Date.now().toString(),
          ...promotion,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          promotions: [...state.promotions, newPromotion],
        }));
        get().calculateStats();
      },

      updatePromotion: async (id, updates) => {
        set((state) => ({
          promotions: state.promotions.map((promotion) =>
            promotion.id === id
              ? { ...promotion, ...updates, updated_at: new Date().toISOString() }
              : promotion
          ),
        }));
        get().calculateStats();
      },

      deletePromotion: async (id) => {
        set((state) => ({
          promotions: state.promotions.filter((promotion) => promotion.id !== id),
        }));
        get().calculateStats();
      },

      getPromotion: (id) => {
        return get().promotions.find((promotion) => promotion.id === id);
      },

      // Announcements CRUD
      fetchAnnouncements: async () => {
        set((state) => ({ loading: { ...state.loading, announcements: true } }));
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          set((state) => ({ loading: { ...state.loading, announcements: false } }));
          get().calculateStats();
        } catch (error) {
          console.error('Failed to fetch announcements:', error);
          set((state) => ({ loading: { ...state.loading, announcements: false } }));
        }
      },

      addAnnouncement: async (announcement) => {
        const newAnnouncement: Announcement = {
          id: Date.now().toString(),
          ...announcement,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        set((state) => ({
          announcements: [...state.announcements, newAnnouncement],
        }));
        get().calculateStats();
      },

      updateAnnouncement: async (id, updates) => {
        set((state) => ({
          announcements: state.announcements.map((announcement) =>
            announcement.id === id
              ? { ...announcement, ...updates, updated_at: new Date().toISOString() }
              : announcement
          ),
        }));
        get().calculateStats();
      },

      deleteAnnouncement: async (id) => {
        set((state) => ({
          announcements: state.announcements.filter((announcement) => announcement.id !== id),
        }));
        get().calculateStats();
      },

      getAnnouncement: (id) => {
        return get().announcements.find((announcement) => announcement.id === id);
      },

      // Bulk operations
      bulkUpdateIslands: async (updates) => {
        set((state) => ({
          islands: state.islands.map((island) => {
            const update = updates.find((u) => u.id === island.id);
            return update
              ? { ...island, ...update.updates, updated_at: new Date().toISOString() }
              : island;
          }),
        }));
        get().calculateStats();
      },

      bulkDeleteIslands: async (ids) => {
        set((state) => ({
          islands: state.islands.filter((island) => !ids.includes(island.id)),
        }));
        get().calculateStats();
      },

      bulkUpdateFAQs: async (updates) => {
        set((state) => ({
          faqs: state.faqs.map((faq) => {
            const update = updates.find((u) => u.id === faq.id);
            return update
              ? { ...faq, ...update.updates, updated_at: new Date().toISOString() }
              : faq;
          }),
        }));
        get().calculateStats();
      },

      bulkDeleteFAQs: async (ids) => {
        set((state) => ({
          faqs: state.faqs.filter((faq) => !ids.includes(faq.id)),
        }));
        get().calculateStats();
      },

      // Utility functions
      refreshData: async () => {
        await Promise.all([
          get().fetchIslands(),
          get().fetchZones(),
          get().fetchFAQs(),
          get().fetchFAQCategories(),
          get().fetchTerms(),
          get().fetchTranslations(),
          get().fetchPromotions(),
          get().fetchAnnouncements(),
        ]);
      },

      calculateStats: () => {
        const state = get();
        set({
          stats: {
            totalIslands: state.islands.length,
            activeIslands: state.islands.filter((i) => i.is_active).length,
            totalZones: state.zones.length,
            activeZones: state.zones.filter((z) => z.is_active).length,
            totalFAQs: state.faqs.length,
            activeFAQs: state.faqs.filter((f) => f.is_active).length,
            totalTranslations: state.translations.length,
            completedTranslations: state.translations.filter((t) => t.is_active).length,
            totalPromotions: state.promotions.length,
            activePromotions: state.promotions.filter((p) => p.is_active).length,
            totalAnnouncements: state.announcements.length,
            activeAnnouncements: state.announcements.filter((a) => a.is_active).length,
          },
        });
      },

      clearSearchQueries: () => {
        set({
          searchQueries: {
            islands: '',
            zones: '',
            faq: '',
            translations: '',
          },
        });
      },

      clearFilters: () => {
        set({
          filters: {
            islands: {},
            zones: {},
            faq: {},
            translations: {},
          },
        });
      },
    }),
    {
      name: 'content-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        islands: state.islands,
        zones: state.zones,
        faqs: state.faqs,
        faqCategories: state.faqCategories,
        terms: state.terms,
        translations: state.translations,
        promotions: state.promotions,
        announcements: state.announcements,
      }),
    }
  )
);

// Initialize stats on store creation
setTimeout(() => {
  useContentStore.getState().calculateStats();
}, 0); 