import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import type { UserProfile, RegisterData, AuthUser } from '@/types/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  error: string | null;
  preventRedirect: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (userData: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  setPreventRedirect: (prevent: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,
      preventRedirect: false,

      setError: (error: string) => set({ error }),

      clearError: () => set({ error: null }),

      setPreventRedirect: (prevent: boolean) => set({ preventRedirect: prevent }),

      checkAuth: async () => {
        try {
          set({ isLoading: true, error: null });
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            set({
              isAuthenticated: true,
              user: {
                ...session.user,
                profile: userProfile || undefined
              },
              isLoading: false
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Authentication check failed';
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: errorMessage
          });
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) throw error;
          if (!data.user) throw new Error('User data is missing');

          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) throw new Error('Failed to fetch user profile: ' + profileError.message);
          if (!profile) throw new Error('User profile not found');

          set({
            isAuthenticated: true,
            user: {
              ...data.user,
              profile
            },
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Login error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      signUp: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, error: null });

          const { email_address, password, ...profileData } = userData;

          // First create the auth user
          const { data, error } = await supabase.auth.signUp({
            email: email_address,
            password,
            options: {
              data: {
                full_name: profileData.full_name,
                mobile_number: profileData.mobile_number,
                date_of_birth: profileData.date_of_birth
              }
            }
          });

          if (error) throw error;
          if (!data.user?.id) throw new Error('User data is missing');

          // Profile creation is handled by the database trigger
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) throw new Error('Failed to fetch user profile: ' + profileError.message);

          set({
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Signup error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Signup failed';
          set({
            isLoading: false,
            error: errorMessage,
            preventRedirect: false
          });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true, error: null });
          const { error } = await supabase.auth.signOut();
          if (error) throw error;

          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: null,
            preventRedirect: false
          });
        } catch (error) {
          console.error('Signout error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      resetPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'myapp://reset-password',
          });

          if (error) throw error;
          set({ isLoading: false });
        } catch (error) {
          console.error('Reset password error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      updatePassword: async (newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          const { error } = await supabase.auth.updateUser({
            password: newPassword
          });

          if (error) throw error;
          set({ isLoading: false });
        } catch (error) {
          console.error('Update password error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Password update failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      updateProfile: async (profile: Partial<UserProfile>) => {
        try {
          set({ isLoading: true, error: null });
          const user = get().user;
          if (!user?.id) throw new Error('No authenticated user');

          const { error } = await supabase
            .from('user_profiles')
            .update(profile)
            .eq('id', user.id);

          if (error) throw error;

          set(state => ({
            isLoading: false,
            user: state.user ? {
              ...state.user,
              profile: {
                ...state.user.profile as UserProfile,
                ...profile
              }
            } : null
          }));
        } catch (error) {
          console.error('Update profile error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);