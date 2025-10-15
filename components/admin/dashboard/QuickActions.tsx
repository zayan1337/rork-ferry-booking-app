import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors } from '@/constants/adminColors';
import {
  CreditCard,
  Ship,
  Users,
  DollarSign,
  MessageSquare,
} from 'lucide-react-native';
import SectionHeader from '@/components/admin/SectionHeader';

interface QuickActionsProps {
  onActionPress: (action: string) => void;
  canViewBookings: boolean;
  canViewUsers: boolean;
  canViewWallets: boolean;
  canViewNotifications: boolean;
}

export default function QuickActions({
  onActionPress,
  canViewBookings,
  canViewUsers,
  canViewWallets,
  canViewNotifications,
}: QuickActionsProps) {
  return (
    <View style={styles.quickActionsContainer}>
      <SectionHeader
        title='Quick Actions'
        subtitle='Common administrative tasks'
      />
      <View style={styles.quickActionsGrid}>
        {canViewBookings && (
          <Pressable
            style={styles.quickActionItem}
            onPress={() => onActionPress('new_booking')}
          >
            <CreditCard size={24} color={colors.primary} />
            <Text style={styles.quickActionText}>New Booking</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.quickActionItem}
          onPress={() => onActionPress('operations')}
        >
          <Ship size={24} color={colors.secondary} />
          <Text style={styles.quickActionText}>Operations</Text>
        </Pressable>

        {canViewUsers && (
          <Pressable
            style={styles.quickActionItem}
            onPress={() => onActionPress('users')}
          >
            <Users size={24} color='#34C759' />
            <Text style={styles.quickActionText}>User Management</Text>
          </Pressable>
        )}

        {canViewWallets && (
          <Pressable
            style={styles.quickActionItem}
            onPress={() => onActionPress('finance')}
          >
            <DollarSign size={24} color='#FF9500' />
            <Text style={styles.quickActionText}>Finance</Text>
          </Pressable>
        )}

        {canViewNotifications && (
          <Pressable
            style={styles.quickActionItem}
            onPress={() => onActionPress('communications')}
          >
            <MessageSquare size={24} color='#FF3B30' />
            <Text style={styles.quickActionText}>Communications</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActionsContainer: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  quickActionItem: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
    gap: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
});
