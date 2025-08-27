import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { X, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { createMibSession } from '@/utils/paymentUtils';

interface MibPaymentWebViewProps {
  visible: boolean;
  bookingDetails: {
    bookingNumber: string;
    route: string;
    travelDate: string;
    amount: number;
    currency: string;
    passengerCount: number;
  };
  bookingId: string;
  sessionData?: {
    sessionId: string;
    sessionUrl: string;
    redirectUrl: string;
  };
  onClose: () => void;
  onSuccess: (result: any) => void;
  onFailure: (error: string) => void;
  onCancel: () => void;
}

export default function MibPaymentWebView({
  visible,
  bookingDetails,
  bookingId,
  sessionData,
  onClose,
  onSuccess,
  onFailure,
  onCancel,
}: MibPaymentWebViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [currentSessionData, setCurrentSessionData] = useState(sessionData);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout when component unmounts or modal closes
  useEffect(() => {
    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
      }
    };
  }, []);

  // Set up payment timeout when payment page is shown
  useEffect(() => {
    if (showPaymentPage && currentSessionData) {
      // Set a 5-minute timeout for payment completion
      paymentTimeoutRef.current = setTimeout(
        () => {
          console.log('Payment timeout reached');
          onFailure('Payment timeout - please try again');
        },
        5 * 60 * 1000
      ); // 5 minutes

      return () => {
        if (paymentTimeoutRef.current) {
          clearTimeout(paymentTimeoutRef.current);
        }
      };
    }

    return () => {
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
      }
    };
  }, [showPaymentPage, currentSessionData]);

  // Handle payment completion detection
  useEffect(() => {
    if (showPaymentPage) {
      const originalWarn = console.warn;

      console.warn = (...args) => {
        const message = args.join(' ');

        console.log('⚠️ Console.warn intercepted:', {
          message,
          containsPaymentSuccess: message.includes(
            "Can't open url: rork-ferry://payment-success"
          ),
          timestamp: new Date().toISOString(),
        });

        if (message.includes("Can't open url: rork-ferry://payment-success")) {
          console.log(
            '🔗 Deep link payment success URL detected in console.warn'
          );

          try {
            // Extract the URL from the warning message
            const urlMatch = message.match(
              /rork-ferry:\/\/payment-success\?([^\s"']+)/
            );

            console.log('🔍 URL extraction attempt:', {
              urlMatch: urlMatch ? urlMatch[0] : null,
              fullMessage: message,
            });

            if (urlMatch) {
              const fullUrl = 'rork-ferry://payment-success?' + urlMatch[1];
              console.log('🔗 Reconstructed deep link URL:', fullUrl);

              const url = new URL(fullUrl);
              const result = url.searchParams.get('result');
              const bookingId = url.searchParams.get('bookingId');
              const sessionId =
                url.searchParams.get('session.id') ||
                currentSessionData?.sessionId ||
                url.searchParams.get('sessionVersion');

              console.log('📋 Deep link parameters extracted:', {
                result,
                bookingId,
                sessionId,
                currentSessionId: currentSessionData?.sessionId,
                allParams: Object.fromEntries(url.searchParams.entries()),
              });

              // Clear any existing timeout
              if (paymentTimeoutRef.current) {
                clearTimeout(paymentTimeoutRef.current);
              }

              const paymentResultData = {
                result: result || 'UNKNOWN',
                sessionId: sessionId,
                bookingId: bookingId,
                source: 'console_warn_deep_link',
                timestamp: new Date().toISOString(),
                originalMessage: message,
              };

              console.log(
                '📊 Payment Result from Deep Link:',
                paymentResultData
              );

              if (result === 'SUCCESS') {
                console.log(
                  '🎉 Payment SUCCESS detected via console.warn deep link'
                );
                onSuccess(paymentResultData);
              } else if (result === 'CANCELLED') {
                console.log(
                  '❌ Payment CANCELLED detected via console.warn deep link'
                );
                onCancel();
              } else if (result === 'FAILURE') {
                console.log(
                  '💥 Payment FAILURE detected via console.warn deep link'
                );
                onFailure('Payment failed');
              } else {
                console.log(
                  '❓ Unknown payment result via console.warn deep link:',
                  result
                );
              }
            }
          } catch (error) {
            console.error('❌ Error parsing deep link from console.warn:', {
              error: error instanceof Error ? error.message : 'Unknown error',
              message,
              stack: error instanceof Error ? error.stack : undefined,
            });

            // If we can't parse but we know it's a success, assume success
            if (message.includes('result=SUCCESS')) {
              console.log(
                '🎉 Fallback SUCCESS detection from console.warn message'
              );
              onSuccess({
                result: 'SUCCESS',
                sessionId: currentSessionData?.sessionId,
                source: 'console_warn_fallback',
                timestamp: new Date().toISOString(),
                originalMessage: message,
              });
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
  }, [showPaymentPage, currentSessionData, onSuccess, onCancel, onFailure]);

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
              
              <div class="summary-row">
                <span class="summary-label">Booking Number:</span>
                <span class="summary-value">${bookingDetails.bookingNumber}</span>
              </div>
              
              <div class="summary-row">
                <span class="summary-label">Route:</span>
                <span class="summary-value">${bookingDetails.route}</span>
              </div>
              
              <div class="summary-row">
                <span class="summary-label">Travel Date:</span>
                <span class="summary-value">${formatDate(bookingDetails.travelDate)}</span>
              </div>
              
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
    console.log('🌐 MIB WebView Navigation State Change:', {
      url: navState.url,
      title: navState.title,
      loading: navState.loading,
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      timestamp: new Date().toISOString(),
    });

    // Check for MIB gateway URLs with result parameters
    if (navState.url.includes('gateway.mastercard.com')) {
      console.log('🏦 MIB Gateway URL detected:', navState.url);

      try {
        const url = new URL(navState.url);
        const result = url.searchParams.get('result');
        const sessionId = url.searchParams.get('session.id');
        const resultIndicator = url.searchParams.get('resultIndicator');
        const orderId = url.searchParams.get('orderId');
        const transactionId = url.searchParams.get('transactionId');

        console.log('💳 MIB Payment Response Parameters:', {
          result,
          sessionId,
          resultIndicator,
          orderId,
          transactionId,
          allParams: Object.fromEntries(url.searchParams.entries()),
          currentSessionId: currentSessionData?.sessionId,
          bookingId: bookingId,
        });

        // Check for result parameters
        if (result) {
          console.log(`✅ MIB Payment Result Found: ${result}`);

          // Clear any existing timeout
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
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

          console.log('📊 Final Payment Result Data:', paymentResultData);

          if (result === 'SUCCESS') {
            console.log('🎉 Payment SUCCESS - calling onSuccess callback');
            onSuccess(paymentResultData);
          } else if (result === 'CANCELLED') {
            console.log('❌ Payment CANCELLED - calling onCancel callback');
            onCancel();
          } else if (result === 'FAILURE') {
            console.log('💥 Payment FAILURE - calling onFailure callback');
            onFailure('Payment failed');
          }
          return;
        }

        // Check for resultIndicator (alternative parameter name)
        if (resultIndicator) {
          console.log(`🔍 MIB Result Indicator Found: ${resultIndicator}`);

          // Clear any existing timeout
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
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

          console.log(
            '📊 Final Payment Result Data (via resultIndicator):',
            paymentResultData
          );

          if (resultIndicator === 'SUCCESS') {
            console.log(
              '🎉 Payment SUCCESS (via resultIndicator) - calling onSuccess callback'
            );
            onSuccess(paymentResultData);
          } else if (resultIndicator === 'CANCELLED') {
            console.log(
              '❌ Payment CANCELLED (via resultIndicator) - calling onCancel callback'
            );
            onCancel();
          } else if (resultIndicator === 'FAILURE') {
            console.log(
              '💥 Payment FAILURE (via resultIndicator) - calling onFailure callback'
            );
            onFailure('Payment failed');
          }
          return;
        }
      } catch (error) {
        console.error('❌ Error processing MIB gateway URL:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          url: navState.url,
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }

    // Check for specific MIB completion pages
    if (navState.url.includes('gateway.mastercard.com/checkout/complete')) {
      console.log('✅ MIB completion page detected');

      // Clear any existing timeout
      if (paymentTimeoutRef.current) {
        clearTimeout(paymentTimeoutRef.current);
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

      console.log('📨 WebView Message Received:', {
        type: data.type,
        data: data,
        timestamp: new Date().toISOString(),
      });

      switch (data.type) {
        case 'PROCEED_TO_PAYMENT':
          console.log('▶️ Proceeding to MIB payment...');
          await handleProceedToPayment();
          break;

        case 'CANCEL_PAYMENT':
          console.log('❌ Payment cancelled by user');
          onCancel();
          break;

        case 'PAYMENT_ERROR':
          console.error('💥 Payment error received:', {
            error: data.error,
            timestamp: new Date().toISOString(),
          });

          // Clear any existing timeout
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
          }
          onFailure(data.error || 'Payment failed');
          break;

        case 'PAYMENT_RESULT':
          console.log('📊 Payment result received from WebView:', {
            result: data.result,
            sessionId: data.sessionId,
            resultIndicator: data.resultIndicator,
            timestamp: new Date().toISOString(),
          });

          // Clear any existing timeout
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
          }

          const paymentResultData = {
            result: data.result,
            sessionId: data.sessionId,
            resultIndicator: data.resultIndicator,
            source: 'webview_message',
            timestamp: new Date().toISOString(),
          };

          if (data.result === 'SUCCESS') {
            console.log('🎉 Payment SUCCESS from WebView message');
            onSuccess(paymentResultData);
          } else if (data.result === 'CANCELLED') {
            console.log('❌ Payment CANCELLED from WebView message');
            onCancel();
          } else if (data.result === 'FAILURE') {
            console.log('💥 Payment FAILURE from WebView message');
            onFailure('Payment failed');
          }
          break;

        default:
          console.log('❓ Unknown WebView message type:', data.type);
      }
    } catch (error) {
      console.error('❌ Error processing WebView message:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        rawData: event.nativeEvent.data,
        stack: error instanceof Error ? error.stack : undefined,
      });
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

    // Check if the error is related to our payment success URL
    if (
      nativeEvent.description &&
      nativeEvent.description.includes('rork-ferry://payment-success')
    ) {
      try {
        // Extract the URL from the error description
        const urlMatch = nativeEvent.description.match(
          /rork-ferry:\/\/payment-success\?([^\s"']+)/
        );
        if (urlMatch) {
          const fullUrl = 'rork-ferry://payment-success?' + urlMatch[1];
          const url = new URL(fullUrl);
          const result = url.searchParams.get('result');
          const bookingId = url.searchParams.get('bookingId');
          const sessionId =
            url.searchParams.get('sessionVersion') ||
            currentSessionData?.sessionId;

          // Clear any existing timeout
          if (paymentTimeoutRef.current) {
            clearTimeout(paymentTimeoutRef.current);
          }

          if (result === 'SUCCESS') {
            onSuccess({
              result: 'SUCCESS',
              sessionId: sessionId,
              bookingId: bookingId,
              source: 'error_handler_success',
              timestamp: new Date().toISOString(),
            });
            return; // Don't call onFailure
          } else if (result === 'CANCELLED') {
            onCancel();
            return; // Don't call onFailure
          } else if (result === 'FAILURE') {
            onFailure('Payment failed');
            return;
          }
        }
      } catch (error) {
        // If we can't parse but we know it's a success, assume success
        if (nativeEvent.description.includes('result=SUCCESS')) {
          onSuccess({
            result: 'SUCCESS',
            sessionId: currentSessionData?.sessionId,
            bookingId: bookingId,
            source: 'error_handler_fallback',
            timestamp: new Date().toISOString(),
          });
          return; // Don't call onFailure
        }
      }
    }

    // Only call onFailure if it's not a payment success URL error
    onFailure('Failed to load payment page');
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
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment?',
      [
        {
          text: 'Continue Payment',
          style: 'cancel',
        },
        {
          text: 'Cancel Payment',
          style: 'destructive',
          onPress: onCancel,
        },
      ]
    );
  };

  const handleCheckoutCancel = () => {
    setShowPaymentPage(false);
    setIsLoading(true);
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {showPaymentPage && (
            <TouchableOpacity
              onPress={() => setShowPaymentPage(false)}
              style={styles.backButton}
            >
              <ArrowLeft size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>
            {showPaymentPage ? 'MIB Payment' : 'Payment Summary'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
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
          onShouldStartLoadWithRequest={request => {
            // Allow navigation to MIB payment URLs
            if (
              request.url.includes('gateway.mastercard.com') ||
              request.url.includes('rork-ferry://') ||
              request.url.includes('payment-success') ||
              request.url.startsWith('data:') ||
              request.url.startsWith('about:') ||
              request.url.startsWith('http://') ||
              request.url.startsWith('https://')
            ) {
              return true;
            }
            return true;
          }}
          userAgent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        />
      </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
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
