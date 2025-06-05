import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

// Mock authentication function - would be replaced with actual API calls
const mockAuth = async (username: string, password: string): Promise<{ user: User; token: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation
  if (username === "demo" && password === "password") {
    return {
      user: {
        id: "user-1",
        fullName: "Demo User",
        mobileNumber: "+9607123456",
        email: "demo@example.com",
        dateOfBirth: "1990-01-01",
        username: "demo"
      },
      token: "mock-jwt-token"
    };
  }
  
  throw new Error("Invalid credentials");
};

// Mock registration function
const mockRegister = async (userData: Omit<User, 'id'> & { password: string }): Promise<{ user: User; token: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock validation - in a real app, this would check if username/email already exists
  if (userData.username === "demo") {
    throw new Error("Username already exists");
  }
  
  return {
    user: {
      id: "new-user-1",
      ...userData
    },
    token: "mock-jwt-token"
  };
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await mockAuth(username, password);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Login failed", 
            isLoading: false 
          });
        }
      },
      
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await mockRegister(userData);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : "Registration failed", 
            isLoading: false 
          });
        }
      },
      
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },
      
      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'ferry-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);