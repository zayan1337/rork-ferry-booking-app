import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useAgentStore } from '@/store/agent/agentStore';
import { useAgentBookingFormStore } from '@/store/agent/agentBookingFormStore';
import { useRouteStore, useTripStore } from '@/store';
import type { AgentClient } from '@/types/agent';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

import { Passenger } from '@/types';
import {
  BookingProgressStepper,
  TripRouteSelectionStep,
  ClientInfoStep,
  SeatSelectionStep,
  PassengerDetailsStep,
  PaymentStep,
} from '@/components/booking';
import {
  validateBookingStep,
  AGENT_PAYMENT_OPTIONS,
} from '@/utils/bookingFormUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { useAlertContext } from '@/components/AlertProvider';

const BOOKING_STEPS = [
  { id: 1, label: 'Trip', description: 'Route, date & trip selection' },
  { id: 2, label: 'Client', description: 'Select or add client' },
  { id: 3, label: 'Seats', description: 'Choose seats' },
  { id: 4, label: 'Details', description: 'Passenger information' },
  { id: 5, label: 'Payment', description: 'Payment & confirmation' },
];

export default function AgentNewBookingScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { showSuccess, showError } = useAlertContext();

  // Stores
  const agent = useAgentStore(state => state.agent);
  const clients = useAgentStore(state => state.clients);

  // Route management
  const {
    availableRoutes,
    fetchAvailableRoutes,
    isLoading: routeLoading,
  } = useRouteStore();

  // Trip management
  const {
    trips,
    returnTrips,
    fetchTrips,
    isLoading: tripLoading,
  } = useTripStore();

  // Agent booking store
  const {
    currentBooking,
    currentStep,
    availableSeats,
    availableReturnSeats,
    clientSearchResults,
    isSearchingClients,
    clientSearchQuery,
    isLoading,
    error,
    agent: storeAgent,
    setCurrentStep,
    nextStep,
    previousStep,
    setTripType,
    setRoute,
    setReturnRoute,
    setDepartureDate,
    setReturnDate,
    setTrip,
    setReturnTrip,
    setClient,
    createNewClient,
    searchClients,
    clearClientSearch,
    setClientSearchQuery,
    fetchAvailableSeats,
    toggleSeatSelection,
    updatePassengers,
    updatePassengerDetail,
    setPaymentMethod,
    validateCurrentStep,
    createBooking,
    reset,
    setError,
    setAgent,
    setOnBookingCreated,
    validateAgentAccess,
  } = useAgentBookingFormStore();

  // Local form state
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  });
  const [showAddNewClientForm, setShowAddNewClientForm] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // MIB Payment WebView state
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState('');
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);
  const [errors, setErrors] = useState({
    tripType: '',
    departureDate: '',
    returnDate: '',
    route: '',
    returnRoute: '',
    seats: '',
    passengers: '',
    paymentMethod: '',
    terms: '',
    trip: '',
    returnTrip: '',
    client: '',
  });

  // Combined loading states
  const combinedLoading = isLoading || routeLoading || tripLoading;

  useEffect(() => {
    // Initialize agent when component mounts
    if (agent) {
      setAgent(agent);
    }
  }, [agent, setAgent]);

  useEffect(() => {
    // Set up the booking creation callback to refresh agent store
    setOnBookingCreated(useAgentStore.getState().handleBookingCreated);

    return () => {
      // Clean up callback on unmount
      setOnBookingCreated(undefined);
    };
  }, [setOnBookingCreated]);

  useEffect(() => {
    // Load routes when component mounts
    fetchAvailableRoutes();
  }, [fetchAvailableRoutes]);

  useEffect(() => {
    // Pre-select client if coming from client page
    if (clientId && clients) {
      const selectedClient = clients.find(c => c.id === clientId);
      if (selectedClient) {
        const agentClient: AgentClient = {
          id: selectedClient.id,
          name: selectedClient.name,
          email: selectedClient.email,
          phone: selectedClient.phone,
          hasAccount: true,
          userProfileId: selectedClient.id,
        };
        setClient(agentClient);
        setClientForm({
          name: selectedClient.name,
          email: selectedClient.email,
          phone: selectedClient.phone,
          idNumber: '',
        });
      }
    }
  }, [clientId, clients, setClient]);

  useEffect(() => {
    // Fetch trips when route and date are selected
    if (currentBooking.route && currentBooking.departureDate) {
      fetchTrips(currentBooking.route.id, currentBooking.departureDate, false);
    }
  }, [currentBooking.route, currentBooking.departureDate, fetchTrips]);

  useEffect(() => {
    // Fetch return trips when return route and date are selected
    if (currentBooking.returnRoute && currentBooking.returnDate) {
      fetchTrips(
        currentBooking.returnRoute.id,
        currentBooking.returnDate,
        true
      );
    }
  }, [currentBooking.returnRoute, currentBooking.returnDate, fetchTrips]);

  // Fetch seats when trip is selected
  useEffect(() => {
    if (currentBooking.trip?.id) {
      fetchAvailableSeats(currentBooking.trip.id, false);
    }
  }, [currentBooking.trip?.id, fetchAvailableSeats]);

  useEffect(() => {
    if (currentBooking.returnTrip?.id) {
      fetchAvailableSeats(currentBooking.returnTrip.id, true);
    }
  }, [currentBooking.returnTrip?.id, fetchAvailableSeats]);

  // Auto-generate passengers array when seats are selected
  useEffect(() => {
    if (currentBooking.selectedSeats.length > 0) {
      const newPassengers: Passenger[] = currentBooking.selectedSeats.map(
        (_, index) => ({
          fullName: currentBooking.passengers[index]?.fullName || '',
          idNumber: currentBooking.passengers[index]?.idNumber || '',
          specialAssistance:
            currentBooking.passengers[index]?.specialAssistance || '',
        })
      );
      updatePassengers(newPassengers);
    } else if (currentBooking.selectedSeats.length === 0) {
      // Clear passengers when no seats selected
      updatePassengers([]);
    }
  }, [currentBooking.selectedSeats.length, updatePassengers]);

  // Clear client search when leaving step 3 or component unmounts
  useEffect(() => {
    if (currentStep !== 2) {
      clearClientSearch();
    }
  }, [currentStep, clearClientSearch]);

  useEffect(() => {
    return () => {
      clearClientSearch();
    };
  }, [clearClientSearch]);

  // Validation function using the utility
  const validateStep = (step: number) => {
    const stepData = {
      ...currentBooking,
      showAddNewClientForm,
      clientForm,
      termsAccepted,
    };

    const validation = validateBookingStep(step, stepData);
    setErrors({ ...errors, ...validation.errors });
    return validation.isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Save client info before moving to seat selection
      if (currentStep === 2) {
        if (showAddNewClientForm) {
          handleSaveClient();
          return;
        } else if (currentBooking.client) {
          setCurrentStep(3); // Move to seat selection
          return;
        }
      }

      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
    }
  };

  const handleBack = () => {
    if (currentStep === 2 && showAddNewClientForm) {
      // If we're on add new client form, go back to search
      setShowAddNewClientForm(false);
      setClientForm({ name: '', email: '', phone: '', idNumber: '' });
      if (errors.client) setErrors({ ...errors, client: '' });
    } else {
      if (currentStep === 2) {
        setLocalSearchQuery('');
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClientFormChange = (field: string, value: string) => {
    setClientForm(prev => ({ ...prev, [field]: value }));
    if (errors.client) setErrors({ ...errors, client: '' });
  };

  const handleSaveClient = () => {
    if (!clientForm.name || !clientForm.email || !clientForm.phone) {
      setError('Please fill all required client fields (name, email, phone)');
      return;
    }

    createNewClient({
      name: clientForm.name,
      email: clientForm.email,
      phone: clientForm.phone,
      idNumber: clientForm.idNumber, // Optional field
    });

    setCurrentStep(3); // Move to seat selection
  };

  const handleClientSearch = async (query: string) => {
    if (query.length >= 3) {
      // Start searching after 3 characters
      await searchClients(query);
    } else {
      clearClientSearch();
    }
  };

  const handleClientSearchInputChange = (text: string) => {
    setLocalSearchQuery(text);
    setClientSearchQuery(text);
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchQuery.length >= 3) {
        searchClients(localSearchQuery);
      } else if (localSearchQuery.length === 0) {
        clearClientSearch();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchClients, clearClientSearch]);

  const handleSelectExistingClient = (client: AgentClient) => {
    setClient(client);
    clearClientSearch();
    setLocalSearchQuery('');
    setShowAddNewClientForm(false);
    if (errors.client) setErrors({ ...errors, client: '' });
  };

  const handleShowAddNewClient = () => {
    setShowAddNewClientForm(true);
    clearClientSearch();
    // Pre-fill with search query if it looks like an email
    if (localSearchQuery.includes('@')) {
      setClientForm(prev => ({ ...prev, email: localSearchQuery }));
    } else if (localSearchQuery.match(/^\d+$/)) {
      setClientForm(prev => ({ ...prev, phone: localSearchQuery }));
    }
  };

  const handleCreateBooking = async () => {
    if (validateStep(5)) {
      try {
        const result = await createBooking();

        // Handle MIB payment differently
        if (currentBooking.paymentMethod === 'mib') {
          // Prepare booking details for the payment modal
          const bookingDetails = {
            bookingNumber: result.bookingId,
            route: `${
              currentBooking.route?.fromIsland?.name || 'N/A'
            } → ${currentBooking.route?.toIsland?.name || 'N/A'}`,
            travelDate:
              currentBooking.departureDate || new Date().toISOString(),
            amount:
              currentBooking.discountedFare || currentBooking.totalFare || 0,
            currency: 'MVR',
            passengerCount: currentBooking.selectedSeats.length,
          };

          // Show modal immediately with booking details
          if (typeof result === 'string') {
            setCurrentBookingId(result);
          } else if (result && typeof result === 'object') {
            const bookingResult = result as {
              bookingId: string;
              returnBookingId?: string;
            };
            setCurrentBookingId(bookingResult.bookingId);
          }
          setMibBookingDetails(bookingDetails);
          setShowMibPayment(true);

          // Note: MIB session will be created when user clicks "Proceed to Payment" in the modal
        } else {
          // For other payment methods, show success message and reset
          await reset();
          setCurrentStep(1);
          setClientForm({ name: '', email: '', phone: '', idNumber: '' });
          setShowAddNewClientForm(false);
          setTermsAccepted(false);
          setErrors({
            tripType: '',
            departureDate: '',
            returnDate: '',
            route: '',
            returnRoute: '',
            seats: '',
            passengers: '',
            paymentMethod: '',
            terms: '',
            trip: '',
            returnTrip: '',
            client: '',
          });

          // Create success message
          let successMessage = `Your ${
            currentBooking.tripType === 'round_trip' ? 'round trip' : 'one way'
          } booking has been confirmed with QR codes generated.`;
          if (typeof result === 'string') {
            // Legacy single booking ID
            successMessage += `\n\nBooking ID: ${result}`;
          } else if (result && typeof result === 'object') {
            // New format with departure and return booking IDs
            const bookingResult = result as {
              bookingId: string;
              returnBookingId?: string;
            };
            successMessage += `\n\nDeparture Booking ID: ${bookingResult.bookingId}`;
            if (bookingResult.returnBookingId) {
              successMessage += `\nReturn Booking ID: ${bookingResult.returnBookingId}`;
            }
          }

          showSuccess('Booking Created', successMessage, () => {
            // Trigger refresh immediately before navigation
            useAgentStore
              .getState()
              .refreshBookingsData()
              .then(() => {
                router.push('/(app)/(agent)/(tabs)/bookings');
              });
          });
        }
      } catch (error) {
        console.error('Booking creation failed:', error);
        showError(
          'Booking Failed',
          (error as any)?.message ||
            'The booking could not be created. Please try again.'
        );
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `MVR ${amount.toFixed(2)}`;
  };

  // Format route options for dropdown
  const routeOptions = (availableRoutes || []).map(route => ({
    label: `${route.fromIsland?.name || 'Unknown'} → ${
      route.toIsland?.name || 'Unknown'
    }`,
    value: route.id,
  }));

  const tripOptions = (trips || []).map(trip => ({
    label: `${String(trip.departure_time || '').slice(0, 5)} - ${
      trip.vessel_name || 'Unknown'
    } (${String(trip.available_seats || 0)} seats)`,
    value: trip.id,
  }));

  const returnTripOptions = (returnTrips || []).map(trip => ({
    label: `${String(trip.departure_time || '').slice(0, 5)} - ${
      trip.vessel_name || 'Unknown'
    } (${String(trip.available_seats || 0)} seats)`,
    value: trip.id,
  }));

  // Payment method options - using the centralized options from utils
  const paymentOptions = [...AGENT_PAYMENT_OPTIONS];

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        // Combined Trip, Route & Date Selection (like customer booking)
        return (
          <TripRouteSelectionStep
            tripType={currentBooking.tripType}
            onTripTypeChange={setTripType}
            departureDate={currentBooking.departureDate}
            returnDate={currentBooking.returnDate}
            onDepartureDateChange={setDepartureDate}
            onReturnDateChange={setReturnDate}
            routes={availableRoutes || []}
            selectedRoute={currentBooking.route}
            selectedReturnRoute={currentBooking.returnRoute}
            onRouteChange={setRoute}
            onReturnRouteChange={setReturnRoute}
            trips={(trips || []) as any}
            returnTrips={(returnTrips || []) as any}
            selectedTrip={currentBooking.trip}
            selectedReturnTrip={currentBooking.returnTrip}
            onTripChange={setTrip as any}
            onReturnTripChange={setReturnTrip as any}
            isLoadingRoutes={routeLoading}
            isLoadingTrips={tripLoading}
            errors={errors}
            clearError={field => setErrors({ ...errors, [field]: '' })}
          />
        );

      case 2:
        // Client Selection (agent-specific step)
        return (
          <ClientInfoStep
            selectedClient={currentBooking.client}
            onClientChange={setClient}
            searchQuery={localSearchQuery}
            onSearchQueryChange={handleClientSearchInputChange}
            searchResults={clientSearchResults}
            isSearching={isSearchingClients}
            onSelectClient={handleSelectExistingClient}
            showAddForm={showAddNewClientForm}
            onToggleAddForm={setShowAddNewClientForm}
            clientForm={clientForm}
            onClientFormChange={handleClientFormChange}
            onSaveNewClient={handleSaveClient}
            errors={errors}
            clearError={setError}
          />
        );

      case 3:
        // Seat Selection
        return (
          <SeatSelectionStep
            availableSeats={availableSeats}
            availableReturnSeats={availableReturnSeats}
            selectedSeats={currentBooking.selectedSeats}
            selectedReturnSeats={currentBooking.returnSelectedSeats}
            onSeatToggle={toggleSeatSelection}
            tripType={currentBooking.tripType}
            isLoading={combinedLoading}
            totalFare={currentBooking.totalFare || 0}
            discountRate={currentBooking.discountRate}
            discountedFare={currentBooking.discountedFare}
            agent={storeAgent}
            errors={errors}
            clearError={setError}
          />
        );

      case 4:
        // Passenger Details
        return (
          <PassengerDetailsStep
            passengers={currentBooking.passengers}
            onPassengerChange={updatePassengerDetail}
            selectedSeats={currentBooking.selectedSeats}
            selectedReturnSeats={currentBooking.returnSelectedSeats}
            tripType={currentBooking.tripType}
            errors={errors}
            clearError={setError}
          />
        );

      case 5:
        // Payment & Confirmation
        return (
          <PaymentStep
            client={currentBooking.client}
            tripType={currentBooking.tripType}
            route={currentBooking.route}
            returnRoute={currentBooking.returnRoute}
            departureDate={currentBooking.departureDate}
            returnDate={currentBooking.returnDate}
            selectedSeats={currentBooking.selectedSeats}
            selectedReturnSeats={currentBooking.returnSelectedSeats}
            passengers={currentBooking.passengers}
            totalFare={currentBooking.totalFare || 0}
            discountedFare={currentBooking.discountedFare}
            agent={storeAgent}
            paymentMethod={currentBooking.paymentMethod}
            onPaymentMethodChange={method =>
              setPaymentMethod(method as 'credit' | 'mib' | 'free')
            }
            termsAccepted={termsAccepted}
            onTermsToggle={() => setTermsAccepted(!termsAccepted)}
            errors={errors}
            clearError={setError}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Progress Stepper */}
      <View style={styles.progressContainer}>
        <BookingProgressStepper
          steps={BOOKING_STEPS}
          currentStep={currentStep}
        />
      </View>

      <Card variant='elevated' style={styles.bookingCard}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Current Step Content */}
        {renderCurrentStep()}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <Button
              title='Back'
              onPress={handleBack}
              variant='outline'
              style={styles.navigationButton}
            />
          )}

          {currentStep < 5 ? (
            <Button
              title='Next'
              onPress={handleNext}
              style={
                currentStep === 1
                  ? styles.singleButton
                  : styles.navigationButton
              }
            />
          ) : (
            <Button
              title='Confirm Booking'
              onPress={handleCreateBooking}
              loading={combinedLoading}
              disabled={combinedLoading}
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
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to agent payment success page immediately without resetting booking state
            // The payment success page will handle the booking state reset
            router.push({
              pathname: '/(app)/(agent)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'SUCCESS',
                sessionId: result.sessionId,
                resetBooking: 'true', // Flag to indicate booking should be reset
              },
            });
          }}
          onFailure={error => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to agent payment success page with failure status
            // Don't reset booking state so user can retry payment
            router.push({
              pathname: '/(app)/(agent)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'FAILURE',
                resetBooking: 'false', // Don't reset booking on failure
              },
            });
          }}
          onCancel={() => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);

            // Navigate to agent payment success page with cancelled status
            // Don't reset booking state so user can retry payment
            router.push({
              pathname: '/(app)/(agent)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'CANCELLED',
                resetBooking: 'false', // Don't reset booking on cancellation
              },
            });
          }}
        />
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
  progressContainer: {
    marginBottom: 24,
  },
  bookingCard: {
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
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
  singleButton: {
    flex: 1,
    marginLeft: 'auto',
    marginRight: 8,
  },
});
