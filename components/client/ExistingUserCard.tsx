import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Colors from '@/constants/colors';

interface ExistingUser {
  id: string;
  full_name?: string;
  email: string;
  mobile_number?: string;
}

interface ExistingUserCardProps {
  user: ExistingUser;
  onAddUser: () => void;
  loading?: boolean;
}

const ExistingUserCard: React.FC<ExistingUserCardProps> = ({
  user,
  onAddUser,
  loading = false,
}) => {
  return (
    <Card variant='outlined' style={styles.existingUserCard}>
      <View style={styles.existingUserHeader}>
        <Check size={20} color={Colors.primary} />
        <Text style={styles.existingUserTitle}>Existing User Found</Text>
      </View>
      <Text style={styles.existingUserName}>
        {user.full_name || 'No name provided'}
      </Text>
      <Text style={styles.existingUserDetails}>
        {user.email} • {user.mobile_number || 'No phone'}
      </Text>
      <Button
        title='Add This User as Client'
        onPress={onAddUser}
        variant='primary'
        style={styles.addExistingButton}
        loading={loading}
        disabled={loading}
      />
      <Text style={styles.orText}>
        or continue creating new client record below
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  existingUserCard: {
    marginBottom: 16,
    backgroundColor: Colors.highlight,
    borderColor: Colors.primary,
  },
  existingUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  existingUserTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  existingUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  existingUserDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  addExistingButton: {
    marginBottom: 12,
  },
  orText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ExistingUserCard;
