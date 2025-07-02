import { useEffect, useCallback } from 'react';
import { useAgentStore } from '@/store/agentStore';
import { useAuthStore } from '@/store/authStore';
import { calculateLocalAgentStats } from '@/utils/agentUtils';

/**
 * Custom hook for managing agent data
 * Provides centralized agent data fetching and state management
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
        error,
        initializeFromAuthUser,
        fetchBookings,
        fetchClients,
        fetchCreditTransactions,
        updateStats,
        clearError,
        reset,
        getLocalStats
    } = useAgentStore();

    // Initialize agent data when user changes
    useEffect(() => {
        if (user?.profile?.role === 'agent') {
            const initializeAgent = async () => {
                try {
                    // Clear any existing cached data first
                    reset();

                    // Initialize with fresh data from Supabase
                    await initializeFromAuthUser(user);
                } catch (error) {
                    console.error('Error initializing agent data:', error);
                }
            };

            initializeAgent();
        }
    }, [user?.id, initializeFromAuthUser, reset]);

    // Refresh all agent data
    const refreshAgentData = useCallback(async () => {
        if (!agent?.id) return;

        try {
            await Promise.all([
                fetchBookings(),
                fetchClients(),
                fetchCreditTransactions(),
                updateStats()
            ]);
        } catch (error) {
            console.error('Error refreshing agent data:', error);
        }
    }, [agent?.id, fetchBookings, fetchClients, fetchCreditTransactions, updateStats]);

    // Get local calculated stats
    const localStats = useCallback(() => {
        if (!bookings || !clients) return null;
        return calculateLocalAgentStats(bookings, clients);
    }, [bookings, clients]);

    // Retry initialization on error
    const retryInitialization = useCallback(async () => {
        if (user?.profile?.role === 'agent') {
            clearError();
            reset();
            await initializeFromAuthUser(user);
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
        isLoading,
        error,

        // Actions
        refreshAgentData,
        retryInitialization,
        clearError,
        reset,

        // Individual refresh functions
        refreshBookings: fetchBookings,
        refreshClients: fetchClients,
        refreshCreditTransactions: fetchCreditTransactions,
        refreshStats: updateStats,
    };
}; 