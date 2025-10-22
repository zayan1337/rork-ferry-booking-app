/**
 * Stop Passenger List Component
 *
 * Displays passengers boarding or dropping off at a specific stop
 * Used in captain's multi-stop trip management
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import {
  UserCheck,
  UserMinus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import type { StopPassengerInfo } from '@/types/multiStopTrip';

interface StopPassengerListProps {
  passengerInfo: StopPassengerInfo;
  onCheckIn?: (passengerId: string, bookingId: string) => void;
  showActions?: boolean;
}

export default function StopPassengerList({
  passengerInfo,
  onCheckIn,
  showActions = true,
}: StopPassengerListProps) {
  const { action, passengers, total_count, checked_in_count, stop_name } =
    passengerInfo;

  const ActionIcon = action === 'boarding' ? UserCheck : UserMinus;
  const actionColor = action === 'boarding' ? Colors.success : Colors.warning;
  const actionLabel = action === 'boarding' ? 'Boarding' : 'Dropping Off';

  const renderPassenger = ({ item: passenger }: { item: any }) => (
    <View style={styles.passengerItem}>
      <View style={styles.passengerInfo}>
        <View style={styles.passengerHeader}>
          <Text style={styles.passengerName}>{passenger.passenger_name}</Text>
          {passenger.check_in_status ? (
            <View style={styles.checkedInBadge}>
              <CheckCircle size={12} color={Colors.success} />
              <Text style={styles.checkedInText}>Checked In</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <AlertCircle size={12} color={Colors.warning} />
              <Text style={styles.pendingText}>Pending</Text>
            </View>
          )}
        </View>

        <View style={styles.passengerDetails}>
          <Text style={styles.passengerDetail}>
            Booking: {passenger.booking_number}
          </Text>
          <Text style={styles.passengerDetail}>
            Seat: {passenger.seat_number}
          </Text>
        </View>

        {passenger.special_assistance && (
          <View style={styles.specialAssistance}>
            <AlertCircle size={12} color={Colors.warning} />
            <Text style={styles.specialAssistanceText}>
              {passenger.special_assistance}
            </Text>
          </View>
        )}
      </View>

      {showActions &&
        !passenger.check_in_status &&
        action === 'boarding' &&
        onCheckIn && (
          <Pressable
            style={styles.checkInButton}
            onPress={() => onCheckIn(passenger.id, passenger.booking_id)}
          >
            <UserCheck size={16} color={Colors.primary} />
          </Pressable>
        )}
    </View>
  );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <ActionIcon size={20} color={actionColor} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{actionLabel}</Text>
          <Text style={styles.headerSubtitle}>
            {checked_in_count}/{total_count} passengers
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{total_count}</Text>
        </View>
      </View>

      {passengers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No passengers {action === 'boarding' ? 'boarding' : 'dropping off'}{' '}
            at {stop_name}
          </Text>
        </View>
      ) : (
        <FlatList
          data={passengers}
          renderItem={renderPassenger}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Summary */}
      {passengers.length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Passengers:</Text>
            <Text style={styles.summaryValue}>{total_count}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Checked In:</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {checked_in_count}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pending:</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {total_count - checked_in_count}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  headerBadge: {
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  passengerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.success + '20',
    borderRadius: 12,
  },
  checkedInText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.warning + '20',
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.warning,
  },
  passengerDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  passengerDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  specialAssistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    padding: 6,
    backgroundColor: Colors.warning + '10',
    borderRadius: 4,
  },
  specialAssistanceText: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
    flex: 1,
  },
  checkInButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});
