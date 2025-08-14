import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Calendar,
  Activity,
  Shield,
  Users,
  CreditCard,
  Ship,
  Route as RouteIcon,
} from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { UserProfile } from '@/types/userManagement';
import Button from '@/components/admin/Button';

interface UserActionsSectionProps {
  user: UserProfile;
  onViewBookings?: () => void;
  onViewActivity?: () => void;
  onViewPermissions?: () => void;
  onViewClients?: () => void;
  onViewTransactions?: () => void;
  onViewTrips?: () => void;
  onViewVessel?: () => void;
  onViewRoutes?: () => void;
}

export default function UserActionsSection({
  user,
  onViewBookings,
  onViewActivity,
  onViewPermissions,
  onViewClients,
  onViewTransactions,
  onViewTrips,
  onViewVessel,
  onViewRoutes,
}: UserActionsSectionProps) {
  const renderCustomerActions = () => (
    <View style={styles.actionButtons}>
      <Button
        title='View Bookings'
        variant='outline'
        onPress={onViewBookings || (() => {})}
        icon={<Calendar size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
      <Button
        title='View Activity'
        variant='outline'
        onPress={onViewActivity || (() => {})}
        icon={<Activity size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
    </View>
  );

  const renderAgentActions = () => (
    <View style={styles.actionButtons}>
      <Button
        title='View Clients'
        variant='outline'
        onPress={onViewClients || (() => {})}
        icon={<Users size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
      <Button
        title='View Transactions'
        variant='outline'
        onPress={onViewTransactions || (() => {})}
        icon={<CreditCard size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
      <Button
        title='View Bookings'
        variant='outline'
        onPress={onViewBookings || (() => {})}
        icon={<Calendar size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
    </View>
  );

  const renderAdminActions = () => (
    <View style={styles.actionButtons}>
      <Button
        title='View Permissions'
        variant='outline'
        onPress={onViewPermissions || (() => {})}
        icon={<Shield size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
      <Button
        title='View Activity'
        variant='outline'
        onPress={onViewActivity || (() => {})}
        icon={<Activity size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
    </View>
  );

  const renderPassengerActions = () => (
    <View style={styles.actionButtons}>
      <Button
        title='View Trip Details'
        variant='outline'
        onPress={onViewTrips || (() => {})}
        icon={<Calendar size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
    </View>
  );

  const renderCaptainActions = () => (
    <View style={styles.actionButtons}>
      <Button
        title='View Vessel'
        variant='outline'
        onPress={onViewVessel || (() => {})}
        icon={<Ship size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
      <Button
        title='View Routes'
        variant='outline'
        onPress={onViewRoutes || (() => {})}
        icon={<RouteIcon size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
      <Button
        title='View Trips'
        variant='outline'
        onPress={onViewTrips || (() => {})}
        icon={<Calendar size={16} color={colors.primary} />}
        style={styles.actionButton}
      />
    </View>
  );

  const renderActions = () => {
    switch (user.role) {
      case 'customer':
        return renderCustomerActions();
      case 'agent':
        return renderAgentActions();
      case 'admin':
        return renderAdminActions();
      case 'passenger':
        return renderPassengerActions();
      case 'captain':
        return renderCaptainActions();
      default:
        return null;
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Actions</Text>
      <View style={styles.actionsGrid}>{renderActions()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  actionsGrid: {
    gap: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
});
