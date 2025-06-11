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
  login: (username: string, password: string) => Promise<void>;
  signUp: (userData: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null,

      setError: (error: string) => set({ error }),

      clearError: () => set({ error: null }),

      checkAuth: async () => {
        try {
          set({ isLoading: true, error: null });
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { data: userProfile } = await supabase
              .from('users')
              .select('*')
              .eq('email_address', session.user.email)
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

      login: async (username: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const isEmail = /\S+@\S+\.\S+/.test(username);
          
          let loginIdentifier = username;

          // First try to find the user in our database
          if (isEmail) {
            const { data: profile } = await supabase
              .from('users')
              .select('email_address')
              .eq('email_address', username)
              .single();
            if (profile) loginIdentifier = profile.email_address;
          } else {
            const { data: profile } = await supabase
              .from('users')
              .select('email_address')
              .eq('username', username)
              .single();
            if (profile) loginIdentifier = profile.email_address;
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email: loginIdentifier,
            password
          });
          
          if (error) throw error;
          if (!data.user?.email) throw new Error('User data is missing');

          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('email_address', data.user.email)
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
          });
          
          if (error) throw error;
          if (!data.user?.id) throw new Error('User data is missing');

          // Then create the user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email_address,
                ...profileData,
                role: 'customer',
                is_email_verified: false,
                is_active: true
              }
            ]);

          if (profileError) throw new Error('Failed to create user profile: ' + profileError.message);

          const userProfile: UserProfile = {
            id: data.user.id,
            email_address,
            ...profileData,
            role: 'customer',
            created_at: new Date().toISOString(),
            is_email_verified: false,
            is_active: true,
            accepted_terms: userData.accepted_terms
          };

          set({ 
            isAuthenticated: false,
            user: {
              ...data.user,
              profile: userProfile
            },
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Signup error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Signup failed';
          set({ 
            isLoading: false,
            error: errorMessage
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
            error: null
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
            .from('users')
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