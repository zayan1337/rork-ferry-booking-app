import { Alert } from 'react-native';
import type { PaymentMethod } from '@/types/pages/booking';

/**
 * Process payment based on the selected method
 * @param paymentMethod - Selected payment method
 * @param amount - Payment amount
 * @param bookingId - Booking ID for reference
 * @returns Promise that resolves when payment processing is complete
 */
export const processPayment = async (
  paymentMethod: PaymentMethod,
  amount: number,
  bookingId: string
): Promise<void> => {
  try {
    switch (paymentMethod) {
      case 'wallet':
      case 'bml':
      case 'mib':
      case 'ooredoo_m_faisa':
      case 'fahipay':
        return new Promise(resolve => {
          Alert.alert(
            'Payment Processing',
            'Please complete the payment using the selected payment method.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(),
              },
              {
                text: 'Pay Now',
                onPress: () => {
                  // Here you would integrate with actual payment gateway
                  Alert.alert(
                    'Payment Successful',
                    `Payment of MVR ${amount.toFixed(2)} has been processed successfully.`,
                    [{ text: 'OK', onPress: () => resolve() }]
                  );
                },
              },
            ]
          );
        });

      case 'bank_transfer':
        return new Promise(resolve => {
          Alert.alert(
            'Bank Transfer',
            'Please transfer the amount to our bank account. Details will be provided via SMS/Email.',
            [{ text: 'OK', onPress: () => resolve() }]
          );
        });

      default:
        throw new Error(`Unknown payment method: ${paymentMethod}`);
    }
  } catch (error) {
    console.error('Payment processing error:', error);
    throw new Error('Failed to process payment. Please try again.');
  }
};

/**
 * Calculate fare difference between old and new booking
 * @param currentFare - Current booking fare
 * @param newFare - New booking fare
 * @returns Fare difference (positive means additional payment needed)
 */
export const calculateFareDifference = (
  currentFare: number,
  newFare: number
): number => {
  return newFare - currentFare;
};

/**
 * Calculate refund amount based on cancellation policy
 * @param totalFare - Total booking fare
 * @param refundPercentage - Refund percentage (default 50%)
 * @returns Refund amount
 */
export const calculateRefundAmount = (
  totalFare: number,
  refundPercentage: number = 50
): number => {
  return totalFare * (refundPercentage / 100);
};

/**
 * Format payment method name for display
 * @param method - Payment method
 * @returns Formatted payment method name
 */
export const formatPaymentMethod = (method: PaymentMethod): string => {
  return method
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
