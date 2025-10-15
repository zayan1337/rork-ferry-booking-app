import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { CheckCircle, XCircle, X, UserCheck, Eye } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTicketStore } from '@/store/ticketStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import type { ValidationResult } from '@/types/pages/booking';
import { formatSimpleDate } from '@/utils/dateUtils';

const { width } = Dimensions.get('window');

export default function CaptainCheckinScreen() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingTicket, setIsCheckingTicket] = useState(false);
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

  const handleCheckIn = async () => {
    if (!validationResult?.booking) {
      Alert.alert('Error', 'No valid booking to check in');
      return;
    }

    const { booking } = validationResult;

    // Check if already checked in
    if (booking.checkInStatus) {
      Alert.alert(
        'Already Checked In',
        'This booking has already been checked in.'
      );
      return;
    }

    // Check if booking is confirmed
    if (booking.status !== 'confirmed') {
      Alert.alert(
        'Cannot Check In',
        `Booking status is ${booking.status.toUpperCase()}. Only confirmed bookings can be checked in.`
      );
      return;
    }

    // Check if it's within the check-in window (30 minutes before and after departure)
    const departureDateTime = new Date(
      `${booking.departureDate}T${booking.departureTime}`
    );
    const now = new Date();
    const timeDifferenceMs = departureDateTime.getTime() - now.getTime();
    const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

    // Allow check-in 30 minutes before and 30 minutes after departure
    const isWithinCheckInWindow =
      timeDifferenceMinutes >= -30 && timeDifferenceMinutes <= 30;

    if (!isWithinCheckInWindow) {
      const departureTimeStr = `${formatSimpleDate(booking.departureDate)} at ${booking.departureTime}`;
      if (timeDifferenceMinutes > 30) {
        Alert.alert(
          'Too Early for Check-in',
          `Check-in opens 30 minutes before departure.\n\nDeparture: ${departureTimeStr}\nCurrent time: ${now.toLocaleString()}\n\nPlease wait ${Math.ceil(timeDifferenceMinutes - 30)} more minutes.`
        );
      } else {
        Alert.alert(
          'Check-in Window Closed',
          `Check-in closes 30 minutes after departure.\n\nDeparture was: ${departureTimeStr}\nCurrent time: ${now.toLocaleString()}\n\nCheck-in window has expired.`
        );
      }
      return;
    }

    Alert.alert(
      'Confirm Check-in',
      `Check in ${(booking as any).passengers?.length || (booking as any).passengerCount || 0} passenger(s) for booking ${booking.bookingNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check In',
          onPress: async () => {
            setIsCheckingIn(true);
            try {
              // Get current user (captain)
              const {
                data: { user },
                error: userError,
              } = await supabase.auth.getUser();

              if (userError || !user) {
                throw new Error('Captain authentication required');
              }

              // Validate booking data
              if (!booking || !booking.id) {
                throw new Error('Invalid booking data');
              }

              // Update the booking check-in status in the database
              const checkInTime = new Date().toISOString();
              const { error: updateError } = await supabase
                .from('bookings')
                .update({
                  status: 'checked_in',
                  check_in_status: true,
                  checked_in_at: checkInTime,
                  checked_in_by: user.id,
                })
                .eq('id', booking.id);

              if (updateError) {
                throw new Error(
                  `Database update failed: ${updateError.message}`
                );
              }

              // Optional: Create a check-in log entry for audit trail
              try {
                await supabase.from('check_in_logs').insert({
                  booking_id: booking.id,
                  captain_id: user.id,
                  check_in_time: checkInTime,
                  passenger_count:
                    (booking as any).passengers?.length ||
                    (booking as any).passengerCount ||
                    0,
                  notes: `Captain check-in via mobile app`,
                });
              } catch (logError) {
                // Log creation is optional, don't fail the check-in if this fails
                // Silently continue if audit log creation fails
              }

              // Update the validation result to show checked in status
              setValidationResult(prev => {
                if (!prev || !prev.booking) return prev;
                return {
                  ...prev,
                  booking: {
                    ...prev.booking,
                    checkInStatus: true,
                  },
                };
              });

              Alert.alert(
                'Check-in Successful',
                `${(booking as any).passengers?.length || (booking as any).passengerCount || 0} passenger(s) have been checked in for booking ${booking.bookingNumber}.\n\nCheck-in completed at ${new Date().toLocaleTimeString()}.`
              );
            } catch (error) {
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : 'Unknown error occurred';
              Alert.alert(
                'Check-in Failed',
                `Failed to check in passengers: ${errorMessage}\n\nPlease try again or contact support.`
              );
            } finally {
              setIsCheckingIn(false);
            }
          },
        },
      ]
    );
  };

  const handleCheckTicket = async () => {
    if (!validationResult?.booking) {
      Alert.alert('Error', 'No valid booking to check');
      return;
    }

    const { booking } = validationResult;

    setIsCheckingTicket(true);

    try {
      // Fetch real-time booking data from database
      const { data: currentBooking, error: fetchError } = await supabase
        .from('bookings')
        .select(
          'id, booking_number, status, check_in_status, checked_in_at, checked_in_by, total_fare'
        )
        .eq('id', booking.id)
        .single();

      if (fetchError) {
        throw new Error(
          `Failed to fetch current booking status: ${fetchError.message}`
        );
      }

      if (!currentBooking) {
        throw new Error('Booking not found in database');
      }

      // Determine ticket status based on real-time data
      let ticketStatus = 'Valid';
      let statusMessage = 'Ticket is valid and ready for travel.';
      let additionalInfo = '';

      // Check if booking is confirmed
      if (currentBooking.status !== 'confirmed') {
        ticketStatus = 'Invalid';
        statusMessage = `Ticket is ${currentBooking.status.toUpperCase()}. Only confirmed tickets are valid for travel.`;
      }
      // Check if it's within the valid time window
      else {
        const departureDateTime = new Date(
          `${booking.departureDate}T${booking.departureTime}`
        );
        const now = new Date();
        const timeDifferenceMs = departureDateTime.getTime() - now.getTime();
        const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

        // Check if within check-in window (30 minutes before and after departure)
        const isWithinCheckInWindow =
          timeDifferenceMinutes >= -30 && timeDifferenceMinutes <= 30;

        if (timeDifferenceMinutes > 30) {
          ticketStatus = 'Future';
          statusMessage = `Ticket is valid but check-in window hasn't opened yet.\n\nDeparture: ${formatSimpleDate(booking.departureDate)} at ${booking.departureTime}\nCheck-in opens: 30 minutes before departure`;
        } else if (timeDifferenceMinutes < -30) {
          ticketStatus = 'Expired';
          statusMessage = `Ticket has expired. Check-in window closed 30 minutes after departure.\n\nDeparture was: ${formatSimpleDate(booking.departureDate)} at ${booking.departureTime}`;
        } else if (currentBooking.check_in_status) {
          ticketStatus = 'Used';
          statusMessage =
            'Ticket has already been used (passengers checked in).';

          if (currentBooking.checked_in_at) {
            const checkedInTime = new Date(currentBooking.checked_in_at);
            additionalInfo = `\nChecked in at: ${checkedInTime.toLocaleString()}`;
          }
        } else if (isWithinCheckInWindow) {
          ticketStatus = 'Valid';
          statusMessage = 'Ticket is valid and within check-in window.';
          additionalInfo = `\nDeparture: ${formatSimpleDate(booking.departureDate)} at ${booking.departureTime}\nCheck-in window: 30 min before to 30 min after departure`;
        }
      }

      // Update local validation result with real-time data
      setValidationResult(prev => {
        if (!prev || !prev.booking) return prev;
        return {
          ...prev,
          booking: {
            ...prev.booking,
            checkInStatus: currentBooking.check_in_status,
          },
        };
      });

      Alert.alert(
        `Ticket Status: ${ticketStatus}`,
        `${statusMessage}${additionalInfo}\n\nBooking: ${booking.bookingNumber}\nPassengers: ${(booking as any).passengers?.length || (booking as any).passengerCount || 0}\nRoute: ${(booking as any).route?.fromIsland?.name || (booking as any).fromIsland || 'Unknown'} → ${(booking as any).route?.toIsland?.name || (booking as any).toIsland || 'Unknown'}\nFare: MVR ${currentBooking.total_fare.toFixed(2)}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Ticket Check Failed',
        `Failed to check ticket status: ${errorMessage}\n\nPlease try again or contact support.`
      );
    } finally {
      setIsCheckingTicket(false);
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
            // Debug logging for QR scan results

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

  const handleClear = () => {
    setBookingNumber('');
    setValidationResult(null);
  };

  // Create separate styles for valid and invalid result cards
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

    const { booking } = validationResult;
    // Type assertion to handle flexible booking structure
    const bookingData = booking as any;

    return (
      <View style={styles.bookingSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Booking #:</Text>
          <Text style={styles.summaryValue}>{bookingData.bookingNumber}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Type:</Text>
          <Text style={styles.summaryValue}>
            {bookingData.bookingType === 'agent'
              ? 'Agent Booking'
              : 'Customer Booking'}
          </Text>
        </View>

        {bookingData.clientName && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Client:</Text>
            <Text style={styles.summaryValue}>{bookingData.clientName}</Text>
          </View>
        )}

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status:</Text>
          <Text
            style={[
              styles.summaryValue,
              bookingData.status === 'confirmed'
                ? styles.confirmedStatus
                : styles.cancelledStatus,
            ]}
          >
            {bookingData.status.toUpperCase()}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Route:</Text>
          <Text style={styles.summaryValue}>
            {bookingData.route?.fromIsland?.name ||
              bookingData.fromIsland ||
              'Unknown'}{' '}
            →{' '}
            {bookingData.route?.toIsland?.name ||
              bookingData.toIsland ||
              'Unknown'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date:</Text>
          <Text style={styles.summaryValue}>
            {formatSimpleDate(bookingData.departureDate)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time:</Text>
          <Text style={styles.summaryValue}>{bookingData.departureTime}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Vessel:</Text>
          <Text style={styles.summaryValue}>
            {bookingData.vessel?.name || bookingData.vesselName || 'N/A'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Passengers:</Text>
          <Text style={styles.summaryValue}>
            {bookingData.passengers?.length || bookingData.passengerCount || 0}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Seats:</Text>
          <Text style={styles.summaryValue}>
            {bookingData.seats?.length > 0
              ? bookingData.seats
                  .map((seat: any) => seat.number || seat)
                  .join(', ')
              : bookingData.seatNumbers || 'N/A'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Fare:</Text>
          <Text style={styles.summaryValue}>
            MVR {(bookingData.totalFare || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Check-in:</Text>
          <Text
            style={[
              styles.summaryValue,
              bookingData.checkInStatus
                ? styles.checkedInStatus
                : styles.notCheckedInStatus,
            ]}
          >
            {bookingData.checkInStatus ? 'CHECKED IN' : 'NOT CHECKED IN'}
          </Text>
        </View>
      </View>
    );
  };

  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <View style={styles.cameraHeader}>
        <Text style={styles.cameraTitle}>Scan QR Code</Text>
        <Pressable onPress={handleCloseCamera} style={styles.closeButton}>
          <X size={24} color={Colors.text} />
        </Pressable>
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
        {/* Overlay with scanning frame */}
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
      <View style={styles.header}>
        <UserCheck size={32} color={Colors.primary} />
        <Text style={styles.title}>Ticket Validation & Check-in</Text>
        <Text style={styles.subtitle}>
          Scan QR code or enter booking number to validate tickets and check in
          passengers
        </Text>
      </View>

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
            <Pressable style={styles.clearButton} onPress={handleClear}>
              <XCircle size={20} color={Colors.textSecondary} />
            </Pressable>
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

              {/* Action buttons for valid bookings */}
              {validationResult.isValid && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.actionContainer}>
                    <View style={styles.actionButtonsRow}>
                      {/* Check Ticket Button */}
                      <Button
                        title='Check Ticket'
                        onPress={handleCheckTicket}
                        loading={isCheckingTicket}
                        disabled={isCheckingTicket}
                        variant='outline'
                        style={styles.actionButton}
                        icon={<Eye size={18} color={Colors.primary} />}
                      />

                      {/* Check In Button */}
                      {!validationResult.booking.checkInStatus ? (
                        <Button
                          title='Check In'
                          onPress={handleCheckIn}
                          loading={isCheckingIn}
                          disabled={
                            isCheckingIn ||
                            validationResult.booking.status !== 'confirmed'
                          }
                          style={styles.actionButton}
                          icon={<UserCheck size={18} color='white' />}
                        />
                      ) : (
                        <View style={styles.alreadyCheckedIn}>
                          <CheckCircle size={16} color={Colors.success} />
                          <Text style={styles.alreadyCheckedInText}>
                            Already Checked In
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Passenger count info */}
                    <Text style={styles.passengerInfo}>
                      {(validationResult.booking as any).passengers?.length ||
                        (validationResult.booking as any).passengerCount ||
                        0}{' '}
                      passenger(s) • Seats:{' '}
                      {(validationResult.booking as any).seats?.length > 0
                        ? (validationResult.booking as any).seats
                            .map((seat: any) => seat.number || seat)
                            .join(', ')
                        : (validationResult.booking as any).seatNumbers ||
                          'N/A'}
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  actionContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  passengerInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  alreadyCheckedIn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: Colors.success + '15',
    borderRadius: 8,
  },
  alreadyCheckedInText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
  },
  errorCard: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
});
