import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { X, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import {
  createMibSession,
  releaseSeatReservations,
  cancelBookingOnPaymentCancellation,
} from '@/utils/paymentUtils';
import { useAlertContext } from '@/components/AlertProvider';
import { getMinutesUntilDeparture } from '@/utils/bookingUtils';
import { BUFFER_MINUTES_PAYMENT_WINDOW } from '@/constants/customer';
import { config } from '@/utils/config';

// Custom URL scheme for payment callbacks
const PAYMENT_RETURN_SCHEME = config.MIB_RETURN_URL;

interface MibPaymentWebViewProps {
  visible: boolean;
  bookingDetails: {
    bookingNumber: string;
    route: string;
    travelDate: string;
    returnDate?: string | null;
    amount: number;
    currency: string;
    passengerCount: number;
    receiptNumber?: string | null;
    isRoundTrip?: boolean;
  };
  bookingId: string;
  tripInfo?: {
    travelDate: string;
    departureTime: string;
  };
  sessionData?: {
    sessionId: string;
    sessionUrl: string;
    redirectUrl: string;
  };
  onClose: () => void;
  onSuccess: (result: any) => void;
  onFailure: (error: string) => void;
  onCancel: () => void;
  onSessionCreated?: (session: {
    sessionId: string;
    sessionUrl: string;
    redirectUrl: string;
  }) => void;
  onTimerExpired?: () => void;
}

export default function MibPaymentWebView({
  visible,
  bookingDetails,
  bookingId,
  tripInfo,
  sessionData,
  onClose,
  onSuccess,
  onFailure,
  onCancel,
  onSessionCreated,
  onTimerExpired,
}: MibPaymentWebViewProps) {
  const { showConfirmation } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(!!sessionData);
  const [currentSessionData, setCurrentSessionData] = useState(sessionData);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(
    BUFFER_MINUTES_PAYMENT_WINDOW * 60
  ); // Payment window in seconds
  const webViewRef = useRef<WebView>(null);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const handleDeepLinkUrl = useCallback(
    (url: string, source: string) => {
      try {
        const processedUrl = url.includes('?') ? url : `${url}?`;
        const parsedUrl = new URL(processedUrl);
        const resultParam = parsedUrl.searchParams.get('result');
        const bookingIdParam =
          parsedUrl.searchParams.get('bookingId') || bookingId;
        const sessionIdParam =
          parsedUrl.searchParams.get('session.id') ||
          parsedUrl.searchParams.get('sessionVersion') ||
          currentSessionData?.sessionId;

        if (!resultParam) {
          return false;
        }

        if (paymentTimeoutRef.current) {
          clearTimeout(paymentTimeoutRef.current);
          paymentTimeoutRef.current = null;
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        if (resultParam === 'SUCCESS') {
          onSuccess({
            result: 'SUCCESS',
            sessionId: sessionIdParam,
            bookingId: bookingIdParam,
            source,
            timestamp: new Date().toISOString(),
          });
        } else if (resultParam === 'CANCELLED') {
          onCancel();
        } else if (resultParam === 'FAILURE') {
          onFailure('Payment failed');
        }
        return true;
      } catch (error) {
        return false;
      }
    },
    [bookingId, currentSessionData?.sessionId, onCancel, onFailure, onSuccess]
  );

  // Auto-show payment page when sessionData is provided
  useEffect(() => {
    if (sessionData && sessionData.sessionId && sessionData.redirectUrl) {
      setCurrentSessionData(sessionData);
      setShowPaymentPage(true);
      setIsLoading(false);
    }
  }, [sessionData, visible]);

  // Clear timeout and interval when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, []);

  // Set up payment timeout and countdown timer when payment page is shown
  useEffect(() => {
    if (showPaymentPage && currentSessionData) {
      // Calculate time until departure if trip info is available
      let maxTimerSeconds = BUFFER_MINUTES_PAYMENT_WINDOW * 60; // Default payment window

      if (tripInfo?.travelDate && tripInfo?.departureTime) {
        const minutesUntilDeparture = getMinutesUntilDeparture(
          tripInfo.travelDate,
          tripInfo.departureTime
        );

        // If trip has already departed or is departing very soon, use departure time
        if (minutesUntilDeparture > 0) {
          // Use the minimum of payment window or time until departure
          // But ensure at least 30 seconds for user to see the warning
          maxTimerSeconds = Math.max(
            30,
            Math.min(
              BUFFER_MINUTES_PAYMENT_WINDOW * 60,
              minutesUntilDeparture * 60
            )
          );
        } else {
          // Trip has already departed, cancel immediately
          maxTimerSeconds = 0;
        }
      }

      // If timer is 0 or negative, cancel immediately
      if (maxTimerSeconds <= 0) {
        onCancel();
        return;
      }

      // Reset timer to calculated value
      setTimeRemaining(maxTimerSeconds);

      // Set timeout for payment completion
      paymentTimeoutRef.current = setTimeout(() => {
        // Clear countdown interval
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        // Cancel booking and close modal
        onTimerExpired?.();
        onCancel();
      }, maxTimerSeconds * 1000);

      // Start countdown timer
      countdownIntervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (paymentTimeoutRef.current) {
          clearTimeout(paymentTimeoutRef.current);
          paymentTimeoutRef.current = null;
        }
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      };
    } else {
      // Reset timer when payment page is not shown
      setTimeRemaining(BUFFER_MINUTES_PAYMENT_WINDOW * 60);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [showPaymentPage, currentSessionData, tripInfo, onCancel]);

  // Handle payment completion detection via Linking (for iOS deep link handling)
  useEffect(() => {
    if (!showPaymentPage) return;

    // iOS-specific: Listen for deep links that might escape the WebView
    const handleLinkingUrl = ({ url }: { url: string }) => {
      if (url.startsWith(PAYMENT_RETURN_SCHEME.split('?')[0])) {
        handleDeepLinkUrl(url, 'linking_listener');
      }
    };

    const subscription = Linking.addEventListener('url', handleLinkingUrl);

    // Also check if there's a pending URL (edge case)
    Linking.getInitialURL().then(url => {
      if (url && url.startsWith(PAYMENT_RETURN_SCHEME.split('?')[0])) {
        handleDeepLinkUrl(url, 'initial_url');
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [showPaymentPage, handleDeepLinkUrl]);

  // Handle payment completion detection via console.warn interception
  useEffect(() => {
    if (showPaymentPage) {
      const originalWarn = console.warn;

      console.warn = (...args) => {
        const message = args.join(' ');

        if (
          message.includes(`Can't open url: ${PAYMENT_RETURN_SCHEME}`) ||
          message.includes('crystaltransfervaavu://payment-success')
        ) {
          try {
            // Extract the URL from the warning message
            const urlMatch = message.match(
              /crystaltransfervaavu:\/\/payment-success\?([^\s"']+)/
            );

            if (urlMatch) {
              const fullUrl = `${PAYMENT_RETURN_SCHEME}?` + urlMatch[1];

              if (
                handleDeepLinkUrl(fullUrl, 'console_warn_deep_link') === false
              ) {
                // no-op, allow default handling
              }
            }
          } catch (error) {
            // If we can't parse but we know it's a success, assume success
            if (message.includes('result=SUCCESS')) {
              handleDeepLinkUrl(
                `${PAYMENT_RETURN_SCHEME}?result=SUCCESS&bookingId=${bookingId}`,
                'console_warn_fallback'
              );
            }
          }
        }

        // Call original warn
        originalWarn.apply(console, args);
      };

      return () => {
        console.warn = originalWarn;
      };
    }
  }, [
    showPaymentPage,
    currentSessionData,
    onSuccess,
    onCancel,
    onFailure,
    bookingId,
    handleDeepLinkUrl,
  ]);

  const createPaymentSummaryHTML = () => {
    const formatCurrency = (amount: number, currency: string = 'MVR') => {
      return `${currency} ${amount.toFixed(2)}`;
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>MIB Payment</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: ${Colors.background};
              color: ${Colors.text};
              line-height: 1.6;
              padding: 16px;
            }
            
            .container {
              max-width: 600px;
              margin: 0 auto;
            }
            
            .header {
              text-align: center;
              margin-bottom: 24px;
            }
            
            .header h1 {
              color: ${Colors.text};
              margin-bottom: 8px;
              font-size: 20px;
              font-weight: 700;
            }
            
            .header p {
              color: ${Colors.textSecondary};
              font-size: 14px;
            }
            
            .booking-summary {
              background: ${Colors.card};
              border-radius: 12px;
              padding: 16px;
              margin-bottom: 16px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border: 1px solid ${Colors.border};
            }
            
            .summary-title {
              font-size: 16px;
              font-weight: 700;
              color: ${Colors.text};
              margin-bottom: 16px;
              padding-bottom: 8px;
              border-bottom: 1px solid ${Colors.border};
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              padding: 4px 0;
            }
            
            .summary-label {
              font-weight: 500;
              color: ${Colors.textSecondary};
              font-size: 14px;
            }
            
            .summary-value {
              font-weight: 600;
              color: ${Colors.text};
              text-align: right;
              font-size: 14px;
              max-width: 60%;
            }
            
            .total-row {
              border-top: 1px solid ${Colors.border};
              padding-top: 12px;
              margin-top: 12px;
            }
            
            .total-value {
              color: ${Colors.primary};
              font-size: 18px;
              font-weight: 700;
            }
            
            .security-note {
              background: ${Colors.highlight};
              border: 1px solid ${Colors.primary};
              border-radius: 8px;
              padding: 12px;
              margin: 16px 0;
              font-size: 12px;
              color: ${Colors.text};
              text-align: center;
            }
            
            .button-container {
              margin-top: 24px;
            }
            
            .payment-button {
              background: ${Colors.primary};
              color: white;
              border: none;
              padding: 14px 20px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
              margin-bottom: 12px;
              transition: all 0.2s ease;
            }
            
            .payment-button:hover {
              opacity: 0.9;
            }
            
            .payment-button:disabled {
              background: ${Colors.inactive};
              cursor: not-allowed;
            }
            
            .cancel-button {
              background: transparent;
              color: ${Colors.primary};
              border: 1px solid ${Colors.primary};
              padding: 10px 16px;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              width: 100%;
            }
            
            .cancel-button:hover {
              background: ${Colors.highlight};
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>MIB Payment Gateway</h1>
              <p>Complete your booking payment securely</p>
            </div>
            
            <div class="booking-summary">
              <div class="summary-title">Booking Summary</div>
              
              ${
                bookingDetails.receiptNumber
                  ? `
              <div class="summary-row">
                <span class="summary-label">Receipt Number:</span>
                <span class="summary-value">${bookingDetails.receiptNumber}</span>
              </div>
              `
                  : ''
              }
              
              <div class="summary-row">
                <span class="summary-label">${bookingDetails.isRoundTrip ? 'Booking Numbers:' : 'Booking Number:'}</span>
                <span class="summary-value">${bookingDetails.bookingNumber}</span>
              </div>
              
              <div class="summary-row">
                <span class="summary-label">${bookingDetails.isRoundTrip ? 'Routes:' : 'Route:'}</span>
                <span class="summary-value">${bookingDetails.route}</span>
              </div>
              
              <div class="summary-row">
                <span class="summary-label">${bookingDetails.isRoundTrip ? 'Departure Date:' : 'Travel Date:'}</span>
                <span class="summary-value">${formatDate(bookingDetails.travelDate)}</span>
              </div>
              
              ${
                bookingDetails.isRoundTrip && bookingDetails.returnDate
                  ? `
              <div class="summary-row">
                <span class="summary-label">Return Date:</span>
                <span class="summary-value">${formatDate(bookingDetails.returnDate)}</span>
              </div>
              `
                  : ''
              }
              
              <div class="summary-row">
                <span class="summary-label">Passengers:</span>
                <span class="summary-value">${bookingDetails.passengerCount}</span>
              </div>
              
              <div class="summary-row total-row">
                <span class="summary-label">Total Amount:</span>
                <span class="summary-value total-value">${formatCurrency(bookingDetails.amount, bookingDetails.currency)}</span>
              </div>
            </div>
            
            <div class="security-note">
              🔒 <strong>Secure Payment:</strong> Your payment is secured by MIB (Maldives Islamic Bank) and protected by Mastercard SecureCode.
            </div>
            
            <div class="button-container">
              <button class="payment-button" onclick="initiatePayment()">
                Proceed to Payment
              </button>
              
              <button class="cancel-button" onclick="cancelPayment()">
                Cancel Payment
              </button>
            </div>
          </div>
          
          <script>
            function initiatePayment() {
              const button = document.querySelector('.payment-button');
              button.disabled = true;
              button.textContent = 'Processing...';
              
              // Send message to React Native to proceed to payment
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PROCEED_TO_PAYMENT'
              }));
            }
            
            function cancelPayment() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'CANCEL_PAYMENT'
              }));
            }
          </script>
        </body>
      </html>
    `;
  };

  const createCheckoutHTML = () => {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>MIB Payment</title>
        </head>
        <body>
          <script>
            // MIB Payment Configuration
            const sessionData = ${JSON.stringify(currentSessionData)};
            
            // Initialize immediate payment redirect
            window.addEventListener('load', function() {
              if (sessionData && sessionData.sessionId && sessionData.redirectUrl) {
                // Direct redirect to MIB checkout page without delay
                window.location.href = sessionData.redirectUrl;
              } else {
                // Send error back to React Native if session data is not available
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'PAYMENT_ERROR',
                  error: 'Payment session not available'
                }));
              }
            });
            
            // Check for return from payment page
            const urlParams = new URLSearchParams(window.location.search);
            const result = urlParams.get('result');
            const sessionId = urlParams.get('session.id');
            const resultIndicator = urlParams.get('resultIndicator');
            
            if (result && sessionId) {
              // Send result back to React Native
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'PAYMENT_RESULT',
                result: result,
                sessionId: sessionId,
                resultIndicator: resultIndicator
              }));
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // Check for MIB gateway URLs with result parameters
    if (navState.url.includes('gateway.mastercard.com')) {
      try {
        const url = new URL(navState.url);
        const result = url.searchParams.get('result');
        const sessionId = url.searchParams.get('session.id');
        const resultIndicator = url.searchParams.get('resultIndicator');
        const orderId = url.searchParams.get('orderId');
        const transactionId = url.searchParams.get('transactionId');

        // Check for result parameters
        if (result) {
          // Clear any existing timeout and interval
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
            paymentTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          const paymentResultData = {
            result: result,
            sessionId: sessionId || currentSessionData?.sessionId,
            resultIndicator: resultIndicator,
            orderId: orderId,
            transactionId: transactionId,
            bookingId: bookingId,
            source: 'navigation_state_change',
            timestamp: new Date().toISOString(),
          };

          if (result === 'SUCCESS') {
            onSuccess(paymentResultData);
          } else if (result === 'CANCELLED') {
            onCancel();
          } else if (result === 'FAILURE') {
            onFailure('Payment failed');
          }
          return;
        }

        // Check for resultIndicator (alternative parameter name)
        if (resultIndicator) {
          // Clear any existing timeout and interval
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
            paymentTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          const paymentResultData = {
            result: resultIndicator,
            sessionId: sessionId || currentSessionData?.sessionId,
            resultIndicator: resultIndicator,
            orderId: orderId,
            transactionId: transactionId,
            bookingId: bookingId,
            timestamp: new Date().toISOString(),
          };

          if (resultIndicator === 'SUCCESS') {
            onSuccess(paymentResultData);
          } else if (resultIndicator === 'CANCELLED') {
            onCancel();
          } else if (resultIndicator === 'FAILURE') {
            onFailure('Payment failed');
          }
          return;
        }
      } catch (error) {
        // Silent error handling
      }
    }

    // Check for specific MIB completion pages
    if (navState.url.includes('gateway.mastercard.com/checkout/complete')) {
      // Clear any existing timeout and interval
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
        paymentTimeoutRef.current = null;
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      // Assume success since we're on completion page
      onSuccess({
        result: 'SUCCESS',
        sessionId: currentSessionData?.sessionId,
        bookingId: bookingId,
        source: 'completion_page',
        timestamp: new Date().toISOString(),
      });
    }

    // Check for MIB error pages
    if (navState.url.includes('gateway.mastercard.com/checkout/error')) {
      onFailure('Payment failed');
    }

    // Check for MIB cancel pages
    if (navState.url.includes('gateway.mastercard.com/checkout/cancel')) {
      onCancel();
    }

    // Hide loading when page is loaded
    if (navState.loading === false) {
      setIsLoading(false);
    }
  };

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'PROCEED_TO_PAYMENT':
          await handleProceedToPayment();
          break;

        case 'CANCEL_PAYMENT':
          onCancel();
          break;

        case 'PAYMENT_ERROR':
          // Clear any existing timeout and interval
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
            paymentTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          onFailure(data.error || 'Payment failed');
          break;

        case 'PAYMENT_RESULT':
          // Clear any existing timeout and interval
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
            paymentTimeoutRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          const paymentResultData = {
            result: data.result,
            sessionId: data.sessionId,
            resultIndicator: data.resultIndicator,
            source: 'webview_message',
            timestamp: new Date().toISOString(),
          };

          if (data.result === 'SUCCESS') {
            onSuccess(paymentResultData);
          } else if (data.result === 'CANCELLED') {
            onCancel();
          } else if (data.result === 'FAILURE') {
            onFailure('Payment failed');
          }
          break;

        default:
          break;
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const handleProceedToPayment = async () => {
    try {
      setIsLoading(true);

      // Create MIB session with booking details
      const sessionData = await createMibSession({
        bookingId: bookingId,
        amount: bookingDetails.amount,
        currency: bookingDetails.currency,
        bookingNumber: bookingDetails.bookingNumber,
        route: bookingDetails.route,
        travelDate: bookingDetails.travelDate,
        passengerCount: bookingDetails.passengerCount,
      });

      // Update current session data
      setCurrentSessionData({
        sessionId: sessionData.sessionId,
        sessionUrl: sessionData.sessionUrl,
        redirectUrl: sessionData.redirectUrl,
      });
      onSessionCreated?.({
        sessionId: sessionData.sessionId,
        sessionUrl: sessionData.sessionUrl,
        redirectUrl: sessionData.redirectUrl,
      });

      // Show MIB payment page within the WebView
      setShowPaymentPage(true);
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      onFailure(error.message || 'Failed to create payment session');
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;

    // Check if the error is related to our payment success URL (custom scheme)
    const errorDesc = nativeEvent.description || nativeEvent.message || '';

    if (
      errorDesc.includes('crystaltransfervaavu://') ||
      errorDesc.includes(PAYMENT_RETURN_SCHEME)
    ) {
      try {
        // Extract the URL from the error description
        const urlMatch = errorDesc.match(
          /crystaltransfervaavu:\/\/payment-success\?([^\s"']+)/
        );
        if (urlMatch) {
          const fullUrl =
            `crystaltransfervaavu://payment-success?` + urlMatch[1];
          if (handleDeepLinkUrl(fullUrl, 'error_handler_success')) {
            return; // handled, skip onFailure
          }
        }
      } catch (error) {
        // If we can't parse but we know it's a success, assume success
        if (errorDesc.includes('result=SUCCESS')) {
          handleDeepLinkUrl(
            `crystaltransfervaavu://payment-success?result=SUCCESS&bookingId=${bookingId}`,
            'error_handler_fallback'
          );
          return; // Don't call onFailure
        }
      }
      // If it's a custom scheme error but we couldn't extract params, don't fail
      // This might be an iOS-specific behavior where the scheme redirect is treated as an error
      return;
    }

    // Only call onFailure if it's not a payment success URL error
    onFailure('Failed to load payment page');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleLoadStart = () => {
    if (showPaymentPage) {
      setIsLoading(true);
    }
  };

  const handleClose = () => {
    showConfirmation(
      'Cancel Payment',
      'Are you sure you want to cancel this payment? Your seats will be released.',
      async () => {
        // Cancel booking and create cancellation record when user cancels payment
        try {
          await cancelBookingOnPaymentCancellation(
            bookingId,
            'Payment cancelled by user'
          );
        } catch (error) {
          console.warn(
            'Failed to cancel booking on payment cancellation:',
            error
          );
          // Fallback to just releasing seats
          try {
            await releaseSeatReservations(bookingId);
          } catch (seatError) {
            console.warn(
              'Failed to release seats on payment cancellation:',
              seatError
            );
          }
        }
        onCancel();
      },
      () => {
        // User chose to continue payment - do nothing
      },
      true // Mark as destructive action
    );
  };

  const handleCheckoutCancel = () => {
    setShowPaymentPage(false);
    setIsLoading(true);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType='slide'
      {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
      onRequestClose={handleClose}
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {showPaymentPage && (
            <Pressable
              onPress={() => {
                setShowPaymentPage(false);
              }}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={Colors.primary} />
            </Pressable>
          )}
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {showPaymentPage ? 'MIB Payment' : 'Payment Summary'}
            </Text>
            {showPaymentPage && timeRemaining > 0 && (
              <View style={styles.timerContainer}>
                <Text style={styles.timerLabel}>Time remaining:</Text>
                <Text
                  style={[
                    styles.timerText,
                    timeRemaining <= 60 && styles.timerTextWarning,
                  ]}
                >
                  {formatTime(timeRemaining)}
                </Text>
              </View>
            )}
          </View>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={20} color={Colors.textSecondary} />
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={Colors.primary} />
            <Text style={styles.loadingText}>
              {showPaymentPage
                ? 'Loading MIB payment page...'
                : 'Creating payment session...'}
            </Text>
          </View>
        )}

        {isProcessingPayment && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size='large' color={Colors.success} />
            <Text style={styles.loadingText}>
              Processing payment completion...
            </Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={
            showPaymentPage && currentSessionData
              ? { html: createCheckoutHTML() }
              : { html: createPaymentSummaryHTML() }
          }
          key={
            showPaymentPage && currentSessionData
              ? `checkout-${currentSessionData.sessionId}`
              : 'summary'
          }
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onError={handleError}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          // Critical for iOS: Include custom scheme in origin whitelist
          originWhitelist={[
            'https://*',
            'http://*',
            'crystaltransfervaavu://*',
            'about:*',
            'data:*',
          ]}
          onShouldStartLoadWithRequest={request => {
            // Check for custom scheme URL (payment callback)
            if (request.url.startsWith('crystaltransfervaavu://')) {
              // Handle the deep link and prevent WebView from loading it
              handleDeepLinkUrl(request.url, 'should_start_load');
              // Return false to prevent WebView from trying to load the custom scheme
              return false;
            }

            // Allow MIB gateway URLs
            if (request.url.includes('gateway.mastercard.com')) {
              return true;
            }

            // Allow standard HTTP/HTTPS URLs
            if (
              request.url.startsWith('http://') ||
              request.url.startsWith('https://')
            ) {
              return true;
            }

            // Allow about: and data: URLs (for initial HTML content)
            if (
              request.url.startsWith('about:') ||
              request.url.startsWith('data:')
            ) {
              return true;
            }

            // Block any other unknown schemes on iOS to prevent issues
            if (Platform.OS === 'ios') {
              return false;
            }

            return true;
          }}
          // iOS-specific: Handle navigation errors for custom schemes
          onHttpError={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            // Some iOS versions report custom scheme navigation as HTTP error
            if (nativeEvent.url?.startsWith('crystaltransfervaavu://')) {
              handleDeepLinkUrl(nativeEvent.url, 'http_error_handler');
            }
          }}
          userAgent={
            Platform.OS === 'ios'
              ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
              : 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Mobile Safari/537.36'
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
    minHeight: 56,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timerLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  timerTextWarning: {
    color: Colors.error,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
