import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Agent } from '@/types/agent';
import { supabase } from '@/utils/supabase';
import {
  fetchAgentProfileWithStats,
  createFallbackAgent,
} from '@/utils/agentUtils';

/**
 * Standardized error handling for auth operations
 */
const handleError = (error: unknown, defaultMessage: string, set: any) => {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  console.error(defaultMessage, error);
  set({
    error: errorMessage,
    isLoading: false,
  });
  return errorMessage;
};

/**
 * Agent authentication state and actions
 */
interface AgentAuthState {
  // State
  agent: Agent | null;
  translations: Record<string, string>;
  currentLanguage: string;
  textDirection: 'ltr' | 'rtl';
  isLoading: boolean;
  error: string | null;

  // Authentication actions
  login: (agentId: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAgent: (agent: Agent) => void;
  initializeFromAuthUser: (authUser: any) => Promise<void>;

  // Language and localization
  setLanguage: (languageCode: string) => Promise<void>;
  getTranslation: (key: string) => string;
  getTextDirection: (languageCode: string) => 'ltr' | 'rtl';

  // Internal helper methods
  getAgentProfile: (
    agentId: string
  ) => Promise<{ agent: Agent; stats: any } | null>;
  refreshAgentProfile: (agentId: string) => Promise<void>;
  getTranslations: (
    languageCode: string,
    context?: string
  ) => Promise<Record<string, string>>;
  getUserLanguage: (userId: string) => Promise<string>;
  testConnection: () => Promise<boolean>;

  // State management
  clearError: () => void;
  reset: () => void;
}

export const useAgentAuthStore = create<AgentAuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      agent: null,
      translations: {},
      currentLanguage: 'en',
      textDirection: 'ltr',
      isLoading: false,
      error: null,

      /**
       * Test database connection
       */
      testConnection: async (): Promise<boolean> => {
        try {
          const { error } = await supabase.from('agents').select('id').limit(1);
          return !error;
        } catch (error) {
          console.error('Database connection test error:', error);
          return false;
        }
      },

      /**
       * Get agent profile with stats from database (shared utility)
       * @param agentId - Agent ID to fetch profile for
       * @returns Agent profile with stats or null if not found
       */
      getAgentProfile: (agentId: string) => fetchAgentProfileWithStats(agentId),

      /**
       * Refresh agent profile from database
       * Updates the agent data in the store with latest data from database
       * @param agentId - Agent ID to refresh profile for
       */
      refreshAgentProfile: async (agentId: string) => {
        try {
          set({ isLoading: true, error: null });

          const profileData = await get().getAgentProfile(agentId);

          if (profileData) {
            set({
              agent: profileData.agent,
              isLoading: false,
            });
          } else {
            set({
              error: 'Agent profile not found',
              isLoading: false,
            });
          }
        } catch (error) {
          handleError(error, 'Failed to refresh agent profile', set);
        }
      },

      /**
       * Get translations for specified language and context
       * @param languageCode - Language code (e.g., 'en', 'es')
       * @param context - Optional context filter for translations
       * @returns Translations record
       */
      getTranslations: async (languageCode: string, context?: string) => {
        try {
          let query = supabase
            .from('translations')
            .select('key, translation')
            .eq('language_code', languageCode);

          if (context) {
            query = query.eq('context', context);
          }

          const { data, error } = await query;
          if (error) throw error;

          const translations: Record<string, string> = {};
          (data || []).forEach((item: any) => {
            translations[item.key] = item.translation;
          });

          return translations;
        } catch (error) {
          console.error('Error fetching translations:', error);
          throw error;
        }
      },

      /**
       * Get user's preferred language
       * @param userId - User ID to get language preference for
       * @returns Language code or 'en' as default
       */
      getUserLanguage: async (userId: string) => {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('preferred_language')
            .eq('id', userId)
            .single();

          if (error) throw error;
          return data?.preferred_language || 'en';
        } catch (error) {
          console.error('Error fetching user language:', error);
          return 'en'; // Default to English
        }
      },

      /**
       * Get text direction for language (RTL or LTR)
       * @param languageCode - Language code to check
       * @returns Text direction ('ltr' or 'rtl')
       */
      getTextDirection: (languageCode: string) => {
        const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'dv'];
        return rtlLanguages.includes(languageCode) ? 'rtl' : 'ltr';
      },

      /**
       * Initialize agent data from authenticated user
       * @param authUser - Authenticated user object from auth store
       */
      initializeFromAuthUser: async (authUser: any) => {
        if (authUser?.profile?.role !== 'agent') {
          return;
        }

        try {
          set({ isLoading: true, error: null });

          // Fetch real agent profile data
          const profileData = await get().getAgentProfile(authUser.id);

          if (profileData) {
            // Get user's preferred language and translations
            const userLanguage = await get().getUserLanguage(authUser.id);
            const translations = await get().getTranslations(
              userLanguage,
              'agent_module'
            );

            set({
              agent: profileData.agent,
              translations,
              currentLanguage: userLanguage,
              textDirection: get().getTextDirection(userLanguage),
              // Don't set loading to false here - main store will handle it
            });
          } else {
            // Fallback to creating agent profile from auth user
            const fallbackAgent = createFallbackAgent(authUser);
            set({
              agent: fallbackAgent,
              // Don't set loading to false here - main store will handle it
            });
          }
        } catch (error) {
          handleError(error, 'Failed to initialize agent data', set);
        }
      },

      /**
       * Agent login
       * @param agentId - Agent ID for login
       * @param password - Password (currently not validated)
       * @returns Success status
       */
      login: async (agentId: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          // Extract user ID from agent ID if needed
          const userIdFromAgentId = agentId.replace('TRA-', '');
          const profileData = await get().getAgentProfile(userIdFromAgentId);

          if (profileData) {
            set({
              agent: profileData.agent,
              isLoading: false,
            });
            return true;
          } else {
            set({
              error: 'Agent not found',
              isLoading: false,
            });
            return false;
          }
        } catch (error) {
          handleError(error, 'Login failed', set);
          return false;
        }
      },

      /**
       * Agent logout - reset to initial state
       */
      logout: () => {
        set({
          agent: null,
          translations: {},
          currentLanguage: 'en',
          textDirection: 'ltr',
          isLoading: false,
          error: null,
        });
      },

      /**
       * Set agent data
       * @param agent - Agent object to set
       */
      setAgent: (agent: Agent) => set({ agent }),

      /**
       * Set language and update translations
       * @param languageCode - Language code to set
       */
      setLanguage: async (languageCode: string) => {
        try {
          set({ isLoading: true, error: null });

          const translations = await get().getTranslations(
            languageCode,
            'agent_module'
          );

          set({
            currentLanguage: languageCode,
            textDirection: get().getTextDirection(languageCode),
            translations,
            isLoading: false,
          });

          // Update user profile with new language preference
          const { agent } = get();
          if (agent) {
            await supabase
              .from('user_profiles')
              .update({ preferred_language: languageCode })
              .eq('id', agent.id);
          }
        } catch (error) {
          handleError(error, 'Failed to set language', set);
        }
      },

      /**
       * Get translation for a specific key
       * @param key - Translation key
       * @returns Translated text or key if not found
       */
      getTranslation: (key: string) => {
        const { translations } = get();
        return translations[key] || key;
      },

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),

      /**
       * Reset store to initial state
       */
      reset: () => {
        set({
          agent: null,
          translations: {},
          currentLanguage: 'en',
          textDirection: 'ltr',
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'agent-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
