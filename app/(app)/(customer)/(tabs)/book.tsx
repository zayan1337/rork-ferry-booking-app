import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import {
  useBookingStore,
  useSeatStore,
  useBookingOperationsStore,
} from '@/store';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SeatSelector from '@/components/SeatSelector';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import type { Seat } from '@/types';
import { createEmptyFormErrors } from '@/utils/customerUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import {
  BOOKING_STEPS,
  STEP_LABELS,
  TRIP_TYPES,
  PAYMENT_OPTIONS,
  REFRESH_INTERVALS,
} from '@/constants/customer';

// Import new step components
import IslandDateStep from '@/components/booking/steps/IslandDateStep';
import TripSelectionStep from '@/components/booking/steps/TripSelectionStep';

export default function BookScreen() {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pricingNoticeAccepted, setPricingNoticeAccepted] = useState(false);

  // Local seat selection state
  const [localSelectedSeats, setLocalSelectedSeats] = useState<Seat[]>([]);
  const [localReturnSelectedSeats, setLocalReturnSelectedSeats] = useState<
    Seat[]
  >([]);
  const [loadingSeats, setLoadingSeats] = useState<Set<string>>(new Set());
  const [seatErrors, setSeatErrors] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState(createEmptyFormErrors());

  // MIB Payment state
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState('');
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);

  // Core booking state
  const {
    currentBooking,
    isLoading: bookingLoading,
    currentStep,
    setCurrentStep,
    updatePassengers,
    resetBooking: resetCurrentBooking,
    createCustomerBooking,
    setTripType,
  } = useBookingStore();

  // Seat management
  const {
    availableSeats,
    availableReturnSeats,
    fetchAvailableSeats,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
    cleanupAllSeatSubscriptions,
    refreshAvailableSeatsSilently,
    isLoading: seatLoading,
  } = useSeatStore();

  // Booking operations
  const { isLoading: operationLoading } = useBookingOperationsStore();

  const isLoading = bookingLoading || seatLoading || operationLoading;

  // Initialize default trip type
  useEffect(() => {
    if (!currentBooking.tripType) {
      setTripType('one_way');
    }
  }, []);

  // Intercept system back button for step navigation
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        // If on first step, allow normal back navigation to exit booking
        if (currentStep === BOOKING_STEPS.ISLAND_DATE_SELECTION) {
          return false; // Allow default back behavior
        }

        // Otherwise, navigate to previous booking step
        handleBack();
        return true; // Prevent default back behavior
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [currentStep])
  );

  // Fetch seats when trip is selected
  useEffect(() => {
    if (currentBooking.trip?.id) {
      fetchAvailableSeats(currentBooking.trip.id, false);
      subscribeSeatUpdates(currentBooking.trip.id, false);
    }
    if (currentBooking.returnTrip?.id) {
      fetchAvailableSeats(currentBooking.returnTrip.id, true);
      subscribeSeatUpdates(currentBooking.returnTrip.id, true);
    }

    return () => {
      if (currentBooking.trip?.id)
        unsubscribeSeatUpdates(currentBooking.trip.id);
      if (currentBooking.returnTrip?.id)
        unsubscribeSeatUpdates(currentBooking.returnTrip.id);
    };
  }, [currentBooking.trip?.id, currentBooking.returnTrip?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllSeatSubscriptions();
    };
  }, []);

  // Sync local seats with store
  useEffect(() => {
    setLocalSelectedSeats(currentBooking.selectedSeats);
  }, [currentBooking.selectedSeats]);

  useEffect(() => {
    setLocalReturnSelectedSeats(currentBooking.returnSelectedSeats);
  }, [currentBooking.returnSelectedSeats]);

  // Periodic seat refresh
  useEffect(() => {
    if (currentStep === BOOKING_STEPS.SEAT_SELECTION) {
      const interval = setInterval(() => {
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }, REFRESH_INTERVALS.SEAT_AVAILABILITY);

      return () => clearInterval(interval);
    }
  }, [currentStep, currentBooking.trip?.id, currentBooking.returnTrip?.id]);

  const validateStep = (step: number) => {
    const newErrors = { ...errors };
    let isValid = true;

    switch (step) {
      case BOOKING_STEPS.ISLAND_DATE_SELECTION:
        // Validation handled in IslandDateStep component
        break;

      case BOOKING_STEPS.TRIP_SELECTION:
        if (!currentBooking.trip) {
          newErrors.trip = 'Please select a trip';
          isValid = false;
        }
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          !currentBooking.returnTrip
        ) {
          newErrors.returnTrip = 'Please select a return trip';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.SEAT_SELECTION:
        if (localSelectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one seat';
          isValid = false;
        }
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          localReturnSelectedSeats.length === 0
        ) {
          newErrors.seats = 'Please select return seats';
          isValid = false;
        }
        if (
          currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
          localSelectedSeats.length !== localReturnSelectedSeats.length
        ) {
          newErrors.seats = 'Number of departure and return seats must match';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.PASSENGER_DETAILS:
        const incomplete = currentBooking.passengers.find(
          p => !p.fullName.trim()
        );
        if (incomplete) {
          newErrors.passengers = 'Please enter all passenger details';
          isValid = false;
        }
        break;

      case BOOKING_STEPS.PAYMENT:
        if (!paymentMethod) {
          newErrors.paymentMethod = 'Please select payment method';
          isValid = false;
        }
        if (!termsAccepted) {
          newErrors.terms = 'Please accept terms and conditions';
          isValid = false;
        }
        if (!pricingNoticeAccepted) {
          newErrors.pricingNotice = 'Please acknowledge pricing notice';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);

      // Refresh seat availability when user reaches seat selection step
      if (currentStep + 1 === BOOKING_STEPS.SEAT_SELECTION) {
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleFindTrips = () => {
    // Move to trip selection step
    setCurrentStep(BOOKING_STEPS.TRIP_SELECTION);
  };

  const handleConfirmBooking = async () => {
    if (validateStep(BOOKING_STEPS.PAYMENT)) {
      try {
        const bookingResult = await createCustomerBooking(paymentMethod);

        if (paymentMethod === 'mib') {
          const bookingDetails = {
            bookingNumber: bookingResult.booking_number,
            route: `${currentBooking.boardingIslandName} → ${currentBooking.destinationIslandName}`,
            travelDate:
              currentBooking.departureDate || new Date().toISOString(),
            amount: currentBooking.totalFare,
            currency: 'MVR',
            passengerCount: localSelectedSeats.length,
          };

          setCurrentBookingId(bookingResult.bookingId);
          setMibBookingDetails(bookingDetails);
          setShowMibPayment(true);
        } else {
          resetCurrentBooking();
          setCurrentStep(BOOKING_STEPS.ISLAND_DATE_SELECTION);
          setPaymentMethod('');
          setTermsAccepted(false);
          setPricingNoticeAccepted(false);
          setLocalSelectedSeats([]);
          setLocalReturnSelectedSeats([]);
          setErrors(createEmptyFormErrors());

          let successMessage = `Your ${
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP
              ? 'round trip'
              : 'one way'
          } booking has been confirmed.`;
          successMessage += `\n\nBooking Number: ${bookingResult.booking_number}`;

          if (bookingResult.returnBookingId) {
            successMessage += `\nReturn Booking Number: ${bookingResult.return_booking_number || 'N/A'}`;
          }

          Alert.alert('Booking Confirmed', successMessage, [
            {
              text: 'View Tickets',
              onPress: () => router.push('/(app)/(customer)/(tabs)/bookings'),
            },
          ]);
        }
      } catch (error: any) {
        Alert.alert('Booking Failed', error?.message || 'Please try again');

        // Refresh seat availability
        if (currentBooking.trip?.id) {
          refreshAvailableSeatsSilently(currentBooking.trip.id, false);
        }
        if (currentBooking.returnTrip?.id) {
          refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
        }
      }
    }
  };

  const updatePassengerDetail = (
    index: number,
    field: string,
    value: string
  ) => {
    const updated = [...currentBooking.passengers];
    updated[index] = { ...updated[index], [field]: value };
    updatePassengers(updated);
  };

  const handleSeatToggle = async (seat: Seat, isReturn: boolean = false) => {
    if (loadingSeats.has(seat.id)) return;

    setLoadingSeats(prev => new Set(prev).add(seat.id));
    setSeatErrors(prev => ({ ...prev, [seat.id]: '' }));

    try {
      await useSeatStore.getState().toggleSeatSelection(seat, isReturn);
      if (errors.seats) setErrors({ ...errors, seats: '' });
    } catch (error: any) {
      setSeatErrors(prev => ({ ...prev, [seat.id]: error.message }));
      Alert.alert('Seat Selection Error', error.message);
    } finally {
      setLoadingSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seat.id);
        return newSet;
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        {/* Progress Steps */}
        <View style={styles.progressContainer}>
          {Object.values(BOOKING_STEPS).map(step => (
            <View key={step} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  currentStep >= step && styles.progressDotActive,
                ]}
              >
                {currentStep > step && <Check size={12} color='#fff' />}
              </View>
              <Text
                style={[
                  styles.progressText,
                  currentStep >= step && styles.progressTextActive,
                ]}
              >
                {STEP_LABELS[step]}
              </Text>
            </View>
          ))}
          <View style={styles.progressLine} />
        </View>

        <Card variant='elevated' style={styles.bookingCard}>
          {/* Step 1: Island & Date Selection */}
          {currentStep === BOOKING_STEPS.ISLAND_DATE_SELECTION && (
            <IslandDateStep onFindTrips={handleFindTrips} />
          )}

          {/* Step 2: Trip Selection */}
          {currentStep === BOOKING_STEPS.TRIP_SELECTION && (
            <TripSelectionStep />
          )}

          {/* Step 3: Seat Selection */}
          {currentStep === BOOKING_STEPS.SEAT_SELECTION && (
            <View>
              <Text style={styles.stepTitle}>Select Seats</Text>

              <Text style={styles.seatSectionTitle}>Departure Seats</Text>
              <SeatSelector
                seats={availableSeats}
                selectedSeats={localSelectedSeats}
                onSeatToggle={seat => handleSeatToggle(seat, false)}
                isLoading={isLoading}
                loadingSeats={loadingSeats}
                seatErrors={seatErrors}
                maxSeats={10}
              />

              {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
                <>
                  <Text style={styles.seatSectionTitle}>Return Seats</Text>
                  <SeatSelector
                    seats={availableReturnSeats}
                    selectedSeats={localReturnSelectedSeats}
                    onSeatToggle={seat => handleSeatToggle(seat, true)}
                    isLoading={isLoading}
                    loadingSeats={loadingSeats}
                    seatErrors={seatErrors}
                    maxSeats={10}
                  />
                </>
              )}

              {errors.seats && (
                <Text style={styles.errorText}>{errors.seats}</Text>
              )}

              {localSelectedSeats.length > 0 && (
                <View style={styles.fareContainer}>
                  <Text style={styles.fareLabel}>Total Fare:</Text>
                  <Text style={styles.fareValue}>
                    MVR {currentBooking.totalFare.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step 4: Passenger Details */}
          {currentStep === BOOKING_STEPS.PASSENGER_DETAILS && (
            <View>
              <Text style={styles.stepTitle}>Passenger Details</Text>

              {currentBooking.passengers.map((passenger, index) => (
                <View key={index} style={styles.passengerContainer}>
                  <Text style={styles.passengerTitle}>
                    Passenger {index + 1} - Seat{' '}
                    {localSelectedSeats[index]?.number}
                  </Text>

                  <Input
                    label='Full Name'
                    placeholder='Enter passenger name'
                    value={passenger.fullName}
                    onChangeText={text =>
                      updatePassengerDetail(index, 'fullName', text)
                    }
                    required
                  />

                  <Input
                    label='ID Number'
                    placeholder='Enter ID number (optional)'
                    value={passenger.idNumber || ''}
                    onChangeText={text =>
                      updatePassengerDetail(index, 'idNumber', text)
                    }
                  />

                  <Input
                    label='Special Assistance'
                    placeholder='Any special requirements? (optional)'
                    value={passenger.specialAssistance || ''}
                    onChangeText={text =>
                      updatePassengerDetail(index, 'specialAssistance', text)
                    }
                    multiline
                    numberOfLines={2}
                  />
                </View>
              ))}

              {errors.passengers && (
                <Text style={styles.errorText}>{errors.passengers}</Text>
              )}
            </View>
          )}

          {/* Step 5: Payment */}
          {currentStep === BOOKING_STEPS.PAYMENT && (
            <View>
              <Text style={styles.stepTitle}>Payment</Text>

              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Trip Type:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.tripType === 'one_way'
                      ? 'One Way'
                      : 'Round Trip'}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Route:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.boardingIslandName} →{' '}
                    {currentBooking.destinationIslandName}
                  </Text>
                </View>

                {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Return Route:</Text>
                    <Text style={styles.summaryValue}>
                      {currentBooking.returnBoardingIslandName} →{' '}
                      {currentBooking.returnDestinationIslandName}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Departure Date:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.departureDate &&
                      new Date(
                        currentBooking.departureDate
                      ).toLocaleDateString()}
                  </Text>
                </View>

                {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                  currentBooking.returnDate && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Return Date:</Text>
                      <Text style={styles.summaryValue}>
                        {new Date(
                          currentBooking.returnDate
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Passengers:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.passengers.length}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Seats:</Text>
                  <Text style={styles.summaryValue}>
                    {localSelectedSeats.map(seat => seat.number).join(', ')}
                  </Text>
                </View>

                {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                  localReturnSelectedSeats.length > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Return Seats:</Text>
                      <Text style={styles.summaryValue}>
                        {localReturnSelectedSeats
                          .map(seat => seat.number)
                          .join(', ')}
                      </Text>
                    </View>
                  )}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>
                    MVR {currentBooking.totalFare.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Dropdown
                label='Payment Method'
                items={[...PAYMENT_OPTIONS]}
                value={paymentMethod}
                onChange={value => {
                  setPaymentMethod(value);
                  if (errors.paymentMethod)
                    setErrors({ ...errors, paymentMethod: '' });
                }}
                placeholder='Select payment method'
                error={errors.paymentMethod}
                required
              />

              <View style={styles.termsContainer}>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => {
                    setTermsAccepted(!termsAccepted);
                    if (errors.terms) setErrors({ ...errors, terms: '' });
                  }}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      termsAccepted && styles.checkboxChecked,
                    ]}
                  />
                </Pressable>
                <Text style={styles.termsText}>
                  I accept the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() => router.push('/(app)/terms-and-conditions')}
                  >
                    Terms and Conditions
                  </Text>
                </Text>
              </View>

              <View style={styles.termsContainer}>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => {
                    setPricingNoticeAccepted(!pricingNoticeAccepted);
                    if (errors.pricingNotice)
                      setErrors({ ...errors, pricingNotice: '' });
                  }}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      pricingNoticeAccepted && styles.checkboxChecked,
                    ]}
                  />
                </Pressable>
                <Text style={styles.termsText}>
                  I acknowledge that the ticket prices shown are valid for
                  locals and Work Permit holders only. For tourist pricing, I
                  will contact the hotlines{' '}
                  <Text style={styles.hotlineNumber}>3323113</Text> or{' '}
                  <Text style={styles.hotlineNumber}>7892929</Text>.
                </Text>
              </View>

              {errors.terms && (
                <Text style={styles.errorText}>{errors.terms}</Text>
              )}
              {errors.pricingNotice && (
                <Text style={styles.errorText}>{errors.pricingNotice}</Text>
              )}
            </View>
          )}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            {currentStep > BOOKING_STEPS.ISLAND_DATE_SELECTION &&
              currentStep !== BOOKING_STEPS.TRIP_SELECTION && (
                <Button
                  title='Back'
                  onPress={handleBack}
                  variant='outline'
                  style={styles.navigationButton}
                />
              )}

            {currentStep === BOOKING_STEPS.TRIP_SELECTION && (
              <Button
                title='Back'
                onPress={handleBack}
                variant='outline'
                style={styles.navigationButton}
              />
            )}

            {currentStep === BOOKING_STEPS.TRIP_SELECTION && (
              <Button
                title='Next'
                onPress={handleNext}
                style={styles.navigationButton}
                disabled={!currentBooking.trip}
              />
            )}

            {currentStep > BOOKING_STEPS.TRIP_SELECTION &&
              currentStep < BOOKING_STEPS.PAYMENT && (
                <Button
                  title='Next'
                  onPress={handleNext}
                  style={styles.navigationButton}
                />
              )}

            {currentStep === BOOKING_STEPS.PAYMENT && (
              <Button
                title='Confirm Booking'
                onPress={handleConfirmBooking}
                loading={isLoading}
                disabled={isLoading}
                style={styles.navigationButton}
              />
            )}
          </View>
        </Card>

        {/* MIB Payment WebView */}
        {showMibPayment && mibBookingDetails && currentBookingId && (
          <MibPaymentWebView
            visible={showMibPayment}
            bookingDetails={mibBookingDetails}
            bookingId={currentBookingId}
            sessionData={mibSessionData}
            onClose={() => {
              setShowMibPayment(false);
              setCurrentBookingId('');
              setMibSessionData(null);
              setMibBookingDetails(null);
            }}
            onSuccess={result => {
              setShowMibPayment(false);
              setCurrentBookingId('');
              setMibSessionData(null);
              setMibBookingDetails(null);

              router.push({
                pathname: '/(app)/(customer)/payment-success',
                params: {
                  bookingId: currentBookingId,
                  result: 'SUCCESS',
                  sessionId: result.sessionId,
                  resetBooking: 'true',
                },
              });
            }}
            onFailure={error => {
              setShowMibPayment(false);
              setCurrentBookingId('');
              setMibSessionData(null);
              setMibBookingDetails(null);

              router.push({
                pathname: '/(app)/(customer)/payment-success',
                params: {
                  bookingId: currentBookingId,
                  result: 'FAILURE',
                  resetBooking: 'false',
                },
              });
            }}
            onCancel={() => {
              setShowMibPayment(false);
              setCurrentBookingId('');
              setMibSessionData(null);
              setMibBookingDetails(null);

              router.push({
                pathname: '/(app)/(customer)/payment-success',
                params: {
                  bookingId: currentBookingId,
                  result: 'CANCELLED',
                  resetBooking: 'false',
                },
              });
            }}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    top: 12,
    left: 25,
    right: 25,
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  progressTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  bookingCard: {
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 16,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  fareLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  passengerContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  hotlineNumber: {
    fontWeight: '700',
    color: Colors.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  navigationButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginBottom: 16,
    marginTop: 8,
  },
});
