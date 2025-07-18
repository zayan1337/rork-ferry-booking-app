import { useEffect, useCallback } from 'react';
import { useAgentStore } from '@/store/agent/agentStore';
import { useAuthStore } from '@/store/authStore';
import { calculateLocalAgentStats } from '@/utils/agentUtils';

/**
 * Custom hook for managing agent data
 * Provides centralized agent data fetching and state management
 * 
 * This hook acts as the primary interface for components to access agent data
 * and handles initialization, refresh, and error management automatically.
 * 
 * Features:
 * - Automatic initialization when user role changes to 'agent'
 * - Comprehensive data fetching from all agent stores
 * - Error handling and retry mechanisms
 * - Local statistics calculation
 * - Granular refresh controls
 * 
 * The underlying agent stores have been cleaned and optimized:
 * - Improved error handling consistency
 * - Enhanced type safety
 * - Better documentation
 * - Reduced code duplication
 * - Standardized validation patterns
 */
export const useAgentData = () => {
    const { user } = useAuthStore();
    const {
        agent,
        stats,
        bookings,
        clients,
        creditTransactions,
        isLoading,
        isInitializing,
        isLoadingBookings,
        isLoadingClients,
        isLoadingCredit,
        isLoadingStats,
        isLoadingProfile,
        error,
        initializeFromAuthUser,
        fetchBookings,
        fetchClients,
        fetchCreditTransactions,
        updateStats,
        refreshAllData,
        clearError,
        reset,
        getLocalStats,
        isInitialized
    } = useAgentStore();

    /**
     * Initialize agent data when user changes
     * Automatically triggered when the authenticated user changes
     */
    useEffect(() => {
        if (user?.profile?.role === 'agent') {
            const initializeAgent = async () => {
                try {
                    // Only reset if we don't have an agent or it's a different user
                    if (!agent || agent.id !== user.id) {
                        reset();
                    }

                    // Initialize with fresh data from Supabase
                    await initializeFromAuthUser(user);
                } catch (error) {
                    console.error('Error initializing agent data:', error);
                    // Error is handled by the store, no need to re-throw
                }
            };

            initializeAgent();
        } else if (user && agent) {
            // Clear agent data if user is no longer an agent
            reset();
        }
    }, [user?.id, user?.profile?.role, agent?.id, initializeFromAuthUser, reset]);

    /**
     * Refresh all agent data
     * Fetches latest data from all agent-related endpoints with proper loading coordination
     */
    const refreshAgentData = useCallback(async () => {
        await refreshAllData();
    }, [refreshAllData]);

    /**
     * Get local calculated stats from current data
     * Provides real-time stats calculation without database queries
     */
    const localStats = useCallback(() => {
        if (!bookings || !clients) return null;
        return calculateLocalAgentStats(bookings, clients);
    }, [bookings, clients]);

    /**
     * Retry initialization on error
     * Useful for recovering from initialization failures
     */
    const retryInitialization = useCallback(async () => {
        if (user?.profile?.role === 'agent') {
            try {
                clearError();
                reset();
                await initializeFromAuthUser(user);
            } catch (error) {
                console.error('Error retrying agent initialization:', error);
                // Error is handled by the store
            }
        } else {
            console.warn('Cannot retry initialization: user is not an agent');
        }
    }, [user, initializeFromAuthUser, reset, clearError]);

    return {
        // Data
        agent,
        stats,
        bookings,
        clients,
        creditTransactions,
        localStats: localStats(),

        // State
        isLoading, // Legacy - use specific loading states below
        isInitializing,
        isLoadingBookings,
        isLoadingClients,
        isLoadingCredit,
        isLoadingStats,
        isLoadingProfile,
        error,
        isInitialized: isInitialized(),

        // Actions
        refreshAgentData,
        retryInitialization,
        clearError,
        reset,

        // Individual refresh functions for granular control
        refreshBookings: fetchBookings,
        refreshClients: fetchClients,
        refreshCreditTransactions: fetchCreditTransactions,
        refreshStats: updateStats,
    };
}; 