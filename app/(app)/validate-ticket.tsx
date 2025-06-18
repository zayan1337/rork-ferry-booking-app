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
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { Search, CheckCircle, XCircle, Camera, X } from 'lucide-react-native';
import { CameraView, Camera as ExpoCamera } from 'expo-camera';
import { useTicketStore } from '@/store/ticketStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import type { Booking } from '@/types';

const { width } = Dimensions.get('window');

// Define interface for validation result
interface ValidationResult {
  isValid: boolean;
  booking: Booking | null;
  message: string;
}

export default function ValidateTicketScreen() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  const { validateTicket, isLoading } = useTicketStore();

  // Request camera permissions
  useEffect(() => {
    const getCameraPermissions = async () => {
      try {
        const { status } = await ExpoCamera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Camera permission error:', error);
        setHasPermission(false);
      }
    };

    getCameraPermissions();
  }, []);

  const handleValidate = async () => {
    if (!bookingNumber.trim()) {
      return;
    }

    setIsValidating(true);

    try {
      const result = await validateTicket(bookingNumber.trim());
      setValidationResult(result);
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        isValid: false,
        booking: null,
        message: "Error validating ticket. Please try again."
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleScanQR = () => {
    if (hasPermission === null) {
      Alert.alert('Camera Permission', 'Requesting camera permission...');
      return;
    }

    if (hasPermission === false) {
      Alert.alert(
        'Camera Permission Required',
        'Camera access is required to scan QR codes. Please enable camera permission in your device settings.',
        [
          { text: 'Manual Entry', onPress: () => { } },
          { text: 'OK', onPress: () => { } }
        ]
      );
      return;
    }

    setShowCamera(true);
    setScanned(false);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setShowCamera(false);

    // Extract booking number from QR data
    let extractedBookingNumber = '';

    try {
      // Try to parse as JSON first (our QR codes contain JSON data)
      const qrData = JSON.parse(data);
      extractedBookingNumber = qrData.bookingNumber || qrData.booking_number || '';

      // Log QR data for debugging
      console.log('QR Code Data:', qrData);
    } catch {
      // If not JSON, assume it's just the booking number
      extractedBookingNumber = data.trim();
      console.log('Plain text QR Code:', extractedBookingNumber);
    }

    if (extractedBookingNumber) {
      setBookingNumber(extractedBookingNumber);
      // Auto-validate after scanning
      setTimeout(async () => {
        setIsValidating(true);
        try {
          const result = await validateTicket(extractedBookingNumber);
          setValidationResult(result);
        } catch (error) {
          console.error('Validation error:', error);
          setValidationResult({
            isValid: false,
            booking: null,
            message: "Error validating ticket. Please try again."
          });
        } finally {
          setIsValidating(false);
        }
      }, 500);
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This QR code does not contain a valid booking number. Please try scanning again or enter the booking number manually.'
      );
    }
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
    setScanned(false);
  };

  const handleViewBooking = () => {
    if (validationResult?.booking) {
      router.push(`/booking-details/${validationResult.booking.id}`);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Validate Ticket</Text>
      <Text style={styles.subtitle}>
        Enter booking number or scan QR code to validate a ticket
      </Text>

      <Card variant="elevated" style={styles.inputCard}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter booking number"
            value={bookingNumber}
            onChangeText={setBookingNumber}
            keyboardType="default"
            maxLength={20}
            autoCapitalize="characters"
            editable={!showCamera}
          />
          {bookingNumber ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClear}
            >
              <XCircle size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {!showCamera ? (
          <View style={styles.buttonContainer}>
            <Button
              title="Validate"
              onPress={handleValidate}
              loading={isValidating}
              disabled={!bookingNumber.trim() || isValidating}
              style={styles.validateButton}
            />

            <Button
              title="Scan QR"
              onPress={handleScanQR}
              variant="outline"
              style={styles.scanButton}
            />
          </View>
        ) : (
          // Camera View
          <View style={styles.cameraContainer}>
            <View style={styles.cameraHeader}>
              <Text style={styles.cameraTitle}>Scan QR Code</Text>
              <TouchableOpacity onPress={handleCloseCamera} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraWrapper}>
              <CameraView
                style={styles.camera}
                facing="back"
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
        )}
      </Card>

      {validationResult && !showCamera && (
        <Card
          variant="elevated"
          style={getResultCardStyle()}
        >
          <View style={styles.resultHeader}>
            {validationResult.isValid ? (
              <CheckCircle size={24} color={Colors.success} style={styles.resultIcon} />
            ) : (
              <XCircle size={24} color={Colors.error} style={styles.resultIcon} />
            )}
            <Text
              style={[
                styles.resultMessage,
                validationResult.isValid ? styles.validMessage : styles.invalidMessage
              ]}
            >
              {validationResult.message}
            </Text>
          </View>

          {validationResult.booking && (
            <>
              <View style={styles.divider} />

              <View style={styles.bookingSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Booking #:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.bookingNumber}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Status:</Text>
                  <Text style={[
                    styles.summaryValue,
                    validationResult.booking.status === 'confirmed'
                      ? styles.confirmedStatus
                      : styles.cancelledStatus
                  ]}>
                    {validationResult.booking.status.toUpperCase()}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Route:</Text>
                  <Text style={styles.summaryValue}>
                    {validationResult.booking.route.fromIsland.name} → {validationResult.booking.route.toIsland.name}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date:</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(validationResult.booking.departureDate).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Time:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.departureTime}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Vessel:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.vessel?.name || 'N/A'}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Passengers:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.passengers.length}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Seats:</Text>
                  <Text style={styles.summaryValue}>
                    {validationResult.booking.seats.map(seat => seat.number).join(', ')}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Fare:</Text>
                  <Text style={styles.summaryValue}>MVR {validationResult.booking.totalFare.toFixed(2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Check-in:</Text>
                  <Text style={[
                    styles.summaryValue,
                    validationResult.booking.checkInStatus
                      ? styles.checkedInStatus
                      : styles.notCheckedInStatus
                  ]}>
                    {validationResult.booking.checkInStatus ? 'CHECKED IN' : 'NOT CHECKED IN'}
                  </Text>
                </View>
              </View>

              <Button
                title="View Full Ticket"
                onPress={handleViewBooking}
                variant="outline"
                style={styles.viewButton}
              />
            </>
          )}
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
});