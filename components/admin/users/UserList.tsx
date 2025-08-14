import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import UserItem from '@/components/admin/UserItem';
import EmptyState from '@/components/admin/EmptyState';
import { Users } from 'lucide-react-native';
import { UserProfile } from '@/types/userManagement';

interface UserListProps {
  users: UserProfile[];
  selectedUsers: string[];
  canUpdateUsers: boolean;
  searchQuery: string;
  onUserPress: (user: UserProfile) => void;
  onUserSelect: (userId: string) => void;
}

const UserList: React.FC<UserListProps> = ({
  users,
  selectedUsers,
  canUpdateUsers,
  searchQuery,
  onUserPress,
  onUserSelect,
}) => {
  if (users.length === 0) {
    return (
      <EmptyState
        icon={<Users size={48} color={colors.textSecondary} />}
        title='No users found'
        message={
          searchQuery
            ? 'Try adjusting your search criteria'
            : 'No users match the current filters'
        }
      />
    );
  }

  return (
    <View style={styles.usersList}>
      {users.map(user => (
        <View key={user.id} style={styles.userItemWrapper}>
          {canUpdateUsers && (
            <TouchableOpacity
              style={styles.selectionCheckbox}
              onPress={() => onUserSelect(user.id)}
            >
              <View
                style={[
                  styles.checkbox,
                  selectedUsers.includes(user.id) && styles.checkboxSelected,
                ]}
              >
                {selectedUsers.includes(user.id) && (
                  <Check size={14} color='white' />
                )}
              </View>
            </TouchableOpacity>
          )}
          <View style={styles.userItemContent}>
            <UserItem user={user} onPress={() => onUserPress(user)} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  usersList: {
    gap: 12,
    marginTop: 16,
  },
  userItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCheckbox: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userItemContent: {
    flex: 1,
  },
});

export default UserList;
