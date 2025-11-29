import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBooking, BookingStatus } from '@/types/admin/management';
import StatusBadge from '@/components/admin/StatusBadge';
import { useAlertContext } from '@/components/AlertProvider';
import {
  CheckCircle,
  Eye,
  User,
  CreditCard,
  Clock,
  FileText,
  Printer,
  MessageSquare,
  Receipt,
  Edit,
  Trash2,
} from 'lucide-react-native';

interface BookingActionsSectionProps {
  booking: AdminBooking;
  onStatusUpdate?: (status: BookingStatus) => Promise<void>;
  onPaymentStatusUpdate?: (status: string) => Promise<void>;
  onViewCustomer?: () => void;
  onContactCustomer?: () => void;
  onPrintTicket?: () => void;
  onGenerateReceipt?: () => void;
  onCancelBooking?: () => void;
  canUpdateBookings?: boolean;
  loading?: boolean;
}

export default function BookingActionsSection({
  booking,
  onStatusUpdate,
  onPaymentStatusUpdate,
  onViewCustomer,
  onContactCustomer,
  onPrintTicket,
  onGenerateReceipt,
  onCancelBooking,
  canUpdateBookings = false,
  loading = false,
}: BookingActionsSectionProps) {
  const { showError, showInfo } = useAlertContext();

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (!onStatusUpdate) return;

    try {
      await onStatusUpdate(newStatus);
    } catch (error) {
      showError('Error', 'Failed to update booking status');
    }
  };

  const handlePaymentStatusUpdate = async (newStatus: string) => {
    if (!onPaymentStatusUpdate) return;

    try {
      await onPaymentStatusUpdate(newStatus);
    } catch (error) {
      showError('Error', 'Failed to update payment status');
    }
  };

  const getStatusActions = () => {
    const actions = [];

    // Status update actions based on current status
    switch (booking.status) {
      case 'reserved':
        actions.push(
          <Pressable
            key='confirm'
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => handleStatusUpdate('confirmed')}
            disabled={loading || !canUpdateBookings}
          >
            <CheckCircle size={18} color='#FFFFFF' />
            <Text style={styles.actionButtonText}>Confirm Booking</Text>
          </Pressable>
        );
        break;
      case 'pending_payment':
        actions.push(
          <Pressable
            key='confirm'
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => handleStatusUpdate('confirmed')}
            disabled={loading || !canUpdateBookings}
          >
            <CheckCircle size={18} color='#FFFFFF' />
            <Text style={styles.actionButtonText}>Confirm Payment</Text>
          </Pressable>
        );
        break;
      case 'confirmed':
        actions.push(
          <Pressable
            key='checkin'
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => handleStatusUpdate('checked_in')}
            disabled={loading || !canUpdateBookings}
          >
            <Eye size={18} color='#FFFFFF' />
            <Text style={styles.actionButtonText}>Check In</Text>
          </Pressable>
        );
        break;
      case 'checked_in':
        actions.push(
          <Pressable
            key='complete'
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => handleStatusUpdate('completed')}
            disabled={loading || !canUpdateBookings}
          >
            <CheckCircle size={18} color='#FFFFFF' />
            <Text style={styles.actionButtonText}>Mark Complete</Text>
          </Pressable>
        );
        break;
    }

    return actions;
  };

  const getPaymentActions = () => {
    if (!booking.payment_status) return [];

    const actions = [];

    switch (booking.payment_status) {
      case 'pending':
        actions.push(
          <Pressable
            key='mark-paid'
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => handlePaymentStatusUpdate('completed')}
            disabled={loading || !canUpdateBookings}
          >
            <CheckCircle size={18} color='#FFFFFF' />
            <Text style={styles.actionButtonText}>Mark as Paid</Text>
          </Pressable>
        );
        break;
      // Removed Process Refund button - refunds are handled in cancel booking modal
    }

    return actions;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Booking Management</Text>

      {/* Status Management */}
      <View style={styles.actionGroup}>
        <View style={styles.groupHeader}>
          <Clock size={20} color={colors.primary} />
          <Text style={styles.groupTitle}>Booking Status</Text>
        </View>
        <View style={styles.statusDisplay}>
          {/* <StatusBadge status={booking.status} /> */}
          <Text style={styles.statusText}>
            Current status: {booking.status.replace('_', ' ')}
          </Text>
        </View>

        {canUpdateBookings && (
          <View style={styles.actionButtons}>{getStatusActions()}</View>
        )}
      </View>

      {/* Payment Management */}
      {booking.payment_status && (
        <View style={styles.actionGroup}>
          <View style={styles.groupHeader}>
            <CreditCard size={20} color={colors.primary} />
            <Text style={styles.groupTitle}>Payment Status</Text>
          </View>
          <View style={styles.statusDisplay}>
            <StatusBadge
              status={booking.payment_status as any}
              variant='payment'
            />
            <Text style={styles.statusText}>
              Payment: {booking.payment_status}
            </Text>
          </View>

          {canUpdateBookings && (
            <View style={styles.actionButtons}>{getPaymentActions()}</View>
          )}
        </View>
      )}

      {/* Customer Actions */}
      <View style={styles.actionGroup}>
        <View style={styles.groupHeader}>
          <User size={20} color={colors.primary} />
          <Text style={styles.groupTitle}>Customer Actions</Text>
        </View>
        <View style={styles.actionButtons}>
          {onViewCustomer && (
            <Pressable
              style={[styles.actionButton, styles.outlineAction]}
              onPress={onViewCustomer}
            >
              <User size={18} color={colors.primary} />
              <Text
                style={[styles.actionButtonText, { color: colors.primary }]}
              >
                View Customer
              </Text>
            </Pressable>
          )}
          <Pressable
            style={[styles.actionButton, styles.outlineAction]}
            onPress={onContactCustomer || (() => {})}
          >
            <MessageSquare size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Contact Customer
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Booking Management Actions */}
      {['reserved', 'pending_payment', 'confirmed'].includes(
        booking.status
      ) && (
        <View style={styles.actionGroup}>
          <View style={styles.groupHeader}>
            <Edit size={20} color={colors.primary} />
            <Text style={styles.groupTitle}>Booking Management</Text>
          </View>
          <View style={styles.actionButtons}>
            {/* <Pressable
              style={[styles.actionButton, styles.outlineAction]}
              onPress={() =>
                router.push(`/(admin)/booking/${booking.id}/modify` as any)
              }
              disabled={!canUpdateBookings}
            >
              <Edit size={18} color={colors.primary} />
              <Text
                style={[styles.actionButtonText, { color: colors.primary }]}
              >
                Modify Booking
              </Text>
            </Pressable> */}
            <Pressable
              style={[styles.actionButton, styles.dangerAction]}
              onPress={onCancelBooking || (() => {})}
              disabled={!canUpdateBookings || loading}
            >
              <Trash2 size={18} color='#FFFFFF' />
              <Text style={styles.actionButtonText}>Cancel Booking</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Document Actions */}
      <View style={styles.actionGroup}>
        <View style={styles.groupHeader}>
          <FileText size={20} color={colors.primary} />
          <Text style={styles.groupTitle}>Documents & Reports</Text>
        </View>
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.outlineAction]}
            onPress={onPrintTicket || (() => {})}
          >
            <Printer size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Print Ticket
            </Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.outlineAction]}
            onPress={onGenerateReceipt || (() => {})}
          >
            <Receipt size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Generate Receipt
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  actionGroup: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minHeight: 44,
    flex: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  dangerAction: {
    backgroundColor: colors.danger,
  },
  outlineAction: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
