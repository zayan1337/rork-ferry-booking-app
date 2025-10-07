import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import {
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Receipt,
  Eye,
  Download,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

interface PaymentDetail {
  id: string;
  booking_id: string;
  payment_method: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  receipt_number?: string;
  gateway_reference?: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  booking_number: string;
}

interface PaymentHistory {
  id: string;
  payment_id: string;
  status: string;
  amount: number;
  description: string;
  created_at: string;
  updated_by: string;
}

export default function PaymentDetailScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isTablet = screenWidth >= 768;

  useEffect(() => {
    fetchPaymentDetails();
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockPayment: PaymentDetail = {
        id: paymentId || '1',
        booking_id: 'booking_123',
        payment_method: 'bml',
        amount: 150.0,
        currency: 'MVR',
        status: 'completed',
        receipt_number: 'RCP-2024-001234',
        gateway_reference: 'BML-TXN-789456',
        created_at: '2024-01-20T14:45:00Z',
        updated_at: '2024-01-20T14:47:00Z',
        user_name: 'Ahmed Ali',
        user_email: 'ahmed.ali@example.com',
        booking_number: 'BK-2024-001234',
      };

      const mockHistory: PaymentHistory[] = [
        {
          id: '1',
          payment_id: paymentId || '1',
          status: 'pending',
          amount: 150.0,
          description: 'Payment initiated',
          created_at: '2024-01-20T14:45:00Z',
          updated_by: 'System',
        },
        {
          id: '2',
          payment_id: paymentId || '1',
          status: 'completed',
          amount: 150.0,
          description: 'Payment processed successfully',
          created_at: '2024-01-20T14:47:00Z',
          updated_by: 'BML Gateway',
        },
      ];

      setPayment(mockPayment);
      setHistory(mockHistory);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentDetails();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={colors.success} />;
      case 'pending':
        return <Clock size={20} color={colors.warning} />;
      case 'failed':
        return <XCircle size={20} color={colors.danger} />;
      case 'cancelled':
        return <AlertTriangle size={20} color={colors.danger} />;
      case 'refunded':
        return <Receipt size={20} color={colors.primary} />;
      default:
        return <Clock size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.danger;
      case 'cancelled':
        return colors.danger;
      case 'refunded':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const renderPaymentHeader = () => (
    <View style={styles.paymentHeader}>
      <View style={styles.paymentInfo}>
        <View style={styles.paymentIcon}>
          <CreditCard size={32} color={colors.primary} />
        </View>
        <View style={styles.paymentDetails}>
          <Text style={styles.paymentId}>Payment #{payment?.id}</Text>
          <Text style={styles.paymentMethod}>
            {payment?.payment_method.toUpperCase()}
          </Text>
          <View style={styles.paymentStatus}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(payment?.status || '') },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(payment?.status || '') },
              ]}
            >
              {payment?.status?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.paymentAmount}>
        <Text style={styles.amountLabel}>Payment Amount</Text>
        <Text style={styles.amountValue}>MVR {payment?.amount.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderPaymentDetails = () => (
    <View style={styles.detailsContainer}>
      <Text style={styles.detailsTitle}>Payment Information</Text>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Booking Number</Text>
          <Text style={styles.detailValue}>{payment?.booking_number}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Receipt Number</Text>
          <Text style={styles.detailValue}>{payment?.receipt_number}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Gateway Reference</Text>
          <Text style={styles.detailValue}>{payment?.gateway_reference}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Currency</Text>
          <Text style={styles.detailValue}>{payment?.currency}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Created At</Text>
          <Text style={styles.detailValue}>
            {new Date(payment?.created_at || '').toLocaleString()}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Updated At</Text>
          <Text style={styles.detailValue}>
            {new Date(payment?.updated_at || '').toLocaleString()}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderUserInfo = () => (
    <View style={styles.userContainer}>
      <Text style={styles.userTitle}>Customer Information</Text>

      <View style={styles.userInfo}>
        <View style={styles.userIcon}>
          <User size={20} color={colors.primary} />
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{payment?.user_name}</Text>
          <Text style={styles.userEmail}>{payment?.user_email}</Text>
        </View>
      </View>
    </View>
  );

  const renderHistoryItem = ({ item }: { item: PaymentHistory }) => (
    <View style={styles.historyItem}>
      <View
        style={[
          styles.historyIcon,
          { backgroundColor: getStatusColor(item.status) + '15' },
        ]}
      >
        {getStatusIcon(item.status)}
      </View>

      <View style={styles.historyContent}>
        <Text style={styles.historyDescription}>{item.description}</Text>
        <Text style={styles.historyTime}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
        <Text style={styles.historyUpdatedBy}>
          Updated by: {item.updated_by}
        </Text>
      </View>

      <View style={styles.historyAmount}>
        <Text style={styles.historyAmountText}>
          MVR {item.amount.toFixed(2)}
        </Text>
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.actionButton}>
        <Eye size={16} color={colors.primary} />
        <Text style={styles.actionButtonText}>View Receipt</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <Download size={16} color={colors.primary} />
        <Text style={styles.actionButtonText}>Download</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Payment Details',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Payment Header */}
        {renderPaymentHeader()}

        {/* Payment Details */}
        {renderPaymentDetails()}

        {/* User Information */}
        {renderUserInfo()}

        {/* Action Buttons */}
        {renderActionButtons()}

        {/* Payment History */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <Text style={styles.sectionSubtitle}>{history.length} events</Text>
          </View>

          <FlatList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // Payment Header
  paymentHeader: {
    backgroundColor: colors.background,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentId: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentAmount: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
  },

  // Details
  detailsContainer: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },

  // User Info
  userContainer: {
    backgroundColor: colors.background,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // History
  historySection: {
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  historyContent: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  historyUpdatedBy: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
} as any);
