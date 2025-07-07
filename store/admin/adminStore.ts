import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { persist, createJSONStorage } from "zustand/middleware";
import { mockAlerts } from "@/mocks/adminData";
import { Alert } from "@/types/admin";

interface AdminState {
  alerts: Alert[];
  unreadAlertsCount: number;
  markAlertAsRead: (id: string) => void;
  markAllAlertsAsRead: () => void;
  addAlert: (alert: Alert) => void;
  dismissAlert: (id: string) => void;
  
  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // User preferences
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      alerts: mockAlerts,
      unreadAlertsCount: mockAlerts.filter(alert => !alert.read).length,
      
      markAlertAsRead: (id) => 
        set((state) => {
          const updatedAlerts = state.alerts.map((alert) => 
            alert.id === id ? { ...alert, read: true } : alert
          );
          return { 
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.read).length
          };
        }),
        
      markAllAlertsAsRead: () => 
        set((state) => ({
          alerts: state.alerts.map((alert) => ({ ...alert, read: true })),
          unreadAlertsCount: 0
        })),
        
      addAlert: (alert) => 
        set((state) => ({
          alerts: [alert, ...state.alerts],
          unreadAlertsCount: state.unreadAlertsCount + 1
        })),
        
      dismissAlert: (id) => 
        set((state) => {
          const updatedAlerts = state.alerts.filter((alert) => alert.id !== id);
          return { 
            alerts: updatedAlerts,
            unreadAlertsCount: updatedAlerts.filter(alert => !alert.read).length
          };
        }),
      
      // UI state
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      // User preferences
      darkMode: false,
      toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "admin-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);