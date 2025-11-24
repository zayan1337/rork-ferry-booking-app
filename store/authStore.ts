import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, supabaseAdmin } from '../utils/supabase';
import type { UserProfile, RegisterData, AuthUser } from '@/types/auth';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthenticating: boolean; // Separate state for auth initialization
  user: AuthUser | null;
  error: string | null;
  preventRedirect: boolean;
  isRehydrated: boolean;
  otpEmail: string | null;
  pendingRegistration: RegisterData | null;
  login: (email: string, password: string) => Promise<void>;
  signUp: (userData: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setError: (error: string) => void;
  clearLoading: () => void;
  sendOTPForPasswordReset: (email: string) => Promise<void>;
  ResetPassword: (newPassword: string) => Promise<void>;
  sendOTPForSignup: (userData: RegisterData) => Promise<void>;
  completePendingRegistration: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  setPreventRedirect: (prevent: boolean) => void;
  setRehydrated: (rehydrated: boolean) => void;
  setOtpEmail: (email: string | null) => void;
  verifyOTP: (
    email: string,
    otp: string,
    type: 'email' | 'recovery'
  ) => Promise<void>;
  isGuestMode: boolean;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      isAuthenticating: false,
      user: null,
      error: null,
      preventRedirect: false,
      isRehydrated: false,
      otpEmail: null,
      pendingRegistration: null,
      isGuestMode: false,

      setError: (error: string) => set({ error }),

      clearError: () => set({ error: null }),

      clearLoading: () => set({ isLoading: false }),

      setPreventRedirect: (prevent: boolean) =>
        set({ preventRedirect: prevent }),

      setRehydrated: (rehydrated: boolean) => set({ isRehydrated: rehydrated }),

      setOtpEmail: (email: string | null) => set({ otpEmail: email }),

      enableGuestMode: () => {
        set({
          isGuestMode: true,
          isAuthenticated: false,
          user: null,
          preventRedirect: false,
          error: null,
        });
      },

      disableGuestMode: () => {
        set({ isGuestMode: false });
      },

      checkAuth: async () => {
        try {
          set({ isAuthenticating: true, error: null });
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          // Handle refresh token errors by clearing auth state
          if (sessionError) {
            console.error('Session error:', sessionError);
            if (
              sessionError.message.includes('refresh_token_not_found') ||
              sessionError.message.includes('Invalid Refresh Token')
            ) {
              // Clear invalid session
              await supabase.auth.signOut();
              set({
                isAuthenticated: false,
                user: null,
                isAuthenticating: false,
                error: null, // Don't show error for invalid refresh tokens
                isGuestMode: false,
              });
              return;
            }
          }

          if (session?.user) {
            // Ensure we have a valid user profile
            const { data: userProfile, error: profileError } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profileError) {
              console.error('Profile fetch error:', profileError);
              // If profile doesn't exist or can't be fetched, sign out
              await supabase.auth.signOut();
              set({
                isAuthenticated: false,
                user: null,
                isAuthenticating: false,
                error: 'Profile not found. Please contact support.',
              });
              return;
            }

            if (!userProfile) {
              console.error('No profile found for user');
              await supabase.auth.signOut();
              set({
                isAuthenticated: false,
                user: null,
                isAuthenticating: false,
                error: 'User profile not found. Please contact support.',
              });
              return;
            }

            // Verify user is active
            if (!userProfile.is_active) {
              await supabase.auth.signOut();
              const statusReason =
                userProfile.status_reason?.toLowerCase() ?? '';
              const inactiveMessage = statusReason.includes('deletion')
                ? 'This account has been deleted. Please contact support if this is unexpected.'
                : 'Account is inactive. Please contact support.';
              set({
                isAuthenticated: false,
                user: null,
                isAuthenticating: false,
                error: inactiveMessage,
              });
              return;
            }

            set({
              isAuthenticated: true,
              user: {
                ...session.user,
                profile: userProfile,
              },
              isAuthenticating: false,
              isGuestMode: false,
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              isAuthenticating: false,
              isGuestMode: false,
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);

          // Handle specific auth errors
          if (
            error instanceof Error &&
            (error.message.includes('refresh_token_not_found') ||
              error.message.includes('Invalid Refresh Token'))
          ) {
            // Clear invalid session silently
            await supabase.auth.signOut();
            set({
              isAuthenticated: false,
              user: null,
              isAuthenticating: false,
              error: null,
              isGuestMode: false,
            });
            return;
          }

          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Authentication check failed';
          set({
            isAuthenticated: false,
            user: null,
            isAuthenticating: false,
            error: errorMessage,
            isGuestMode: false,
          });
        }
      },

      login: async (email: string, password: string) => {
        try {
          set({ isAuthenticating: true, error: null, isGuestMode: false });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) throw error;
          if (!data.user) throw new Error('User data is missing');

          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (profileError) {
            throw new Error(
              `Failed to fetch user profile: ${profileError.message}`
            );
          }
          if (!profile) {
            await supabase.auth.signOut();
            throw new Error(
              'Account profile not found. It may have been deleted. Please contact support.'
            );
          }

          // Verify user is active
          if (!profile.is_active) {
            await supabase.auth.signOut();
            const statusReason = profile.status_reason?.toLowerCase() ?? '';
            const inactiveMessage = statusReason.includes('deletion')
              ? 'This account has been deleted. Please contact support if this is unexpected.'
              : 'Account is inactive. Please contact support.';
            throw new Error(inactiveMessage);
          }

          set({
            isAuthenticated: true,
            user: {
              ...data.user,
              profile,
            },
            isAuthenticating: false,
            error: null,
            isGuestMode: false,
          });
        } catch (error) {
          console.error('Login error:', error);
          let errorMessage = 'Login failed. Please check your credentials.';

          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            // Provide user-friendly error messages
            if (
              message.includes('invalid login credentials') ||
              message.includes('invalid email or password') ||
              message.includes('email not confirmed')
            ) {
              errorMessage = 'Invalid email or password. Please try again.';
            } else if (message.includes('user not found')) {
              errorMessage = 'No account found with this email address.';
            } else if (message.includes('too many requests')) {
              errorMessage = 'Too many login attempts. Please try again later.';
            } else if (message.includes('account is inactive')) {
              errorMessage = error.message; // Keep the original message for inactive accounts
            } else {
              errorMessage = error.message;
            }
          }

          set({
            isAuthenticating: false,
            error: errorMessage,
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
                date_of_birth: profileData.date_of_birth,
                accepted_terms: profileData.accepted_terms,
              },
            },
          });

          if (error) throw error;
          if (!data.user?.id) throw new Error('User data is missing');

          // Profile creation is handled by the database trigger
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError)
            throw new Error(
              `Failed to fetch user profile: ${profileError.message}`
            );

          // Note: Welcome email will be sent automatically when user verifies their email
          // This is handled by the database trigger on user_profiles table
          // Alternatively, you can manually trigger it here after email verification:
          // await supabase.functions.invoke('send-welcome-email', {
          //   body: { userId: data.user.id, email: email_address, fullName: profileData.full_name }
          // });

          set({
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Signup error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Signup failed';
          set({
            isLoading: false,
            error: errorMessage,
            preventRedirect: false,
          });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ isAuthenticating: true, error: null });
          const { error } = await supabase.auth.signOut();
          // if (error) throw error;

          // Set preventRedirect to true to avoid immediate navigation
          set({
            isAuthenticated: false,
            user: null,
            isAuthenticating: false,
            error: null,
            preventRedirect: true,
            isGuestMode: false,
          });

          // Allow a small delay before allowing redirects again
          setTimeout(() => {
            set({ preventRedirect: false });
          }, 500);
        } catch (error) {
          console.error('Signout error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Sign out failed';
          set({
            isAuthenticating: false,
            error: errorMessage,
            isGuestMode: false,
          });
          throw error;
        }
      },

      ResetPassword: async (newPassword: string) => {
        try {
          set({ isLoading: true, error: null });

          // Update password - this requires an active session from OTP verification
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) throw updateError;

          // Sign out after successful password reset
          await supabase.auth.signOut();

          set({
            isLoading: false,
            otpEmail: null,
          });
        } catch (error) {
          console.error('reset password error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Password reset failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },
      sendOTPForPasswordReset: async (email: string) => {
        try {
          set({ isLoading: true, error: null });

          // Use Supabase's OTP functionality for password reset
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: undefined,
          });

          if (error) throw error;

          // Keep loading state true for navigation - will be reset by the component
          set({
            isLoading: false,
            otpEmail: email,
          });
        } catch (error) {
          console.error('Send OTP error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to send OTP';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      verifyOTP: async (
        email: string,
        otp: string,
        type: 'email' | 'recovery'
      ) => {
        try {
          set({ isLoading: true, error: null });

          // Verify OTP and sign in
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type,
          });

          if (verifyError) throw verifyError;
          if (!data.user) throw new Error('OTP verification failed');

          // Send welcome email after successful email verification
          if (type === 'email' && data.user) {
            try {
              // Call edge function to send welcome email
              await supabase.functions.invoke('send-welcome-email', {
                body: {
                  userId: data.user.id,
                  email: email,
                  fullName: data.user.user_metadata?.full_name,
                },
              });
            } catch (emailError) {
              // Log error but don't fail the verification process
              console.warn('Failed to send welcome email:', emailError);
            }
          }

          // Don't sign out for recovery type - we need the session for password reset
          if (type === 'email') {
            // Only sign out for email verification (signup flow)
            await supabase.auth.signOut();
          }

          set({
            isLoading: false,
            otpEmail: type === 'recovery' ? email : null, // Keep email for recovery flow
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'OTP verification failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      sendOTPForSignup: async (userData: RegisterData) => {
        try {
          set({ isLoading: true, error: null });

          // Store registration data temporarily
          set({ pendingRegistration: userData });

          // Send OTP for email verification using admin client
          const { data, error: adminError } =
            await supabaseAdmin.auth.admin.generateLink({
              type: 'signup',
              email: userData.email_address,
              password: userData.password,
            });

          if (adminError) throw adminError;
          // Send OTP for email verification
          // const { error } = await supabase.auth.signInWithOtp({
          //   email: userData.email_address,
          //   options: {
          //     shouldCreateUser: false,
          //   },
          // });

          // if (error) throw error;

          // Keep loading state true for navigation - will be reset by the component
          set({
            otpEmail: userData.email_address,
          });
        } catch (error) {
          console.error('Send signup OTP error:', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to send verification code';
          set({
            isLoading: false,
            error: errorMessage,
            pendingRegistration: null,
          });
          throw error;
        }
      },

      completePendingRegistration: async () => {
        try {
          const { pendingRegistration } = get();
          if (!pendingRegistration) {
            throw new Error('No pending registration found');
          }

          set({ isLoading: true, error: null });

          const { email_address, password, ...profileData } =
            pendingRegistration;

          // Create the auth user
          const { data, error } = await supabase.auth.signUp({
            email: email_address,
            password,
            options: {
              data: {
                full_name: profileData.full_name,
                mobile_number: profileData.mobile_number,
                date_of_birth: profileData.date_of_birth,
                accepted_terms: profileData.accepted_terms,
              },
            },
          });

          if (error) throw error;
          if (!data.user?.id) throw new Error('User data is missing');

          // Profile creation is handled by the database trigger
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError)
            throw new Error(
              `Failed to fetch user profile: ${profileError.message}`
            );

          // Clear pending registration
          set({
            isLoading: false,
            error: null,
            pendingRegistration: null,
          });
        } catch (error) {
          console.error('Complete registration error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Registration failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      updatePassword: async (newPassword: string) => {
        try {
          set({ isLoading: true, error: null });
          const { error } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (error) throw error;
          set({ isLoading: false });
        } catch (error) {
          console.error('Update password error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Password update failed';
          set({
            isLoading: false,
            error: errorMessage,
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
            user: state.user
              ? {
                  ...state.user,
                  profile: {
                    ...(state.user.profile as UserProfile),
                    ...profile,
                  },
                }
              : null,
          }));
        } catch (error) {
          console.error('Update profile error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Profile update failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      deleteAccount: async () => {
        const { user } = get();
        if (!user?.id) {
          throw new Error('No authenticated user to delete.');
        }

        try {
          set({ isLoading: true, error: null });

          const placeholderEmail = `deleted+${user.id}@example.com`;
          const deletionReason = 'User requested account deletion';
          const timestamp = new Date().toISOString();

          // Soft delete: Anonymize personal data and deactivate account
          // This approach is necessary because:
          // 1. Booking records must be retained for 7 years (legal compliance)
          // 2. Foreign key constraints prevent hard deletion of users with bookings
          // 3. Financial records must be preserved for accounting/tax purposes
          // 4. Safety records (passenger manifests) must be maintained
          // Personal data is immediately anonymized while transaction records are retained
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({
              full_name: 'Deleted Account',
              mobile_number: '0000000000',
              email: null,
              is_active: false,
              status: 'inactive',
              status_reason: deletionReason,
              status_updated_at: timestamp,
              accepted_terms: false,
              last_login: null,
              updated_at: timestamp,
            })
            .eq('id', user.id);

          if (profileError) {
            throw profileError;
          }

          // Ban auth user and mark as deleted in metadata
          const { error: authUpdateError } =
            await supabaseAdmin.auth.admin.updateUserById(user.id, {
              email: placeholderEmail,
              email_confirm: false,
              ban_duration: '876000h', // Effectively permanent (~100 years)
              user_metadata: {
                ...(user.user_metadata || {}),
                accountDeleted: true,
                deletedAt: timestamp,
                deletionType: 'soft', // Track that this is a soft delete
              },
            });

          if (authUpdateError) {
            throw authUpdateError;
          }

          await supabase.auth.signOut();

          set({
            isAuthenticated: false,
            isGuestMode: false,
            user: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Delete account error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Account deletion failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        isAuthenticated: state.isAuthenticated,
        isGuestMode: state.isGuestMode,
        user: state.user,
      }),
      onRehydrateStorage: () => state => {
        if (state) {
          state.setRehydrated(true);
        }
      },
    }
  )
);
