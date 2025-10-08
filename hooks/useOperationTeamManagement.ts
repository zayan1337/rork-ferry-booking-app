import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';

export interface OperationTeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  receive_manifests: boolean;
  created_at: string;
  updated_at: string;
}

export interface OperationTeamStats {
  total: number;
  active: number;
  inactive: number;
  receivingManifests: number;
}

interface UseOperationTeamManagementReturn {
  members: OperationTeamMember[];
  filteredMembers: OperationTeamMember[];
  stats: OperationTeamStats;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: {
    data: boolean;
    action: boolean;
  };
  error: string | null;
  loadAll: () => Promise<void>;
  createMember: (
    member: Omit<OperationTeamMember, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<{
    success: boolean;
    error?: string;
    data?: OperationTeamMember;
  }>;
  updateMember: (
    id: string,
    updates: Partial<
      Omit<OperationTeamMember, 'id' | 'created_at' | 'updated_at'>
    >
  ) => Promise<{ success: boolean; error?: string }>;
  deleteMember: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleActive: (
    id: string,
    isActive: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  toggleReceiveManifests: (
    id: string,
    receiveManifests: boolean
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useOperationTeamManagement(): UseOperationTeamManagementReturn {
  const [members, setMembers] = useState<OperationTeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState({
    data: false,
    action: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Calculate stats
  const stats: OperationTeamStats = {
    total: members.length,
    active: members.filter(m => m.is_active).length,
    inactive: members.filter(m => !m.is_active).length,
    receivingManifests: members.filter(m => m.is_active && m.receive_manifests)
      .length,
  };

  // Filter members based on search query
  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.role.toLowerCase().includes(query)
    );
  });

  // Load all operation team members
  const loadAll = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, data: true }));
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('operation_team_emails')
        .select('*')
        .order('full_name', { ascending: true });

      if (fetchError) throw fetchError;

      setMembers(data || []);
    } catch (err) {
      console.error('Error loading operation team members:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load operation team members'
      );
    } finally {
      setLoading(prev => ({ ...prev, data: false }));
    }
  }, []);

  // Create new operation team member
  const createMember = useCallback(
    async (
      member: Omit<OperationTeamMember, 'id' | 'created_at' | 'updated_at'>
    ) => {
      try {
        setLoading(prev => ({ ...prev, action: true }));
        setError(null);

        const { data, error: createError } = await supabase
          .from('operation_team_emails')
          .insert([member])
          .select()
          .single();

        if (createError) throw createError;

        // Refresh the list
        await loadAll();

        return { success: true, data };
      } catch (err) {
        console.error('Error creating operation team member:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create operation team member';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(prev => ({ ...prev, action: false }));
      }
    },
    [loadAll]
  );

  // Update operation team member
  const updateMember = useCallback(
    async (
      id: string,
      updates: Partial<
        Omit<OperationTeamMember, 'id' | 'created_at' | 'updated_at'>
      >
    ) => {
      try {
        setLoading(prev => ({ ...prev, action: true }));
        setError(null);

        const { error: updateError } = await supabase
          .from('operation_team_emails')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) throw updateError;

        // Refresh the list
        await loadAll();

        return { success: true };
      } catch (err) {
        console.error('Error updating operation team member:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to update operation team member';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(prev => ({ ...prev, action: false }));
      }
    },
    [loadAll]
  );

  // Delete operation team member
  const deleteMember = useCallback(
    async (id: string) => {
      try {
        setLoading(prev => ({ ...prev, action: true }));
        setError(null);

        const { error: deleteError } = await supabase
          .from('operation_team_emails')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // Refresh the list
        await loadAll();

        return { success: true };
      } catch (err) {
        console.error('Error deleting operation team member:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to delete operation team member';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(prev => ({ ...prev, action: false }));
      }
    },
    [loadAll]
  );

  // Toggle active status
  const toggleActive = useCallback(
    async (id: string, isActive: boolean) => {
      return updateMember(id, { is_active: isActive });
    },
    [updateMember]
  );

  // Toggle receive manifests
  const toggleReceiveManifests = useCallback(
    async (id: string, receiveManifests: boolean) => {
      return updateMember(id, { receive_manifests: receiveManifests });
    },
    [updateMember]
  );

  // Load data on mount
  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    members,
    filteredMembers,
    stats,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    loadAll,
    createMember,
    updateMember,
    deleteMember,
    toggleActive,
    toggleReceiveManifests,
  };
}
