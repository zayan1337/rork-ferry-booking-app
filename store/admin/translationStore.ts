import { create } from 'zustand';
import { supabase } from '@/utils/supabase';
import {
    Translation,
    TranslationFormData,
} from '@/types/content';

interface TranslationLoadingStates {
    translations: boolean;
    singleTranslation: boolean;
}

interface TranslationStoreState {
    // Data
    translations: Translation[];
    currentTranslation: Translation | null;

    // Loading states
    loading: TranslationLoadingStates;

    // Error state
    error: string | null;

    // Search and filters
    searchQuery: string;
    languageFilter: string | null;
    statusFilter: boolean | null;
}

interface TranslationStoreActions {
    // Translation CRUD Operations
    fetchTranslations: () => Promise<void>;
    fetchTranslationById: (id: string) => Promise<Translation | null>;
    createTranslation: (data: TranslationFormData) => Promise<Translation>;
    updateTranslation: (id: string, data: Partial<TranslationFormData>) => Promise<Translation>;
    deleteTranslation: (id: string) => Promise<void>;
    duplicateTranslation: (id: string) => Promise<Translation>;

    // Search and Filter Actions
    setSearchQuery: (query: string) => void;
    setLanguageFilter: (language: string | null) => void;
    setStatusFilter: (status: boolean | null) => void;
    clearFilters: () => void;

    // Utility Actions
    clearError: () => void;
    resetCurrentTranslation: () => void;
    getTranslationById: (id: string) => Translation | null;
}

type TranslationStore = TranslationStoreState & TranslationStoreActions;

const initialState: TranslationStoreState = {
    translations: [],
    currentTranslation: null,
    loading: {
        translations: false,
        singleTranslation: false,
    },
    error: null,
    searchQuery: '',
    languageFilter: null,
    statusFilter: null,
};

export const useTranslationStore = create<TranslationStore>((set, get) => ({
    ...initialState,

    // ========================================================================
    // TRANSLATION OPERATIONS
    // ========================================================================

    fetchTranslations: async () => {
        set((state) => ({
            loading: { ...state.loading, translations: true },
            error: null
        }));

        try {
            const { data: translations, error } = await supabase
                .from('translations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const processedTranslations: Translation[] = (translations || []).map(translation => ({
                id: translation.id,
                key: translation.key,
                language_code: translation.language_code,
                translation: translation.translation,
                context: translation.context,
                is_active: translation.is_active ?? true,
                created_at: translation.created_at,
                updated_at: translation.updated_at || translation.created_at,
            }));

            set((state) => ({
                translations: processedTranslations,
                loading: { ...state.loading, translations: false }
            }));
        } catch (error) {
            console.error('Error fetching translations:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to fetch translations',
                loading: { ...state.loading, translations: false }
            }));
        }
    },

    fetchTranslationById: async (id: string) => {
        set((state) => ({
            loading: { ...state.loading, singleTranslation: true },
            error: null
        }));

        try {
            const { data: translation, error } = await supabase
                .from('translations')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (translation) {
                const processedTranslation: Translation = {
                    id: translation.id,
                    key: translation.key,
                    language_code: translation.language_code,
                    translation: translation.translation,
                    context: translation.context,
                    is_active: translation.is_active ?? true,
                    created_at: translation.created_at,
                    updated_at: translation.updated_at || translation.created_at,
                };

                set((state) => ({
                    currentTranslation: processedTranslation,
                    loading: { ...state.loading, singleTranslation: false }
                }));

                return processedTranslation;
            }

            set((state) => ({
                loading: { ...state.loading, singleTranslation: false }
            }));
            return null;
        } catch (error) {
            console.error('Error fetching translation:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to fetch translation',
                loading: { ...state.loading, singleTranslation: false }
            }));
            return null;
        }
    },

    createTranslation: async (data: TranslationFormData) => {
        set((state) => ({
            loading: { ...state.loading, translations: true },
            error: null
        }));

        try {
            const { data: newTranslation, error } = await supabase
                .from('translations')
                .insert([{
                    key: data.key.trim(),
                    language_code: data.language_code,
                    translation: data.translation.trim(),
                    context: data.context?.trim() || null,
                    is_active: data.is_active,
                }])
                .select()
                .single();

            if (error) throw error;

            const processedTranslation: Translation = {
                id: newTranslation.id,
                key: newTranslation.key,
                language_code: newTranslation.language_code,
                translation: newTranslation.translation,
                context: newTranslation.context,
                is_active: newTranslation.is_active,
                created_at: newTranslation.created_at,
                updated_at: newTranslation.updated_at || newTranslation.created_at,
            };

            set((state) => ({
                translations: [processedTranslation, ...state.translations],
                loading: { ...state.loading, translations: false }
            }));

            return processedTranslation;
        } catch (error) {
            console.error('Error creating translation:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to create translation',
                loading: { ...state.loading, translations: false }
            }));
            throw error;
        }
    },

    updateTranslation: async (id: string, data: Partial<TranslationFormData>) => {
        set((state) => ({
            loading: { ...state.loading, translations: true },
            error: null
        }));

        try {
            const updateData: any = {};
            if (data.key !== undefined) updateData.key = data.key.trim();
            if (data.language_code !== undefined) updateData.language_code = data.language_code;
            if (data.translation !== undefined) updateData.translation = data.translation.trim();
            if (data.context !== undefined) updateData.context = data.context?.trim() || null;
            if (data.is_active !== undefined) updateData.is_active = data.is_active;

            const { data: updatedTranslation, error } = await supabase
                .from('translations')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const processedTranslation: Translation = {
                id: updatedTranslation.id,
                key: updatedTranslation.key,
                language_code: updatedTranslation.language_code,
                translation: updatedTranslation.translation,
                context: updatedTranslation.context,
                is_active: updatedTranslation.is_active,
                created_at: updatedTranslation.created_at,
                updated_at: updatedTranslation.updated_at || updatedTranslation.created_at,
            };

            set((state) => ({
                translations: state.translations.map(translation =>
                    translation.id === id ? processedTranslation : translation
                ),
                currentTranslation: state.currentTranslation?.id === id ? processedTranslation : state.currentTranslation,
                loading: { ...state.loading, translations: false }
            }));

            return processedTranslation;
        } catch (error) {
            console.error('Error updating translation:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to update translation',
                loading: { ...state.loading, translations: false }
            }));
            throw error;
        }
    },

    deleteTranslation: async (id: string) => {
        set((state) => ({
            loading: { ...state.loading, translations: true },
            error: null
        }));

        try {
            const { error } = await supabase
                .from('translations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set((state) => ({
                translations: state.translations.filter(translation => translation.id !== id),
                currentTranslation: state.currentTranslation?.id === id ? null : state.currentTranslation,
                loading: { ...state.loading, translations: false }
            }));
        } catch (error) {
            console.error('Error deleting translation:', error);
            set((state) => ({
                error: error instanceof Error ? error.message : 'Failed to delete translation',
                loading: { ...state.loading, translations: false }
            }));
            throw error;
        }
    },

    duplicateTranslation: async (id: string) => {
        const translation = get().translations.find(t => t.id === id);
        if (!translation) {
            throw new Error('Translation not found');
        }

        const duplicateData: TranslationFormData = {
            key: `${translation.key}_copy`,
            language_code: translation.language_code,
            translation: translation.translation,
            context: translation.context || undefined,
            is_active: translation.is_active,
        };

        return get().createTranslation(duplicateData);
    },

    // ========================================================================
    // UTILITY ACTIONS
    // ========================================================================

    setSearchQuery: (query: string) => {
        set({ searchQuery: query });
    },

    setLanguageFilter: (language: string | null) => {
        set({ languageFilter: language });
    },

    setStatusFilter: (status: boolean | null) => {
        set({ statusFilter: status });
    },

    clearFilters: () => {
        set({
            searchQuery: '',
            languageFilter: null,
            statusFilter: null,
        });
    },

    clearError: () => {
        set({ error: null });
    },

    resetCurrentTranslation: () => {
        set({ currentTranslation: null });
    },

    getTranslationById: (id: string) => {
        return get().translations.find(translation => translation.id === id) || null;
    },
})); 