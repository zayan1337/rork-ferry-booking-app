import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Keyboard,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
  Stack,
  useFocusEffect,
} from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAdminBookingStore } from '@/store/admin/bookingStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { AdminBooking } from '@/types/admin/management';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Clock,
  Mail,
  Phone,
  Trash2,
} from 'lucide-react-native';
import {
  formatDateTime,
  formatCurrency,
} from '@/utils/admin/bookingManagementUtils';
import Input from '@/components/Input';

type RefundMethod = 'original_payment' | 'bank_transfer' | 'credit_note';

interface BankDetails {
  accountNumber: string;
  accountName: string;
  bankName: string;
}

export default function AdminCancelBookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const {
    fetchBooking,
    updateBooking,
    loading: storeLoading,
    error: storeError,
  } = useAdminBookingStore();
  const { canUpdateBookings } = useAdminPermissions();

  // Ensure id is a string
  const bookingId = Array.isArray(id) ? id[0] : id;

  // All hooks must be called before any early returns
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const inputRefs = useRef({
    reason: null as any,
    adminNotes: null as any,
    customerNotification: null as any,
  });

  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [customerNotification, setCustomerNotification] = useState('');
  const [refundMethod, setRefundMethod] =
    useState<RefundMethod>('original_payment');
  const [refundPercentage, setRefundPercentage] = useState(100);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    accountNumber: '',
    accountName: '',
    bankName: '',
  });
  const [errors, setErrors] = useState({
    reason: '',
    bankDetails: '',
  });
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto-refresh when page is focused
  useFocusEffect(
    React.useCallback(() => {
      loadBooking();
    }, [])
  );

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
        if (activeInput) {
          scrollToInput(activeInput);
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setActiveInput(null);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [activeInput]);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      if (!bookingId || typeof bookingId !== 'string') {
        setError('Invalid booking ID');
        return;
      }

      const fetchedBooking = await fetchBooking(bookingId);

      if (fetchedBooking) {
        setBooking(fetchedBooking);
      } else {
        setError(`Booking with ID "${bookingId}" not found`);
      }
    } catch (err) {
      setError('Failed to load booking details');
      console.error('Error loading booking:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!bookingId || typeof bookingId !== 'string') return;
    await loadBooking(true);
  };

  const scrollToInput = (inputName: string) => {
    setTimeout(() => {
      const inputRef =
        inputRefs.current[inputName as keyof typeof inputRefs.current];
      if (inputRef && scrollViewRef.current) {
        inputRef.measureLayout(
          scrollViewRef.current as any,
          (x: number, y: number) => {
            const scrollOffset = y - 100;
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, scrollOffset),
              animated: true,
            });
          },
          () => {}
        );
      }
    }, 100);
  };

  const validateForm = (): boolean => {
    const newErrors = {
      reason: '',
      bankDetails: '',
    };

    if (!reason.trim()) {
      newErrors.reason = 'Cancellation reason is required';
    }

    if (refundMethod === 'bank_transfer') {
      if (!bankDetails.accountNumber.trim()) {
        newErrors.bankDetails = 'Bank account number is required';
      }
      if (!bankDetails.accountName.trim()) {
        newErrors.bankDetails = 'Account holder name is required';
      }
      if (!bankDetails.bankName.trim()) {
        newErrors.bankDetails = 'Bank name is required';
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleCancel = async () => {
    if (!booking || !canUpdateBookings()) {
      Alert.alert('Error', 'You do not have permission to cancel bookings');
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Check if booking can be cancelled
    if (
      !['reserved', 'pending_payment', 'confirmed'].includes(booking.status)
    ) {
      Alert.alert(
        'Cannot Cancel',
        'This booking cannot be cancelled in its current status'
      );
      return;
    }

    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel booking #${booking.booking_number}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: performCancellation,
        },
      ]
    );
  };

  const performCancellation = async () => {
    if (!booking) return;

    setIsCancelling(true);
    try {
      // Update booking status to cancelled
      await updateBooking(booking.id, { status: 'cancelled' });

      // Here you would typically create a cancellation record in the database
      // For now, we'll just show success and navigate back

      Alert.alert(
        'Booking Cancelled',
        `Booking #${booking.booking_number} has been successfully cancelled.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert('Error', 'Failed to cancel booking. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleInputChange = (field: keyof BankDetails, value: string) => {
    setBankDetails(prev => ({ ...prev, [field]: value }));
    if (errors.bankDetails) {
      setErrors(prev => ({ ...prev, bankDetails: '' }));
    }
  };

  const handleReasonChange = (text: string) => {
    setReason(text);
    if (errors.reason) {
      setErrors(prev => ({ ...prev, reason: '' }));
    }
  };

  const handleAdminNotesChange = (text: string) => {
    setAdminNotes(text);
  };

  const handleCustomerNotificationChange = (text: string) => {
    setCustomerNotification(text);
  };

  // Check permissions first
  if (!canUpdateBookings()) {
    return (
      <View style={styles.noPermissionContainer}>
        <Stack.Screen
          options={{
            title: 'Access Denied',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButtonHeader}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <AlertTriangle size={48} color={colors.warning} />
        <Text style={styles.noPermissionText}>
          You don't have permission to cancel bookings.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen
          options={{
            title: 'Loading...',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButtonHeader}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.errorContainer}>
        <Stack.Screen
          options={{
            title: 'Booking Not Found',
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButtonHeader}
              >
                <ArrowLeft size={24} color={colors.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={styles.errorTitle}>Booking Not Found</Text>
        <Text style={styles.errorMessage}>
          {error ||
            'The requested booking could not be found. It may have been cancelled or removed.'}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadBooking()}
        >
          <RefreshCw size={16} color='#FFFFFF' />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate refund amount based on percentage
  const refundAmount = (booking.total_fare || 0) * (refundPercentage / 100);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Cancel Booking #${booking.booking_number}`,
          headerShown: true,
          presentation: 'card',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButtonHeader}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        {/* Warning Header */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Trash2 size={32} color={colors.danger} />
            <Text style={styles.warningTitle}>Cancel Booking</Text>
            <Text style={styles.warningText}>
              This action will permanently cancel the booking and cannot be
              undone.
            </Text>
          </View>
        </View>

        {/* Booking Overview Card */}
        <View style={styles.overviewCard}>
          {/* Header */}
          <View style={styles.overviewHeader}>
            <View style={styles.overviewHeaderLeft}>
              <Text style={styles.bookingId}>
                Booking #{booking.booking_number}
              </Text>
              <View style={styles.routeInfo}>
                <MapPin size={16} color={colors.primary} />
                <Text style={styles.routeName}>
                  {booking.from_island_name || 'Unknown'} →{' '}
                  {booking.to_island_name || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {
                    formatDateTime(
                      booking.trip_travel_date || booking.created_at
                    ).split(' ')[0]
                  }
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Clock size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {booking.trip_departure_time || 'N/A'}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(booking.status)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(booking.status) },
                  ]}
                >
                  {booking.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <User size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {booking.passenger_count || 1} passenger(s)
                </Text>
              </View>
              <View style={styles.detailItem}>
                <CreditCard size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {formatCurrency(booking.total_fare || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>
                {formatCurrency(booking.total_fare || 0)}
              </Text>
              <Text style={styles.metricLabel}>Total Fare</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: colors.danger }]}>
                -{formatCurrency(refundAmount)}
              </Text>
              <Text style={styles.metricLabel}>Refund Amount</Text>
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <User size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>
              {booking.user_name || 'Customer Name'}
            </Text>
            <View style={styles.contactInfo}>
              {booking.user_email && (
                <View style={styles.contactRow}>
                  <Mail size={14} color={colors.textSecondary} />
                  <Text style={styles.contactText}>{booking.user_email}</Text>
                </View>
              )}
              {booking.user_mobile && (
                <View style={styles.contactRow}>
                  <Phone size={14} color={colors.textSecondary} />
                  <Text style={styles.contactText}>{booking.user_mobile}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Refund Configuration */}
        <View style={styles.refundCard}>
          <View style={styles.cardHeader}>
            <CreditCard size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Refund Configuration</Text>
          </View>

          <View style={styles.refundMethodContainer}>
            <Text style={styles.refundMethodLabel}>Refund Method</Text>
            <View style={styles.refundMethods}>
              <TouchableOpacity
                style={[
                  styles.refundMethodButton,
                  refundMethod === 'original_payment' &&
                    styles.refundMethodButtonActive,
                ]}
                onPress={() => setRefundMethod('original_payment')}
              >
                <Text
                  style={[
                    styles.refundMethodText,
                    refundMethod === 'original_payment' &&
                      styles.refundMethodTextActive,
                  ]}
                >
                  Original Payment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.refundMethodButton,
                  refundMethod === 'bank_transfer' &&
                    styles.refundMethodButtonActive,
                ]}
                onPress={() => setRefundMethod('bank_transfer')}
              >
                <Text
                  style={[
                    styles.refundMethodText,
                    refundMethod === 'bank_transfer' &&
                      styles.refundMethodTextActive,
                  ]}
                >
                  Bank Transfer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.refundMethodButton,
                  refundMethod === 'credit_note' &&
                    styles.refundMethodButtonActive,
                ]}
                onPress={() => setRefundMethod('credit_note')}
              >
                <Text
                  style={[
                    styles.refundMethodText,
                    refundMethod === 'credit_note' &&
                      styles.refundMethodTextActive,
                  ]}
                >
                  Credit Note
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bank Details (if bank transfer selected) */}
          {refundMethod === 'bank_transfer' && (
            <View style={styles.bankDetailsContainer}>
              <Text style={styles.bankDetailsTitle}>Bank Transfer Details</Text>

              <Input
                label='Account Number'
                placeholder='Enter bank account number'
                value={bankDetails.accountNumber}
                onChangeText={value =>
                  handleInputChange('accountNumber', value)
                }
                keyboardType='numeric'
                required
              />

              <Input
                label='Account Holder Name'
                placeholder='Enter account holder name'
                value={bankDetails.accountName}
                onChangeText={value => handleInputChange('accountName', value)}
                required
              />

              <Input
                label='Bank Name'
                placeholder='Enter bank name'
                value={bankDetails.bankName}
                onChangeText={value => handleInputChange('bankName', value)}
                required
              />

              {errors.bankDetails ? (
                <Text style={styles.errorText}>{errors.bankDetails}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.refundPercentageContainer}>
            <Text style={styles.refundPercentageLabel}>Refund Percentage</Text>
            <View style={styles.refundPercentageButtons}>
              <TouchableOpacity
                style={[
                  styles.percentageButton,
                  refundPercentage === 50 && styles.percentageButtonActive,
                ]}
                onPress={() => setRefundPercentage(50)}
              >
                <Text
                  style={[
                    styles.percentageButtonText,
                    refundPercentage === 50 &&
                      styles.percentageButtonTextActive,
                  ]}
                >
                  50%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.percentageButton,
                  refundPercentage === 75 && styles.percentageButtonActive,
                ]}
                onPress={() => setRefundPercentage(75)}
              >
                <Text
                  style={[
                    styles.percentageButtonText,
                    refundPercentage === 75 &&
                      styles.percentageButtonTextActive,
                  ]}
                >
                  75%
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.percentageButton,
                  refundPercentage === 100 && styles.percentageButtonActive,
                ]}
                onPress={() => setRefundPercentage(100)}
              >
                <Text
                  style={[
                    styles.percentageButtonText,
                    refundPercentage === 100 &&
                      styles.percentageButtonTextActive,
                  ]}
                >
                  100%
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.refundAmountRow}>
            <Text style={styles.refundAmountLabel}>Refund Amount:</Text>
            <Text style={styles.refundAmountValue}>
              {formatCurrency(refundAmount)}
            </Text>
          </View>
        </View>

        {/* Cancellation Details Form */}
        <View style={styles.formCard}>
          <View style={styles.cardHeader}>
            <AlertTriangle size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Cancellation Details</Text>
          </View>

          <View
            ref={ref => {
              if (inputRefs) inputRefs.current.reason = ref;
            }}
          >
            <Input
              label='Reason for Cancellation'
              placeholder='Please provide a detailed reason for cancellation'
              value={reason}
              onChangeText={handleReasonChange}
              onFocus={() => {
                setActiveInput('reason');
                scrollToInput('reason');
              }}
              multiline
              numberOfLines={3}
              error={errors.reason}
              required
            />
          </View>

          <View
            ref={ref => {
              if (inputRefs) inputRefs.current.adminNotes = ref;
            }}
          >
            <Input
              label='Admin Notes (Internal)'
              placeholder='Add any internal notes or special circumstances'
              value={adminNotes}
              onChangeText={handleAdminNotesChange}
              onFocus={() => {
                setActiveInput('adminNotes');
                scrollToInput('adminNotes');
              }}
              multiline
              numberOfLines={2}
            />
          </View>

          <View
            ref={ref => {
              if (inputRefs) inputRefs.current.customerNotification = ref;
            }}
          >
            <Input
              label='Customer Notification Message'
              placeholder='Optional custom message to send to customer'
              value={customerNotification}
              onChangeText={handleCustomerNotificationChange}
              onFocus={() => {
                setActiveInput('customerNotification');
                scrollToInput('customerNotification');
              }}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={18} color={colors.primary} />
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cancelButton,
              (isCancelling || !canUpdateBookings()) &&
                styles.cancelButtonDisabled,
            ]}
            onPress={handleCancel}
            disabled={isCancelling || !canUpdateBookings()}
          >
            {isCancelling ? (
              <ActivityIndicator size='small' color='#FFFFFF' />
            ) : (
              <Trash2 size={18} color='#FFFFFF' />
            )}
            <Text style={styles.cancelButtonText}>
              {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper function for status colors
const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return colors.success;
    case 'cancelled':
      return colors.danger;
    case 'completed':
      return colors.info;
    case 'pending_payment':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  noPermissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 64,
    gap: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  noPermissionText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    backgroundColor: colors.backgroundSecondary,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: 20,
    gap: 16,
  },
  backButtonHeader: {
    padding: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  warningHeader: {
    alignItems: 'center',
    gap: 12,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  warningText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  overviewHeaderLeft: {
    flex: 1,
  },
  bookingId: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${colors.border}30`,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  customerCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  customerInfo: {
    marginLeft: 28,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  refundCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  refundMethodContainer: {
    marginBottom: 16,
  },
  refundMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  refundMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  refundMethodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  refundMethodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  refundMethodText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  refundMethodTextActive: {
    color: '#FFFFFF',
  },
  bankDetailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  refundPercentageContainer: {
    marginBottom: 16,
  },
  refundPercentageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  refundPercentageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  percentageButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  percentageButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  percentageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  percentageButtonTextActive: {
    color: '#FFFFFF',
  },
  refundAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  refundAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  refundAmountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.danger,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
