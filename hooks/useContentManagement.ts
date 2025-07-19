import { useCallback, useMemo, useState } from 'react';
import { useContentStore } from '@/store/admin/contentStore';
import { Alert } from 'react-native';

// Types
export interface TermsAndConditions {
    id: string;
    title: string;
    content: string;
    version: string;
    effective_date: string;
    is_active?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface Translation {
    id: string;
    key: string;
    language_code: string;
    translation: string;
    context?: string;
    is_active?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface AdminSetting {
    id: string;
    setting_key: string;
    setting_value: any;
    setting_type: 'string' | 'number' | 'boolean' | 'json';
    category: string;
    description?: string;
    is_sensitive?: boolean;
    is_system?: boolean;
    updated_by?: string;
    created_at: string;
    updated_at: string;
}

export interface ContentManagementStats {
    terms: {
        total: number;
        active: number;
        versions: number;
    };
    translations: {
        total: number;
        languages: number;
        completion_rate: number;
    };
    settings: {
        total: number;
        by_category: Record<string, number>;
        system_settings: number;
    };
}

export interface ContentFilters {
    terms: {
        is_active?: boolean;
        version?: string;
    };
    translations: {
        language_code?: string;
        is_active?: boolean;
    };
    settings: {
        category?: string;
        setting_type?: string;
        is_system?: boolean;
    };
}

export type ContentType = 'terms' | 'translations' | 'settings';

// ============================================================================
// CONTENT MANAGEMENT HOOK INTERFACE
// ============================================================================

export interface UseContentManagementReturn {
    // Data
    terms: TermsAndConditions[];
    translations: Translation[];
    adminSettings: AdminSetting[];

    // Loading states
    loading: {
        terms: boolean;
        translations: boolean;
        settings: boolean;
    };

    // Error states
    error: string | null;

    // Stats
    stats: ContentManagementStats;

    // Search and filters
    searchQuery: string;
    filters: ContentFilters;
    activeContentType: ContentType;

    // Computed data
    filteredTerms: TermsAndConditions[];
    filteredTranslations: Translation[];
    filteredSettings: AdminSetting[];

    // Actions
    setSearchQuery: (query: string) => void;
    setFilters: (type: ContentType, filters: any) => void;
    setActiveContentType: (type: ContentType) => void;
    clearFilters: () => void;

    // Terms CRUD
    loadTerms: () => Promise<void>;
    createTerms: (data: Omit<TermsAndConditions, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateTerms: (id: string, data: Partial<TermsAndConditions>) => Promise<void>;
    deleteTerms: (id: string) => Promise<void>;
    getTermsById: (id: string) => TermsAndConditions | undefined;

    // Translations CRUD
    loadTranslations: () => Promise<void>;
    createTranslation: (data: Omit<Translation, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateTranslation: (id: string, data: Partial<Translation>) => Promise<void>;
    deleteTranslation: (id: string) => Promise<void>;
    getTranslationById: (id: string) => Translation | undefined;

    // Settings CRUD
    loadSettings: () => Promise<void>;
    createSetting: (data: Omit<AdminSetting, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateSetting: (id: string, data: Partial<AdminSetting>) => Promise<void>;
    deleteSetting: (id: string) => Promise<void>;
    getSettingById: (id: string) => AdminSetting | undefined;

    // Utility functions
    refreshAll: () => Promise<void>;
    exportData: (type: ContentType) => Promise<void>;
    importData: (type: ContentType, data: any[]) => Promise<void>;
}

// ============================================================================
// CONTENT MANAGEMENT HOOK IMPLEMENTATION
// ============================================================================

export const useContentManagement = (): UseContentManagementReturn => {
    // ========================================================================
    // STATE
    // ========================================================================

    const [searchQuery, setSearchQuery] = useState('');
    const [activeContentType, setActiveContentType] = useState<ContentType>('terms');
    const [filters, setFiltersState] = useState<ContentFilters>({
        terms: {},
        translations: {},
        settings: {},
    });
    const [error, setError] = useState<string | null>(null);

    // ========================================================================
    // STORE ACCESS
    // ========================================================================

    const contentStore = useContentStore();
    const {
        terms,
        translations,
        loading,
        fetchTerms,
        addTerms,
        updateTerms: updateTermsStore,
        deleteTerms: deleteTermsStore,
        getTerms,
        fetchTranslations,
        addTranslation,
        updateTranslation: updateTranslationStore,
        deleteTranslation: deleteTranslationStore,
        getTranslation,
    } = contentStore;

    // Mock admin settings since they're not in the current store
    const [adminSettings, setAdminSettings] = useState<AdminSetting[]>([
        {
            id: '1',
            setting_key: 'maintenance_mode',
            setting_value: false,
            setting_type: 'boolean',
            category: 'system',
            description: 'Enable maintenance mode',
            is_sensitive: false,
            is_system: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: '2',
            setting_key: 'max_booking_days',
            setting_value: 30,
            setting_type: 'number',
            category: 'booking',
            description: 'Maximum days in advance for booking',
            is_sensitive: false,
            is_system: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
        {
            id: '3',
            setting_key: 'payment_gateway_key',
            setting_value: 'sk_test_...',
            setting_type: 'string',
            category: 'payment',
            description: 'Payment gateway API key',
            is_sensitive: true,
            is_system: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
        },
    ]);

    // ========================================================================
    // COMPUTED DATA
    // ========================================================================

    const filteredTerms = useMemo(() => {
        let result = terms;

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(term =>
                term.title.toLowerCase().includes(query) ||
                term.content.toLowerCase().includes(query) ||
                term.version.toLowerCase().includes(query)
            );
        }

        // Apply filters
        const termFilters = filters.terms;
        if (termFilters.is_active !== undefined) {
            result = result.filter(term => term.is_active === termFilters.is_active);
        }
        if (termFilters.version) {
            result = result.filter(term => term.version === termFilters.version);
        }

        return result;
    }, [terms, searchQuery, filters.terms]);

    const filteredTranslations = useMemo(() => {
        let result = translations;

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(translation =>
                translation.key.toLowerCase().includes(query) ||
                translation.translation.toLowerCase().includes(query) ||
                translation.language_code.toLowerCase().includes(query)
            );
        }

        // Apply filters
        const translationFilters = filters.translations;
        if (translationFilters.language_code) {
            result = result.filter(translation =>
                translation.language_code === translationFilters.language_code
            );
        }
        if (translationFilters.is_active !== undefined) {
            result = result.filter(translation =>
                translation.is_active === translationFilters.is_active
            );
        }

        return result;
    }, [translations, searchQuery, filters.translations]);

    const filteredSettings = useMemo(() => {
        let result = adminSettings;

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(setting =>
                setting.setting_key.toLowerCase().includes(query) ||
                setting.category.toLowerCase().includes(query) ||
                (setting.description && setting.description.toLowerCase().includes(query))
            );
        }

        // Apply filters
        const settingFilters = filters.settings;
        if (settingFilters.category) {
            result = result.filter(setting => setting.category === settingFilters.category);
        }
        if (settingFilters.setting_type) {
            result = result.filter(setting => setting.setting_type === settingFilters.setting_type);
        }
        if (settingFilters.is_system !== undefined) {
            result = result.filter(setting => setting.is_system === settingFilters.is_system);
        }

        return result;
    }, [adminSettings, searchQuery, filters.settings]);

    const stats = useMemo((): ContentManagementStats => {
        const activeTerms = terms.filter(t => t.is_active);
        const versions = [...new Set(terms.map(t => t.version))].length;

        const languages = [...new Set(translations.map(t => t.language_code))].length;
        const activeTranslations = translations.filter(t => t.is_active);
        const completionRate = translations.length > 0 ?
            (activeTranslations.length / translations.length) * 100 : 0;

        const settingsByCategory: Record<string, number> = {};
        adminSettings.forEach(setting => {
            settingsByCategory[setting.category] = (settingsByCategory[setting.category] || 0) + 1;
        });

        const systemSettings = adminSettings.filter(s => s.is_system).length;

        return {
            terms: {
                total: terms.length,
                active: activeTerms.length,
                versions,
            },
            translations: {
                total: translations.length,
                languages,
                completion_rate: Math.round(completionRate),
            },
            settings: {
                total: adminSettings.length,
                by_category: settingsByCategory,
                system_settings: systemSettings,
            },
        };
    }, [terms, translations, adminSettings]);

    // ========================================================================
    // ACTIONS
    // ========================================================================

    const setFilters = useCallback((type: ContentType, newFilters: any) => {
        setFiltersState(prev => ({
            ...prev,
            [type]: { ...prev[type], ...newFilters }
        }));
    }, []);

    const clearFilters = useCallback(() => {
        setFiltersState({
            terms: {},
            translations: {},
            settings: {},
        });
        setSearchQuery('');
    }, []);

    // ========================================================================
    // TERMS CRUD
    // ========================================================================

    const loadTerms = useCallback(async () => {
        try {
            setError(null);
            await fetchTerms();
        } catch (error) {
            setError('Failed to load terms and conditions');
            console.error('Error loading terms:', error);
        }
    }, [fetchTerms]);

    const createTerms = useCallback(async (data: Omit<TermsAndConditions, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            setError(null);
            await addTerms(data);
            Alert.alert('Success', 'Terms and conditions created successfully');
        } catch (error) {
            setError('Failed to create terms and conditions');
            Alert.alert('Error', 'Failed to create terms and conditions');
            console.error('Error creating terms:', error);
        }
    }, [addTerms]);

    const updateTerms = useCallback(async (id: string, data: Partial<TermsAndConditions>) => {
        try {
            setError(null);
            await updateTermsStore(id, data);
            Alert.alert('Success', 'Terms and conditions updated successfully');
        } catch (error) {
            setError('Failed to update terms and conditions');
            Alert.alert('Error', 'Failed to update terms and conditions');
            console.error('Error updating terms:', error);
        }
    }, [updateTermsStore]);

    const deleteTerms = useCallback(async (id: string) => {
        try {
            setError(null);
            await deleteTermsStore(id);
            Alert.alert('Success', 'Terms and conditions deleted successfully');
        } catch (error) {
            setError('Failed to delete terms and conditions');
            Alert.alert('Error', 'Failed to delete terms and conditions');
            console.error('Error deleting terms:', error);
        }
    }, [deleteTermsStore]);

    const getTermsById = useCallback((id: string) => {
        return getTerms(id);
    }, [getTerms]);

    // ========================================================================
    // TRANSLATIONS CRUD
    // ========================================================================

    const loadTranslations = useCallback(async () => {
        try {
            setError(null);
            await fetchTranslations();
        } catch (error) {
            setError('Failed to load translations');
            console.error('Error loading translations:', error);
        }
    }, [fetchTranslations]);

    const createTranslation = useCallback(async (data: Omit<Translation, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            setError(null);
            await addTranslation(data);
            Alert.alert('Success', 'Translation created successfully');
        } catch (error) {
            setError('Failed to create translation');
            Alert.alert('Error', 'Failed to create translation');
            console.error('Error creating translation:', error);
        }
    }, [addTranslation]);

    const updateTranslation = useCallback(async (id: string, data: Partial<Translation>) => {
        try {
            setError(null);
            await updateTranslationStore(id, data);
            Alert.alert('Success', 'Translation updated successfully');
        } catch (error) {
            setError('Failed to update translation');
            Alert.alert('Error', 'Failed to update translation');
            console.error('Error updating translation:', error);
        }
    }, [updateTranslationStore]);

    const deleteTranslation = useCallback(async (id: string) => {
        try {
            setError(null);
            await deleteTranslationStore(id);
            Alert.alert('Success', 'Translation deleted successfully');
        } catch (error) {
            setError('Failed to delete translation');
            Alert.alert('Error', 'Failed to delete translation');
            console.error('Error deleting translation:', error);
        }
    }, [deleteTranslationStore]);

    const getTranslationById = useCallback((id: string) => {
        return getTranslation(id);
    }, [getTranslation]);

    // ========================================================================
    // SETTINGS CRUD (Mock implementation)
    // ========================================================================

    const loadSettings = useCallback(async () => {
        try {
            setError(null);
            // Mock loading delay
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            setError('Failed to load settings');
            console.error('Error loading settings:', error);
        }
    }, []);

    const createSetting = useCallback(async (data: Omit<AdminSetting, 'id' | 'created_at' | 'updated_at'>) => {
        try {
            setError(null);
            const newSetting: AdminSetting = {
                ...data,
                id: Date.now().toString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setAdminSettings(prev => [...prev, newSetting]);
            Alert.alert('Success', 'Setting created successfully');
        } catch (error) {
            setError('Failed to create setting');
            Alert.alert('Error', 'Failed to create setting');
            console.error('Error creating setting:', error);
        }
    }, []);

    const updateSetting = useCallback(async (id: string, data: Partial<AdminSetting>) => {
        try {
            setError(null);
            setAdminSettings(prev => prev.map(setting =>
                setting.id === id
                    ? { ...setting, ...data, updated_at: new Date().toISOString() }
                    : setting
            ));
            Alert.alert('Success', 'Setting updated successfully');
        } catch (error) {
            setError('Failed to update setting');
            Alert.alert('Error', 'Failed to update setting');
            console.error('Error updating setting:', error);
        }
    }, []);

    const deleteSetting = useCallback(async (id: string) => {
        try {
            setError(null);
            setAdminSettings(prev => prev.filter(setting => setting.id !== id));
            Alert.alert('Success', 'Setting deleted successfully');
        } catch (error) {
            setError('Failed to delete setting');
            Alert.alert('Error', 'Failed to delete setting');
            console.error('Error deleting setting:', error);
        }
    }, []);

    const getSettingById = useCallback((id: string) => {
        return adminSettings.find(setting => setting.id === id);
    }, [adminSettings]);

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadTerms(),
            loadTranslations(),
            loadSettings(),
        ]);
    }, [loadTerms, loadTranslations, loadSettings]);

    const exportData = useCallback(async (type: ContentType) => {
        try {
            let data;
            switch (type) {
                case 'terms':
                    data = filteredTerms;
                    break;
                case 'translations':
                    data = filteredTranslations;
                    break;
                case 'settings':
                    data = filteredSettings;
                    break;
            }

            // Mock export functionality
            console.log(`Exporting ${type} data:`, data);
            Alert.alert('Success', `${type} data exported successfully`);
        } catch (error) {
            Alert.alert('Error', `Failed to export ${type} data`);
            console.error(`Error exporting ${type}:`, error);
        }
    }, [filteredTerms, filteredTranslations, filteredSettings]);

    const importData = useCallback(async (type: ContentType, data: any[]) => {
        try {
            // Mock import functionality
            console.log(`Importing ${type} data:`, data);
            Alert.alert('Success', `${type} data imported successfully`);
        } catch (error) {
            Alert.alert('Error', `Failed to import ${type} data`);
            console.error(`Error importing ${type}:`, error);
        }
    }, []);

    // ========================================================================
    // RETURN
    // ========================================================================

    return {
        // Data
        terms,
        translations,
        adminSettings,

        // Loading states
        loading: {
            terms: loading.terms || false,
            translations: loading.translations || false,
            settings: false, // Mock loading state
        },

        // Error state
        error,

        // Stats
        stats,

        // Search and filters
        searchQuery,
        filters,
        activeContentType,

        // Computed data
        filteredTerms,
        filteredTranslations,
        filteredSettings,

        // Actions
        setSearchQuery,
        setFilters,
        setActiveContentType,
        clearFilters,

        // Terms CRUD
        loadTerms,
        createTerms,
        updateTerms,
        deleteTerms,
        getTermsById,

        // Translations CRUD
        loadTranslations,
        createTranslation,
        updateTranslation,
        deleteTranslation,
        getTranslationById,

        // Settings CRUD
        loadSettings,
        createSetting,
        updateSetting,
        deleteSetting,
        getSettingById,

        // Utility functions
        refreshAll,
        exportData,
        importData,
    };
};

export default useContentManagement; 