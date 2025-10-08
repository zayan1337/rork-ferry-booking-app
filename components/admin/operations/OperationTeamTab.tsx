import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  useOperationTeamManagement,
  OperationTeamMember,
} from '@/hooks/useOperationTeamManagement';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Plus, Users, Bell } from 'lucide-react-native';

// Components
import SectionHeader from '@/components/admin/SectionHeader';
import Button from '@/components/admin/Button';
import SearchBar from '@/components/admin/SearchBar';
import LoadingSpinner from '@/components/admin/LoadingSpinner';
import OperationTeamItem from './OperationTeamItem';
import OperationTeamModal from './OperationTeamModal';

interface OperationTeamTabProps {
  isActive: boolean;
  searchQuery?: string;
}

export default function OperationTeamTab({
  isActive,
  searchQuery = '',
}: OperationTeamTabProps) {
  const { canViewOperations, canManageOperations } = useAdminPermissions();
  const {
    members,
    filteredMembers,
    stats,
    searchQuery: teamSearchQuery,
    setSearchQuery: setTeamSearchQuery,
    loading,
    error,
    loadAll,
    createMember,
    updateMember,
    deleteMember,
    toggleActive,
    toggleReceiveManifests,
  } = useOperationTeamManagement();

  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<OperationTeamMember | null>(null);

  // Initialize data when tab becomes active
  useEffect(() => {
    if (isActive && canViewOperations()) {
      if (!members || members.length === 0) {
        loadAll();
      }
    }
  }, [isActive, members?.length, loadAll]);

  // Filter members based on search query
  const displayMembers = useMemo(() => {
    const query = searchQuery || teamSearchQuery;
    if (!query) return members;

    return filteredMembers;
  }, [members, filteredMembers, searchQuery, teamSearchQuery]);

  const handleAddMember = () => {
    setSelectedMember(null);
    setShowModal(true);
  };

  const handleEditMember = (member: OperationTeamMember) => {
    setSelectedMember(member);
    setShowModal(true);
  };

  const handleDeleteMember = async (id: string) => {
    const result = await deleteMember(id);
    if (result.success) {
      Alert.alert('Success', 'Operation team member deleted successfully');
    } else {
      Alert.alert(
        'Error',
        result.error || 'Failed to delete operation team member'
      );
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const result = await toggleActive(id, isActive);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to update member status');
    }
  };

  const handleToggleManifests = async (
    id: string,
    receiveManifests: boolean
  ) => {
    const result = await toggleReceiveManifests(id, receiveManifests);
    if (!result.success) {
      Alert.alert(
        'Error',
        result.error || 'Failed to update manifest settings'
      );
    }
  };

  const handleModalSubmit = async (data: Partial<OperationTeamMember>) => {
    if (selectedMember) {
      // Update existing member
      const result = await updateMember(selectedMember.id, data);
      if (result.success) {
        Alert.alert('Success', 'Operation team member updated successfully');
        setShowModal(false);
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to update operation team member'
        );
      }
    } else {
      // Create new member
      const result = await createMember(
        data as Omit<OperationTeamMember, 'id' | 'created_at' | 'updated_at'>
      );
      if (result.success) {
        Alert.alert('Success', 'Operation team member added successfully');
        setShowModal(false);
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to add operation team member'
        );
      }
    }
  };

  // Permission check
  if (!canViewOperations()) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          You don't have permission to view operation team
        </Text>
      </View>
    );
  }

  // Loading state
  if (loading.data && members.length === 0) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error && members.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title='Retry' onPress={loadAll} variant='primary' />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <SectionHeader
            title='Operation Team'
            subtitle={`${stats.active} active members • ${stats.receivingManifests} receiving manifests`}
          />
        </View>
        {canManageOperations() && (
          <View style={styles.sectionHeaderActions}>
            <Button
              title='Add Member'
              onPress={handleAddMember}
              size='small'
              variant='primary'
              icon={<Plus size={16} color={colors.white} />}
            />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <SearchBar
        placeholder='Search by name, email, or role...'
        value={searchQuery || teamSearchQuery || ''}
        onChangeText={text => setTeamSearchQuery(text)}
      />

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Users size={20} color={colors.primary} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Members</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Bell size={20} color={colors.success} />
          <View style={styles.statContent}>
            <Text style={styles.statValue}>{stats.receivingManifests}</Text>
            <Text style={styles.statLabel}>Receiving Manifests</Text>
          </View>
        </View>
      </View>

      {/* Team Members List */}
      {displayMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>
            {teamSearchQuery || searchQuery
              ? 'No team members found'
              : 'No operation team members yet'}
          </Text>
          {canManageOperations() && !(teamSearchQuery || searchQuery) && (
            <Button
              title='Add First Member'
              onPress={handleAddMember}
              variant='primary'
              style={styles.emptyButton}
            />
          )}
        </View>
      ) : (
        <View style={styles.listContent}>
          {displayMembers.map(item => (
            <OperationTeamItem
              key={item.id}
              member={item}
              onEdit={handleEditMember}
              onDelete={handleDeleteMember}
              onToggleActive={handleToggleActive}
              onToggleReceiveManifests={handleToggleManifests}
              canManage={canManageOperations()}
            />
          ))}
        </View>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <OperationTeamModal
          visible={showModal}
          member={selectedMember}
          onClose={() => {
            setShowModal(false);
            setSelectedMember(null);
          }}
          onSubmit={handleModalSubmit}
          loading={loading.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  permissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
});
