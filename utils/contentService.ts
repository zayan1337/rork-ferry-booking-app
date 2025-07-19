import { supabase } from './supabase';
import { TermsAndConditions, Translation, AdminSetting } from '@/hooks/useContentManagement';

// ============================================================================
// TERMS AND CONDITIONS SERVICE
// ============================================================================

export const fetchTermsAndConditions = async (): Promise<TermsAndConditions[]> => {
    try {
        const { data, error } = await supabase
            .from('terms_and_conditions')
            .select('*')
            .order('effective_date', { ascending: false });

        if (error) {
            console.error('Error fetching terms and conditions:', error);
            throw new Error('Failed to fetch terms and conditions');
        }

        return data?.map(term => ({
            id: term.id,
            title: term.title,
            content: term.content,
            version: term.version,
            effective_date: term.effective_date,
            is_active: true, // Add default since not in DB schema
            created_at: term.created_at,
            updated_at: term.created_at, // Add default since not in DB schema
        })) || [];
    } catch (error) {
        console.error('Error in fetchTermsAndConditions:', error);
        throw error;
    }
};

export const fetchTermsById = async (id: string): Promise<TermsAndConditions | null> => {
    try {
        const { data, error } = await supabase
            .from('terms_and_conditions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching terms by ID:', error);
            return null;
        }

        return data ? {
            id: data.id,
            title: data.title,
            content: data.content,
            version: data.version,
            effective_date: data.effective_date,
            is_active: true,
            created_at: data.created_at,
            updated_at: data.created_at,
        } : null;
    } catch (error) {
        console.error('Error in fetchTermsById:', error);
        return null;
    }
};

export const createTermsAndConditions = async (
    termsData: Omit<TermsAndConditions, 'id' | 'created_at' | 'updated_at'>
): Promise<TermsAndConditions> => {
    try {
        const { data, error } = await supabase
            .from('terms_and_conditions')
            .insert({
                title: termsData.title,
                content: termsData.content,
                version: termsData.version,
                effective_date: termsData.effective_date,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating terms and conditions:', error);
            throw new Error('Failed to create terms and conditions');
        }

        return {
            id: data.id,
            title: data.title,
            content: data.content,
            version: data.version,
            effective_date: data.effective_date,
            is_active: termsData.is_active ?? true,
            created_at: data.created_at,
            updated_at: data.created_at,
        };
    } catch (error) {
        console.error('Error in createTermsAndConditions:', error);
        throw error;
    }
};

export const updateTermsAndConditions = async (
    id: string,
    updates: Partial<TermsAndConditions>
): Promise<TermsAndConditions> => {
    try {
        const updateData: any = {};

        if (updates.title) updateData.title = updates.title;
        if (updates.content) updateData.content = updates.content;
        if (updates.version) updateData.version = updates.version;
        if (updates.effective_date) updateData.effective_date = updates.effective_date;

        const { data, error } = await supabase
            .from('terms_and_conditions')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating terms and conditions:', error);
            throw new Error('Failed to update terms and conditions');
        }

        return {
            id: data.id,
            title: data.title,
            content: data.content,
            version: data.version,
            effective_date: data.effective_date,
            is_active: updates.is_active ?? true,
            created_at: data.created_at,
            updated_at: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error in updateTermsAndConditions:', error);
        throw error;
    }
};

export const deleteTermsAndConditions = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('terms_and_conditions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting terms and conditions:', error);
            throw new Error('Failed to delete terms and conditions');
        }
    } catch (error) {
        console.error('Error in deleteTermsAndConditions:', error);
        throw error;
    }
};

// ============================================================================
// TRANSLATIONS SERVICE
// ============================================================================

export const fetchTranslations = async (): Promise<Translation[]> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .select('*')
            .order('language_code', { ascending: true })
            .order('key', { ascending: true });

        if (error) {
            console.error('Error fetching translations:', error);
            throw new Error('Failed to fetch translations');
        }

        return data?.map(translation => ({
            id: translation.id,
            key: translation.key,
            language_code: translation.language_code,
            translation: translation.translation,
            context: translation.context,
            is_active: true, // Add default value
            created_at: translation.created_at,
            updated_at: translation.created_at, // Add default value
        })) || [];
    } catch (error) {
        console.error('Error in fetchTranslations:', error);
        throw error;
    }
};

export const fetchTranslationById = async (id: string): Promise<Translation | null> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching translation by ID:', error);
            return null;
        }

        return data ? {
            id: data.id,
            key: data.key,
            language_code: data.language_code,
            translation: data.translation,
            context: data.context,
            is_active: true,
            created_at: data.created_at,
            updated_at: data.created_at,
        } : null;
    } catch (error) {
        console.error('Error in fetchTranslationById:', error);
        return null;
    }
};

export const createTranslation = async (
    translationData: Omit<Translation, 'id' | 'created_at' | 'updated_at'>
): Promise<Translation> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .insert({
                key: translationData.key,
                language_code: translationData.language_code,
                translation: translationData.translation,
                context: translationData.context,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating translation:', error);
            throw new Error('Failed to create translation');
        }

        return {
            id: data.id,
            key: data.key,
            language_code: data.language_code,
            translation: data.translation,
            context: data.context,
            is_active: translationData.is_active ?? true,
            created_at: data.created_at,
            updated_at: data.created_at,
        };
    } catch (error) {
        console.error('Error in createTranslation:', error);
        throw error;
    }
};

export const updateTranslation = async (
    id: string,
    updates: Partial<Translation>
): Promise<Translation> => {
    try {
        const updateData: any = {};

        if (updates.key) updateData.key = updates.key;
        if (updates.language_code) updateData.language_code = updates.language_code;
        if (updates.translation) updateData.translation = updates.translation;
        if (updates.context !== undefined) updateData.context = updates.context;

        const { data, error } = await supabase
            .from('translations')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating translation:', error);
            throw new Error('Failed to update translation');
        }

        return {
            id: data.id,
            key: data.key,
            language_code: data.language_code,
            translation: data.translation,
            context: data.context,
            is_active: updates.is_active ?? true,
            created_at: data.created_at,
            updated_at: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Error in updateTranslation:', error);
        throw error;
    }
};

export const deleteTranslation = async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('translations')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting translation:', error);
            throw new Error('Failed to delete translation');
        }
    } catch (error) {
        console.error('Error in deleteTranslation:', error);
        throw error;
    }
};

export const fetchTranslationsByLanguage = async (languageCode: string): Promise<Translation[]> => {
    try {
        const { data, error } = await supabase
            .from('translations')
            .select('*')
            .eq('language_code', languageCode)
            .order('key', { ascending: true });

        if (error) {
            console.error('Error fetching translations by language:', error);
            throw new Error('Failed to fetch translations by language');
        }

        return data?.map(translation => ({
            id: translation.id,
            key: translation.key,
            language_code: translation.language_code,
            translation: translation.translation,
            context: translation.context,
            is_active: true,
            created_at: translation.created_at,
            updated_at: translation.created_at,
        })) || [];
    } catch (error) {
        console.error('Error in fetchTranslationsByLanguage:', error);
        throw error;
    }
};

// ============================================================================
// ADMIN SETTINGS SERVICE
// ============================================================================

export const fetchAdminSettings = async (): Promise<AdminSetting[]> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .order('category', { ascending: true })
            .order('setting_key', { ascending: true });

        if (error) {
            console.error('Error fetching admin settings:', error);
            throw new Error('Failed to fetch admin settings');
        }

        return data?.map(setting => ({
            id: setting.id,
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_type: setting.setting_type,
            category: setting.category,
            description: setting.description,
            is_sensitive: setting.is_sensitive,
            is_system: setting.is_system,
            updated_by: setting.updated_by,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        })) || [];
    } catch (error) {
        console.error('Error in fetchAdminSettings:', error);
        throw error;
    }
};

export const fetchAdminSettingById = async (id: string): Promise<AdminSetting | null> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching admin setting by ID:', error);
            return null;
        }

        return data ? {
            id: data.id,
            setting_key: data.setting_key,
            setting_value: data.setting_value,
            setting_type: data.setting_type,
            category: data.category,
            description: data.description,
            is_sensitive: data.is_sensitive,
            is_system: data.is_system,
            updated_by: data.updated_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
        } : null;
    } catch (error) {
        console.error('Error in fetchAdminSettingById:', error);
        return null;
    }
};

export const fetchAdminSettingByKey = async (settingKey: string): Promise<AdminSetting | null> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .eq('setting_key', settingKey)
            .single();

        if (error) {
            console.error('Error fetching admin setting by key:', error);
            return null;
        }

        return data ? {
            id: data.id,
            setting_key: data.setting_key,
            setting_value: data.setting_value,
            setting_type: data.setting_type,
            category: data.category,
            description: data.description,
            is_sensitive: data.is_sensitive,
            is_system: data.is_system,
            updated_by: data.updated_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
        } : null;
    } catch (error) {
        console.error('Error in fetchAdminSettingByKey:', error);
        return null;
    }
};

export const createAdminSetting = async (
    settingData: Omit<AdminSetting, 'id' | 'created_at' | 'updated_at'>
): Promise<AdminSetting> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .insert({
                setting_key: settingData.setting_key,
                setting_value: settingData.setting_value,
                setting_type: settingData.setting_type,
                category: settingData.category,
                description: settingData.description,
                is_sensitive: settingData.is_sensitive,
                is_system: settingData.is_system,
                updated_by: settingData.updated_by,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating admin setting:', error);
            throw new Error('Failed to create admin setting');
        }

        return {
            id: data.id,
            setting_key: data.setting_key,
            setting_value: data.setting_value,
            setting_type: data.setting_type,
            category: data.category,
            description: data.description,
            is_sensitive: data.is_sensitive,
            is_system: data.is_system,
            updated_by: data.updated_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
    } catch (error) {
        console.error('Error in createAdminSetting:', error);
        throw error;
    }
};

export const updateAdminSetting = async (
    id: string,
    updates: Partial<AdminSetting>,
    updatedBy?: string
): Promise<AdminSetting> => {
    try {
        const updateData: any = {};

        if (updates.setting_key) updateData.setting_key = updates.setting_key;
        if (updates.setting_value !== undefined) updateData.setting_value = updates.setting_value;
        if (updates.setting_type) updateData.setting_type = updates.setting_type;
        if (updates.category) updateData.category = updates.category;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.is_sensitive !== undefined) updateData.is_sensitive = updates.is_sensitive;
        if (updates.is_system !== undefined) updateData.is_system = updates.is_system;
        if (updatedBy) updateData.updated_by = updatedBy;

        updateData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('admin_settings')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating admin setting:', error);
            throw new Error('Failed to update admin setting');
        }

        return {
            id: data.id,
            setting_key: data.setting_key,
            setting_value: data.setting_value,
            setting_type: data.setting_type,
            category: data.category,
            description: data.description,
            is_sensitive: data.is_sensitive,
            is_system: data.is_system,
            updated_by: data.updated_by,
            created_at: data.created_at,
            updated_at: data.updated_at,
        };
    } catch (error) {
        console.error('Error in updateAdminSetting:', error);
        throw error;
    }
};

export const deleteAdminSetting = async (id: string): Promise<void> => {
    try {
        // First check if it's a system setting
        const setting = await fetchAdminSettingById(id);
        if (setting?.is_system) {
            throw new Error('Cannot delete system settings');
        }

        const { error } = await supabase
            .from('admin_settings')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting admin setting:', error);
            throw new Error('Failed to delete admin setting');
        }
    } catch (error) {
        console.error('Error in deleteAdminSetting:', error);
        throw error;
    }
};

export const fetchAdminSettingsByCategory = async (category: string): Promise<AdminSetting[]> => {
    try {
        const { data, error } = await supabase
            .from('admin_settings')
            .select('*')
            .eq('category', category)
            .order('setting_key', { ascending: true });

        if (error) {
            console.error('Error fetching admin settings by category:', error);
            throw new Error('Failed to fetch admin settings by category');
        }

        return data?.map(setting => ({
            id: setting.id,
            setting_key: setting.setting_key,
            setting_value: setting.setting_value,
            setting_type: setting.setting_type,
            category: setting.category,
            description: setting.description,
            is_sensitive: setting.is_sensitive,
            is_system: setting.is_system,
            updated_by: setting.updated_by,
            created_at: setting.created_at,
            updated_at: setting.updated_at,
        })) || [];
    } catch (error) {
        console.error('Error in fetchAdminSettingsByCategory:', error);
        throw error;
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const exportContentData = async (type: 'terms' | 'translations' | 'settings') => {
    try {
        let data: any[];
        let filename: string;

        switch (type) {
            case 'terms':
                data = await fetchTermsAndConditions();
                filename = `terms_and_conditions_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case 'translations':
                data = await fetchTranslations();
                filename = `translations_${new Date().toISOString().split('T')[0]}.json`;
                break;
            case 'settings':
                data = await fetchAdminSettings();
                filename = `admin_settings_${new Date().toISOString().split('T')[0]}.json`;
                break;
            default:
                throw new Error('Invalid content type for export');
        }

        // In a real implementation, you would use a file download library
        // For now, we'll just log the data
        console.log(`Export ${type} data:`, data);
        console.log(`Filename: ${filename}`);

        return { data, filename };
    } catch (error) {
        console.error(`Error exporting ${type} data:`, error);
        throw error;
    }
};

export const validateContentData = (type: 'terms' | 'translations' | 'settings', data: any): boolean => {
    try {
        switch (type) {
            case 'terms':
                return !!(data.title && data.content && data.version && data.effective_date);
            case 'translations':
                return !!(data.key && data.language_code && data.translation);
            case 'settings':
                return !!(data.setting_key && data.setting_value !== undefined && data.setting_type && data.category);
            default:
                return false;
        }
    } catch (error) {
        console.error(`Error validating ${type} data:`, error);
        return false;
    }
};

export default {
    // Terms and Conditions
    fetchTermsAndConditions,
    fetchTermsById,
    createTermsAndConditions,
    updateTermsAndConditions,
    deleteTermsAndConditions,

    // Translations
    fetchTranslations,
    fetchTranslationById,
    createTranslation,
    updateTranslation,
    deleteTranslation,
    fetchTranslationsByLanguage,

    // Admin Settings
    fetchAdminSettings,
    fetchAdminSettingById,
    fetchAdminSettingByKey,
    createAdminSetting,
    updateAdminSetting,
    deleteAdminSetting,
    fetchAdminSettingsByCategory,

    // Utilities
    exportContentData,
    validateContentData,
}; 