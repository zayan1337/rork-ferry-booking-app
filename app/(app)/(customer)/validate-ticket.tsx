import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { CheckCircle, XCircle, X } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTicketStore } from '@/store/ticketStore';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import type { ValidationResult } from '@/types/pages/booking';
import { formatSimpleDate } from '@/utils/dateUtils';

const { width } = Dimensions.get('window');

export default function ValidateTicketScreen() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const { validateTicket, isLoading, error } = useTicketStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const getCameraPermissions = async () => {
      if (!permission?.granted && showCamera) {
        const { status } = await requestPermission();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Camera permission is required to scan QR codes'
          );
          setShowCamera(false);
        }
      }
    };

    getCameraPermissions();
  }, [permission, showCamera, requestPermission]);

  const handleValidate = async () => {
    if (!bookingNumber.trim()) {
      Alert.alert('Error', 'Please enter a booking number');
      return;
    }

    setIsValidating(true);

    try {
      const result = await validateTicket(bookingNumber.trim().toUpperCase());
      setValidationResult(result);

      if (error) {
        Alert.alert('Error', error);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to validate ticket. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleScanQR = () => {
    if (!permission?.granted) {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to scan QR codes',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Grant Permission', onPress: requestPermission },
        ]
      );
      return;
    }

    setShowCamera(true);
    setScanned(false);
    setValidationResult(null);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setShowCamera(false);

    try {
      let bookingNum = '';

      // Try to parse different QR code formats
      try {
        // First try to parse as JSON (legacy format)
        const qrData = JSON.parse(data);
        bookingNum = qrData.bookingNumber || qrData.booking_number || '';
      } catch (parseError) {
        // Check if data is a QR server URL (new format)
        if (data.includes('qrserver.com') && data.includes('data=')) {
          // Extract the data parameter from the URL
          const urlMatch = data.match(/data=([^&]+)/);
          if (urlMatch && urlMatch[1]) {
            // URL decode the data parameter
            const decodedData = decodeURIComponent(urlMatch[1]);

            // Now extract booking number from decoded data
            if (
              decodedData.includes('Booking:') ||
              decodedData.includes('Booking ')
            ) {
              const bookingMatch = decodedData.match(
                /Booking[:\s]+([A-Z0-9]+)/i
              );
              if (bookingMatch && bookingMatch[1]) {
                bookingNum = bookingMatch[1];
              }
            }
          }
        } else if (data.includes('Booking:') || data.includes('Booking ')) {
          // Direct format: "Booking: {booking_number}" or "Booking {booking_number}"
          const bookingMatch = data.match(/Booking[:\s]+([A-Z0-9]+)/i);
          if (bookingMatch && bookingMatch[1]) {
            bookingNum = bookingMatch[1];
          }
        } else {
          // Fallback: assume the entire data is the booking number
          bookingNum = data.trim();
        }
      }

      if (bookingNum) {
        const formattedBookingNum = bookingNum.toString().toUpperCase();
        setBookingNumber(formattedBookingNum);

        // Auto-validate after scanning
        validateTicket(formattedBookingNum)
          .then(result => {
            setValidationResult(result);

            if (error) {
              Alert.alert('Error', error);
            }
          })
          .catch(err => {
            Alert.alert(
              'Error',
              'Failed to validate scanned ticket. Please try again.'
            );
          });
      } else {
        Alert.alert(
          'Invalid QR Code',
          `The scanned QR code does not contain valid booking information. Data: "${data}"`
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      Alert.alert(
        'Error',
        `Failed to process scanned QR code: ${errorMessage}`
      );
    }
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
    setScanned(false);
  };

  const handleViewBooking = () => {
    if (validationResult?.booking && validationResult?.isOwnBooking) {
      router.push(`./booking-details/${validationResult.booking.id}`);
    } else {
      // This shouldn't happen as the button should be hidden, but just in case
      Alert.alert(
        'Access Denied',
        'You can only view details of your own bookings.'
      );
    }
  };

  const handleClear = () => {
    setBookingNumber('');
    setValidationResult(null);
  };

  // Create separate styles for valid and invalid result cards to fix linter error
  const getResultCardStyle = () => {
    if (!validationResult) return styles.resultCard;

    if (validationResult.isValid) {
      return styles.validResultCard;
    } else {
      return styles.invalidResultCard;
    }
  };

  const renderBookingSummary = () => {
    if (!validationResult?.booking) return null;

    const { booking, isOwnBooking } = validationResult;

    return (
      <View style={styles.bookingSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Booking #:</Text>
          <Text style={styles.summaryValue}>{booking.bookingNumber}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <Text style={styles.summaryValue}>
            {booking.bookingType === 'agent'
              ? 'Agent Booking'
              : 'Customer Booking'}
          </Text>
        </View>

        {booking.clientName && isOwnBooking && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Client:</Text>
            <Text style={styles.summaryValue}>{booking.clientName}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status:</Text>
          <Text
            style={[
              styles.summaryValue,
              booking.status === 'confirmed'
                ? styles.confirmedStatus
                : styles.cancelledStatus,
            ]}
          >
            {booking.status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Route:</Text>
          <Text style={styles.summaryValue}>
            {booking.route.fromIsland.name} → {booking.route.toIsland.name}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date:</Text>
          <Text style={styles.summaryValue}>
            {formatSimpleDate(booking.departureDate)}
          </Text>
        </View>

        {/* Only show time for own bookings */}
        {isOwnBooking && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>{booking.departureTime}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Vessel:</Text>
          <Text style={styles.summaryValue}>
            {booking.vessel?.name || 'N/A'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Passengers:</Text>
          <Text style={styles.summaryValue}>{booking.passengers.length}</Text>
        </View>

        {/* Only show seat details for own bookings */}
        {isOwnBooking && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Seats:</Text>
            <Text style={styles.summaryValue}>
              {booking.seats.map(seat => seat.number).join(', ')}
            </Text>
          </View>
        )}

        {/* Only show fare for own bookings */}
        {isOwnBooking && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Fare:</Text>
            <Text style={styles.summaryValue}>
              MVR {booking.totalFare.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Check-in:</Text>
          <Text
            style={[
              styles.summaryValue,
              booking.checkInStatus
                ? styles.checkedInStatus
                : styles.notCheckedInStatus,
            ]}
          >
            {booking.checkInStatus ? 'CHECKED IN' : 'NOT CHECKED IN'}
          </Text>
        </View>
      </View>
    );
  };

  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <View style={styles.cameraHeader}>
        <Text style={styles.cameraTitle}>Scan QR Code</Text>
        <TouchableOpacity
          onPress={handleCloseCamera}
          style={styles.closeButton}
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          style={styles.camera}
          facing='back'
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
        />
        {/* Overlay with scanning frame - positioned absolutely */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>
      </View>

      <Text style={styles.cameraInstructions}>
        Position the QR code within the frame to scan
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps='handled'
    >
      <Text style={styles.title}>Validate Ticket</Text>
      <Text style={styles.subtitle}>
        Enter booking number or scan QR code to validate a ticket
      </Text>

      <Card variant='elevated' style={styles.inputCard}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder='Enter booking number'
            value={bookingNumber}
            onChangeText={setBookingNumber}
            keyboardType='default'
            maxLength={20}
            autoCapitalize='characters'
            editable={!showCamera}
          />
          {bookingNumber ? (
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <XCircle size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!showCamera ? (
          <View style={styles.buttonContainer}>
            <Button
              title='Validate'
              onPress={handleValidate}
              loading={isValidating}
              disabled={!bookingNumber.trim() || isValidating}
              style={styles.validateButton}
            />

            <Button
              title='Scan QR'
              onPress={handleScanQR}
              variant='outline'
              style={styles.scanButton}
            />
          </View>
        ) : (
          renderCameraView()
        )}
      </Card>

      {validationResult && !showCamera && (
        <Card variant='elevated' style={getResultCardStyle()}>
          <View style={styles.resultHeader}>
            {validationResult.isValid ? (
              <CheckCircle
                size={24}
                color={Colors.success}
                style={styles.resultIcon}
              />
            ) : (
              <XCircle
                size={24}
                color={Colors.error}
                style={styles.resultIcon}
              />
            )}
            <Text
              style={[
                styles.resultMessage,
                validationResult.isValid
                  ? styles.validMessage
                  : styles.invalidMessage,
              ]}
            >
              {validationResult.message}
            </Text>
          </View>

          {validationResult.booking && (
            <>
              <View style={styles.divider} />
              {renderBookingSummary()}

              {/* Only show View Booking button for user's own bookings */}
              {validationResult.isOwnBooking && validationResult.isValid && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.actionContainer}>
                    <Button
                      title='View Full Details'
                      onPress={handleViewBooking}
                      style={styles.viewButton}
                    />
                  </View>
                </>
              )}

              {/* Show a note for other users' bookings */}
              {!validationResult.isOwnBooking && validationResult.isValid && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.noteContainer}>
                    <Text style={styles.noteText}>
                      ℹ️ This ticket belongs to another user. Limited
                      information is shown for privacy.
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </Card>
      )}

      {error && (
        <Card variant='elevated' style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputCard: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: Colors.text,
  },
  clearButton: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  validateButton: {
    flex: 1,
    marginRight: 8,
  },
  scanButton: {
    flex: 1,
    marginLeft: 8,
  },
  // Camera styles
  cameraContainer: {
    marginTop: 8,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  cameraTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  cameraWrapper: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.text,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  cameraInstructions: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  // Result card styles
  resultCard: {
    marginBottom: 16,
  },
  validResultCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  invalidResultCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultMessage: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  validMessage: {
    color: Colors.success,
  },
  invalidMessage: {
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  bookingSummary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  summaryLabel: {
    width: 100,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  confirmedStatus: {
    color: Colors.success,
    fontWeight: '600',
  },
  cancelledStatus: {
    color: Colors.error,
    fontWeight: '600',
  },
  checkedInStatus: {
    color: Colors.success,
    fontWeight: '600',
  },
  notCheckedInStatus: {
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  viewButton: {
    alignSelf: 'flex-start',
  },
  actionContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  noteContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  noteText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorCard: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
});
