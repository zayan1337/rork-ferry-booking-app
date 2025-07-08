import { useState, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import {
    AdminUser,
    AdminUserFilters,
    AdminPagination
} from '@/types/admin';
import { useAdminUsersStore } from '@/store/admin/adminUsersStore';

interface UseAdminUsersReturn {
    users: AdminUser[];
    loading: boolean;
    error: string | null;
    pagination: AdminPagination;
    fetchUsers: (filters?: AdminUserFilters, page?: number, limit?: number) => Promise<void>;
    updateUserStatus: (userId: string, isActive: boolean) => Promise<boolean>;
    updateUserRole: (userId: string, role: AdminUser['role']) => Promise<boolean>;
    getUserDetails: (userId: string) => Promise<AdminUser | null>;
    refreshUsers: () => Promise<void>;
}

export const useAdminUsers = (): UseAdminUsersReturn => {
    const {
        users,
        loading,
        error,
        pagination,
        filters: currentFilters,
        setUsers,
        setLoading,
        setError,
        setPagination,
        setFilters,
        updateUser,
        removeUser,
        clearState
    } = useAdminUsersStore();

    const fetchUsers = useCallback(async (
        filters: AdminUserFilters = {},
        page = 1,
        limit = 20
    ) => {
        try {
            setLoading(true);
            setError(null);
            setFilters(filters);

            // Build the query using the user_profiles table
            let query = supabase
                .from('user_profiles')
                .select('*', { count: 'exact' });

            // Apply filters
            if (filters.role && filters.role.length > 0) {
                query = query.in('role', filters.role);
            }

            if (filters.status !== undefined) {
                query = query.eq('is_active', filters.status);
            }

            if (filters.created_from) {
                query = query.gte('created_at', `${filters.created_from}T00:00:00Z`);
            }

            if (filters.created_to) {
                query = query.lte('created_at', `${filters.created_to}T23:59:59Z`);
            }

            // Search functionality
            if (filters.search) {
                const searchTerm = `%${filters.search}%`;
                query = query.or(`
                    full_name.ilike.${searchTerm},
                    email.ilike.${searchTerm},
                    mobile_number.ilike.${searchTerm}
                `);
            }

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            // Order by creation date (newest first)
            query = query.order('created_at', { ascending: false });

            const { data, error: fetchError, count } = await query;

            if (fetchError) throw fetchError;

            // Transform the data to match AdminUser interface
            const transformedUsers: AdminUser[] = (data || []).map(user => ({
                id: user.id,
                full_name: user.full_name || '',
                email: user.email || '',
                mobile_number: user.mobile_number || '',
                date_of_birth: user.date_of_birth || '',
                role: user.role || 'customer',
                is_active: user.is_active || false,
                accepted_terms: user.accepted_terms || false,
                agent_discount: user.agent_discount || undefined,
                credit_ceiling: user.credit_ceiling || undefined,
                credit_balance: user.credit_balance || undefined,
                free_tickets_allocation: user.free_tickets_allocation || undefined,
                free_tickets_remaining: user.free_tickets_remaining || undefined,
                preferred_language: user.preferred_language || 'en',
                text_direction: user.text_direction || 'ltr',
                created_at: user.created_at,
                updated_at: user.updated_at
            }));

            setUsers(transformedUsers);
            setPagination({
                page,
                limit,
                total: count || 0,
                total_pages: Math.ceil((count || 0) / limit)
            });

        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, [setUsers, setLoading, setError, setPagination, setFilters]);

    const updateUserStatus = useCallback(async (
        userId: string,
        isActive: boolean
    ): Promise<boolean> => {
        try {
            setError(null);

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // Update local state
            updateUser(userId, {
                is_active: isActive,
                updated_at: new Date().toISOString()
            });

            return true;
        } catch (err) {
            console.error('Error updating user status:', err);
            setError(err instanceof Error ? err.message : 'Failed to update user status');
            return false;
        }
    }, [updateUser, setError]);

    const updateUserRole = useCallback(async (
        userId: string,
        role: AdminUser['role']
    ): Promise<boolean> => {
        try {
            setError(null);

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // Update local state
            updateUser(userId, {
                role,
                updated_at: new Date().toISOString()
            });

            return true;
        } catch (err) {
            console.error('Error updating user role:', err);
            setError(err instanceof Error ? err.message : 'Failed to update user role');
            return false;
        }
    }, [updateUser, setError]);

    const getUserDetails = useCallback(async (userId: string): Promise<AdminUser | null> => {
        try {
            setError(null);

            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            if (!data) return null;

            // Transform to AdminUser interface
            const transformedUser: AdminUser = {
                id: data.id,
                full_name: data.full_name || '',
                email: data.email || '',
                mobile_number: data.mobile_number || '',
                date_of_birth: data.date_of_birth || '',
                role: data.role || 'customer',
                is_active: data.is_active || false,
                accepted_terms: data.accepted_terms || false,
                agent_discount: data.agent_discount || undefined,
                credit_ceiling: data.credit_ceiling || undefined,
                credit_balance: data.credit_balance || undefined,
                free_tickets_allocation: data.free_tickets_allocation || undefined,
                free_tickets_remaining: data.free_tickets_remaining || undefined,
                preferred_language: data.preferred_language || 'en',
                text_direction: data.text_direction || 'ltr',
                created_at: data.created_at,
                updated_at: data.updated_at
            };

            return transformedUser;
        } catch (err) {
            console.error('Error fetching user details:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch user details');
            return null;
        }
    }, [setError]);

    const refreshUsers = useCallback(async () => {
        await fetchUsers(currentFilters, pagination.page, pagination.limit);
    }, [fetchUsers, currentFilters, pagination.page, pagination.limit]);

    return {
        users,
        loading,
        error,
        pagination,
        fetchUsers,
        updateUserStatus,
        updateUserRole,
        getUserDetails,
        refreshUsers
    };
}; 