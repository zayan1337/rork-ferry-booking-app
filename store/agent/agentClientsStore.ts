import { create } from 'zustand';
import { Client } from '@/types/agent';
import { supabase } from '@/utils/supabase';

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate required parameters
 * @param agentId - The agent ID to validate
 * @param paramName - Name of parameter for error messages
 * @throws {Error} If agent ID is not provided
 */
const validateRequired = (agentId: string, paramName: string = 'Agent ID') => {
    if (!agentId) {
        throw new Error(`${paramName} is required`);
    }
};

/**
 * Standardized error handling for client operations
 * @param error - The error object or message
 * @param defaultMessage - Default error message to use
 * @param set - Zustand set function for updating store state
 * @returns The error message string
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
 * Agent clients state and actions
 */
interface AgentClientsState {
    // State
    clients: Client[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchClients: (agentId: string) => Promise<void>;
    addClientToAgent: (agentId: string, clientId: string) => Promise<void>;
    createAgentClient: (agentId: string, clientData: {
        name: string;
        email: string;
        phone: string;
        idNumber?: string;
    }) => Promise<string>;
    searchExistingUser: (email: string) => Promise<any | null>;
    addExistingUserAsClient: (agentId: string, userId: string) => Promise<void>;
    clearError: () => void;
    reset: () => void;

    // Internal helper methods
    getAgentClients: (agentId: string) => Promise<Client[]>;
}

export const useAgentClientsStore = create<AgentClientsState>((set, get) => ({
    // Initial state
    clients: [],
    isLoading: false,
    error: null,

    /**
     * Get agent clients with booking counts from database
     * @param agentId - Agent ID to fetch clients for
     * @returns Array of clients with booking counts
     */
    getAgentClients: async (agentId: string): Promise<Client[]> => {
        try {
            validateRequired(agentId);

            // Use the comprehensive approach: query the view that handles both cases
            const { data: clientData, error: clientError } = await supabase
                .from('agent_clients_with_details')
                .select('*')
                .eq('agent_id', agentId);

            if (clientError) {
                throw clientError;
            }

            // Map the data - handle both clients with and without accounts
            const mappedClients = (clientData || []).map((item: any) => ({
                id: item.has_account ? item.client_id : item.id, // Use client_id for accounts, agent_clients id for no accounts
                name: item.full_name || 'Unknown',
                email: item.email || '',
                phone: item.mobile_number || '',
                bookingsCount: 0, // Will be updated with actual count below
                hasAccount: item.has_account,
                agentClientId: item.id, // Store the agent_clients record id
            }));

            // Get booking counts for each client (both types) - exclude "modified" status
            try {
                const { data: bookingCounts, error: bookingError } = await supabase
                    .from('bookings')
                    .select('user_id, agent_client_id, status')
                    .eq('agent_id', agentId)
                    .neq('status', 'modified'); // Exclude modified bookings from count

                if (!bookingError && bookingCounts) {
                    // Count bookings by both user_id and agent_client_id
                    const bookingCountsMap: Record<string, number> = {};

                    bookingCounts.forEach((booking: any) => {
                        // Count bookings for clients with accounts (user_id)
                        if (booking.user_id) {
                            bookingCountsMap[booking.user_id] = (bookingCountsMap[booking.user_id] || 0) + 1;
                        }
                        // Count bookings for clients without accounts (agent_client_id)
                        if (booking.agent_client_id) {
                            bookingCountsMap[booking.agent_client_id] = (bookingCountsMap[booking.agent_client_id] || 0) + 1;
                        }
                    });

                    // Update booking counts for all clients
                    mappedClients.forEach(client => {
                        if (client.hasAccount) {
                            // For clients with accounts, use client.id (which is user_id)
                            client.bookingsCount = bookingCountsMap[client.id] || 0;
                        } else {
                            // For clients without accounts, use agentClientId (which is agent_clients.id)
                            client.bookingsCount = bookingCountsMap[client.agentClientId] || 0;
                        }
                    });
                }
            } catch (bookingError) {
                console.warn('Could not fetch booking counts:', bookingError);
            }

            return mappedClients;
        } catch (error) {
            console.error('Error fetching agent clients:', error);

            // Final fallback to stored procedure if view doesn't work
            try {
                const { data, error: rpcError } = await supabase.rpc('get_agent_clients_with_stats', {
                    agent_user_id: agentId
                });

                if (!rpcError && data) {
                    return (data || []).map((client: any) => ({
                        id: client.id,
                        name: client.name,
                        email: client.email,
                        phone: client.phone,
                        bookingsCount: Number(client.bookingscount),
                        hasAccount: true, // Stored procedure likely only returns clients with accounts
                    }));
                }
            } catch (rpcError) {
                console.error('RPC fallback also failed:', rpcError);
            }

            throw error;
        }
    },

    /**
     * Fetch all clients for an agent
     * @param agentId - Agent ID to fetch clients for
     */
    fetchClients: async (agentId: string) => {
        if (!agentId) return;

        try {
            set({ isLoading: true, error: null });

            const clients = await get().getAgentClients(agentId);
            set({ 
                clients, 
                isLoading: false,
                error: null 
            });
        } catch (error) {
            handleError(error, 'Failed to fetch clients', set);
        }
    },

    /**
     * Add existing client to agent
     * @param agentId - Agent ID to add client to
     * @param clientId - Client ID to add
     */
    addClientToAgent: async (agentId: string, clientId: string) => {
        try {
            validateRequired(agentId);
            validateRequired(clientId, 'Client ID');

            set({ isLoading: true, error: null });

            const { error } = await supabase
                .from('agent_clients')
                .insert({
                    agent_id: agentId,
                    user_profile_id: clientId,
                });

            if (error) throw error;

            // Refresh clients after adding new one
            await get().fetchClients(agentId);
        } catch (error) {
            handleError(error, 'Failed to add client', set);
            throw error;
        }
    },

    /**
     * Create new agent client
     * @param agentId - Agent ID to create client for
     * @param clientData - Client data to create
     * @returns Created client ID
     */
    createAgentClient: async (agentId: string, clientData: {
        name: string;
        email: string;
        phone: string;
        idNumber?: string;
    }) => {
        try {
            validateRequired(agentId);

            // Validate client data
            if (!clientData.name?.trim()) {
                throw new Error('Client name is required');
            }
            if (!clientData.email?.trim() || !EMAIL_REGEX.test(clientData.email)) {
                throw new Error('Valid email address is required');
            }
            if (!clientData.phone?.trim()) {
                throw new Error('Phone number is required');
            }

            set({ isLoading: true, error: null });

            const email = clientData.email.trim().toLowerCase();

            // Check if a client with this email already exists for this agent
            const { data: existingClient, error: checkError } = await supabase
                .from('agent_clients')
                .select('id')
                .eq('agent_id', agentId)
                .eq('email', email)
                .maybeSingle(); // Use maybeSingle to avoid errors if no record found

            if (checkError) throw checkError;

            if (existingClient) {
                throw new Error('A client with this email already exists in your client list');
            }

            // Create new client record
            const { data: newClient, error: createError } = await supabase
                .from('agent_clients')
                .insert({
                    agent_id: agentId,
                    full_name: clientData.name.trim(),
                    email: email,
                    mobile_number: clientData.phone.trim(),
                    id_number: clientData.idNumber?.trim() || null,
                })
                .select()
                .single();

            if (createError) throw createError;

            // Refresh clients after creating new one
            await get().fetchClients(agentId);

            set({ isLoading: false });
            return newClient.id;

        } catch (error) {
            handleError(error, 'Failed to create client', set);
            throw error;
        }
    },

    /**
     * Search for existing user by email
     * @param email - Email address to search for
     * @returns User data if found, null otherwise
     */
    searchExistingUser: async (email: string) => {
        if (!email?.trim() || !EMAIL_REGEX.test(email)) {
            return null;
        }

        try {
            set({ isLoading: true, error: null });

            const { data, error } = await supabase
                .from('user_profiles')
                .select('id, full_name, email, mobile_number, role')
                .eq('email', email.toLowerCase().trim())
                .eq('role', 'customer')
                .maybeSingle(); // Use maybeSingle to avoid errors if no record found

            set({ isLoading: false });

            if (error) {
                console.error('Error searching for existing user:', error);
                return null;
            }

            return data;
        } catch (error) {
            handleError(error, 'Failed to search for existing user', set);
            return null;
        }
    },

    /**
     * Add existing user as agent client
     * @param agentId - Agent ID to add client to
     * @param userId - User ID to add as client
     */
    addExistingUserAsClient: async (agentId: string, userId: string) => {
        try {
            validateRequired(agentId);
            validateRequired(userId, 'User ID');

            set({ isLoading: true, error: null });

            // Get user details
            const { data: userData, error: userError } = await supabase
                .from('user_profiles')
                .select('id, full_name, email, mobile_number')
                .eq('id', userId)
                .single();

            if (userError) throw userError;
            if (!userData) throw new Error('User not found');

            // Check if this user is already a client of this agent
            const { data: existingAgentClient, error: checkError } = await supabase
                .from('agent_clients')
                .select('id')
                .eq('agent_id', agentId)
                .eq('client_id', userId)
                .maybeSingle(); // Use maybeSingle to avoid errors if no record found

            if (checkError) throw checkError;

            if (existingAgentClient) {
                throw new Error('This user is already a client of yours');
            }

            // Add existing user as client
            const { error: addError } = await supabase
                .from('agent_clients')
                .insert({
                    agent_id: agentId,
                    client_id: userId,
                    full_name: userData.full_name,
                    email: userData.email,
                    mobile_number: userData.mobile_number,
                });

            if (addError) throw addError;

            // Refresh clients data
            await get().fetchClients(agentId);

            set({ isLoading: false });

        } catch (error) {
            handleError(error, 'Failed to add existing user as client', set);
            throw error;
        }
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
            clients: [],
            isLoading: false,
            error: null,
        });
    },
})); 