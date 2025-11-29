import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Check } from 'lucide-react-native';

import { useAgentStore } from '@/store/agent/agentStore';
import { useAgentBookingFormStore } from '@/store/agent/agentBookingFormStore';
import type { AgentClient } from '@/types/agent';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

import { Passenger, Seat } from '@/types';
import {
  ClientInfoStep,
  SeatSelectionStep,
  PassengerDetailsStep,
  PaymentStep,
} from '@/components/booking';
import AgentIslandDateStep from '@/components/booking/steps/AgentIslandDateStep';
import AgentTripSelectionStep from '@/components/booking/steps/AgentTripSelectionStep';
import {
  validateBookingStep,
  AGENT_PAYMENT_OPTIONS,
} from '@/utils/bookingFormUtils';
import MibPaymentWebView from '@/components/MibPaymentWebView';
import { useAlertContext } from '@/components/AlertProvider';
import { AGENT_BOOKING_STEPS, AGENT_STEP_LABELS } from '@/constants/agent';
import { usePaymentSessionStore } from '@/store/paymentSessionStore';
import { BUFFER_MINUTES_PAYMENT_WINDOW } from '@/constants/customer';
import { getMinutesUntilDeparture } from '@/utils/bookingUtils';
import {
  calculateBookingExpiry,
  combineTripDateTime,
} from '@/utils/bookingExpiryUtils';

const BOOKING_STEPS = [
  {
    id: AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION,
    label: AGENT_STEP_LABELS[AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION],
    description: 'Island, date & trip selection',
  },
  {
    id: AGENT_BOOKING_STEPS.TRIP_SELECTION,
    label: AGENT_STEP_LABELS[AGENT_BOOKING_STEPS.TRIP_SELECTION],
    description: 'Select trip',
  },
  {
    id: AGENT_BOOKING_STEPS.CLIENT_SELECTION,
    label: AGENT_STEP_LABELS[AGENT_BOOKING_STEPS.CLIENT_SELECTION],
    description: 'Select or add client',
  },
  {
    id: AGENT_BOOKING_STEPS.SEAT_SELECTION,
    label: AGENT_STEP_LABELS[AGENT_BOOKING_STEPS.SEAT_SELECTION],
    description: 'Choose seats',
  },
  {
    id: AGENT_BOOKING_STEPS.PASSENGER_DETAILS,
    label: AGENT_STEP_LABELS[AGENT_BOOKING_STEPS.PASSENGER_DETAILS],
    description: 'Passenger information',
  },
  {
    id: AGENT_BOOKING_STEPS.PAYMENT,
    label: AGENT_STEP_LABELS[AGENT_BOOKING_STEPS.PAYMENT],
    description: 'Payment & confirmation',
  },
];

export default function AgentNewBookingScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const { showSuccess, showError } = useAlertContext();

  // Stores
  const agent = useAgentStore(state => state.agent);
  const clients = useAgentStore(state => state.clients);

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
    setBoardingIsland,
    setDestinationIsland,
    setReturnBoardingIsland,
    setReturnDestinationIsland,
    setClient,
    createNewClient,
    searchClients,
    clearClientSearch,
    setClientSearchQuery,
    fetchAvailableSeats,
    refreshAvailableSeatsSilently,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
    cleanupSeatSubscriptions,
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
  const [localSelectedSeats, setLocalSelectedSeats] = useState([] as Seat[]);
  const [localReturnSelectedSeats, setLocalReturnSelectedSeats] = useState(
    [] as Seat[]
  );
  const [loadingSeats, setLoadingSeats] = useState<Set<string>>(new Set());
  const [seatErrors, setSeatErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalSelectedSeats(currentBooking.selectedSeats);
  }, [currentBooking.selectedSeats]);

  useEffect(() => {
    setLocalReturnSelectedSeats(currentBooking.returnSelectedSeats);
  }, [currentBooking.returnSelectedSeats]);

  // MIB Payment WebView state
  const [showMibPayment, setShowMibPayment] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState('');
  const [mibSessionData, setMibSessionData] = useState<any>(null);
  const [mibBookingDetails, setMibBookingDetails] = useState<any>(null);

  // Payment session management
  const setPaymentSession = usePaymentSessionStore(state => state.setSession);
  const clearPaymentSession = usePaymentSessionStore(
    state => state.clearSession
  );
  const updatePaymentSession = usePaymentSessionStore(
    state => state.updateSession
  );
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
  const combinedLoading = isLoading;

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

  useEffect(() => {
    const tripId = currentBooking.trip?.id;
    if (!tripId) {
      return;
    }
    subscribeSeatUpdates(tripId, false);
    return () => {
      unsubscribeSeatUpdates(tripId, false);
    };
  }, [currentBooking.trip?.id, subscribeSeatUpdates, unsubscribeSeatUpdates]);

  useEffect(() => {
    const returnTripId = currentBooking.returnTrip?.id;
    if (!returnTripId) {
      return;
    }
    subscribeSeatUpdates(returnTripId, true);
    return () => {
      unsubscribeSeatUpdates(returnTripId, true);
    };
  }, [
    currentBooking.returnTrip?.id,
    subscribeSeatUpdates,
    unsubscribeSeatUpdates,
  ]);

  useEffect(() => {
    if (currentStep !== AGENT_BOOKING_STEPS.SEAT_SELECTION) {
      return;
    }

    const interval = setInterval(() => {
      if (currentBooking.trip?.id) {
        refreshAvailableSeatsSilently(currentBooking.trip.id, false);
      }
      if (currentBooking.returnTrip?.id) {
        refreshAvailableSeatsSilently(currentBooking.returnTrip.id, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [
    currentStep,
    currentBooking.trip?.id,
    currentBooking.returnTrip?.id,
    refreshAvailableSeatsSilently,
  ]);

  useEffect(() => {
    return () => {
      cleanupSeatSubscriptions();
    };
  }, [cleanupSeatSubscriptions]);

  // Auto-generate passengers array when seats are selected
  useEffect(() => {
    if (currentBooking.selectedSeats.length > 0) {
      const newPassengers: Passenger[] = currentBooking.selectedSeats.map(
        (_, index) => ({
          fullName: currentBooking.passengers[index]?.fullName || '',
          idNumber: currentBooking.passengers[index]?.idNumber || '',
          phoneNumber: currentBooking.passengers[index]?.phoneNumber || '',
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

  const handleSeatToggle = async (seat: Seat, isReturn = false) => {
    if (loadingSeats.has(seat.id)) return;

    setLoadingSeats(prev => new Set(prev).add(seat.id));
    setSeatErrors(prev => ({ ...prev, [seat.id]: '' }));

    try {
      await toggleSeatSelection(seat, isReturn);
      if (errors.seats) setErrors(prev => ({ ...prev, seats: '' }));
    } catch (error: any) {
      setSeatErrors(prev => ({ ...prev, [seat.id]: error.message }));
      showError('Seat Selection Error', error.message);
    } finally {
      setLoadingSeats(prev => {
        const newSet = new Set(prev);
        newSet.delete(seat.id);
        return newSet;
      });
    }
  };

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
      // Handle island/date step - move to trip selection
      if (currentStep === AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION) {
        setCurrentStep(AGENT_BOOKING_STEPS.TRIP_SELECTION);
        return;
      }

      // Save client info before moving to seat selection
      if (currentStep === AGENT_BOOKING_STEPS.CLIENT_SELECTION) {
        if (showAddNewClientForm) {
          handleSaveClient();
          return;
        } else if (currentBooking.client) {
          setCurrentStep(AGENT_BOOKING_STEPS.SEAT_SELECTION);
          return;
        }
      }

      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
    }
  };

  const handleFindTrips = () => {
    // Move to trip selection step
    setCurrentStep(AGENT_BOOKING_STEPS.TRIP_SELECTION);
  };

  const handleBack = () => {
    if (
      currentStep === AGENT_BOOKING_STEPS.CLIENT_SELECTION &&
      showAddNewClientForm
    ) {
      // If we're on add new client form, go back to search
      setShowAddNewClientForm(false);
      setClientForm({ name: '', email: '', phone: '', idNumber: '' });
      if (errors.client) setErrors({ ...errors, client: '' });
    } else {
      if (currentStep === AGENT_BOOKING_STEPS.CLIENT_SELECTION) {
        setLocalSearchQuery('');
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle hardware back button to go to previous booking step instead of leaving screen
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (currentStep === AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION) {
          return false; // allow default behavior (leave screen)
        }

        handleBack();
        return true; // prevent default behavior
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [currentStep, handleBack])
  );

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
    // Validate Payment step (step 6) which includes terms acceptance
    if (validateStep(AGENT_BOOKING_STEPS.PAYMENT)) {
      // Additional explicit check for terms acceptance as safety measure
      if (!termsAccepted) {
        setError('You must accept the terms and conditions to proceed');
        showError(
          'Terms and Conditions Required',
          'Please accept the terms and conditions before confirming your booking.'
        );
        return;
      }

      try {
        // Validate payment method BEFORE creating booking
        if (currentBooking.paymentMethod === 'credit') {
          // Calculate required amount
          const routeBaseFare = Number(currentBooking.route?.baseFare || 0);
          const fareMultiplier = Number(
            currentBooking.trip?.fare_multiplier || 1.0
          );
          const tripFare = routeBaseFare * fareMultiplier;
          const originalFare = currentBooking.selectedSeats.length * tripFare;
          const discountedFare =
            originalFare * (1 - (storeAgent?.discountRate || 0) / 100);

          let returnDiscountedFare = 0;
          if (
            currentBooking.tripType === 'round_trip' &&
            currentBooking.returnTrip &&
            currentBooking.returnRoute
          ) {
            const returnRouteBaseFare = Number(
              currentBooking.returnRoute?.baseFare || 0
            );
            const returnFareMultiplier = Number(
              currentBooking.returnTrip?.fare_multiplier || 1.0
            );
            const returnTripFare = returnRouteBaseFare * returnFareMultiplier;
            const returnOriginalFare =
              currentBooking.returnSelectedSeats.length * returnTripFare;
            returnDiscountedFare =
              returnOriginalFare * (1 - (storeAgent?.discountRate || 0) / 100);
          }

          const totalRequiredAmount = discountedFare + returnDiscountedFare;

          // Validate credit balance
          const { validateAgentCredit } = await import('@/utils/agentUtils');
          const creditValidation = validateAgentCredit(
            storeAgent,
            totalRequiredAmount
          );
          if (!creditValidation.isValid) {
            showError(
              'Credit Payment Not Available',
              creditValidation.error ||
                'Cannot proceed with credit payment. Please use a different payment method.'
            );
            return;
          }
        }

        // Validate free ticket payment BEFORE creating booking
        if (currentBooking.paymentMethod === 'free') {
          const totalTicketsNeeded =
            currentBooking.selectedSeats.length +
            currentBooking.returnSelectedSeats.length;

          // Validate free tickets
          const { validateAgentFreeTickets } = await import(
            '@/utils/agentUtils'
          );
          const freeTicketValidation = validateAgentFreeTickets(
            storeAgent,
            totalTicketsNeeded
          );
          if (!freeTicketValidation.isValid) {
            showError(
              'Free Ticket Payment Not Available',
              freeTicketValidation.error ||
                'Cannot proceed with free ticket payment. Please use a different payment method.'
            );
            return;
          }
        }

        const result = await createBooking();
        const resultObject =
          result && typeof result === 'object'
            ? (result as {
                bookingId: string;
                bookingNumber?: string;
                returnBookingId?: string | null;
                returnBookingNumber?: string | null;
                receiptNumber?: string | null;
              })
            : null;

        const bookingId =
          typeof result === 'string' ? result : resultObject?.bookingId || '';
        const primaryBookingNumber =
          resultObject?.bookingNumber ||
          (typeof result === 'string' ? result : bookingId);
        const linkedReturnBookingId = resultObject?.returnBookingId || null;
        const linkedReturnBookingNumber =
          resultObject?.returnBookingNumber || null;
        const bookingReceiptNumber = resultObject?.receiptNumber || null;

        // Handle MIB payment differently
        if (currentBooking.paymentMethod === 'mib') {
          const isRoundTrip = currentBooking.tripType === 'round_trip';
          const outboundRoute = `${
            currentBooking.route?.fromIsland?.name ||
            currentBooking.boardingIslandName ||
            'N/A'
          } → ${
            currentBooking.route?.toIsland?.name ||
            currentBooking.destinationIslandName ||
            'N/A'
          }`;
          const returnRoute =
            isRoundTrip &&
            (currentBooking.returnRoute?.fromIsland?.name ||
              currentBooking.returnBoardingIslandName)
              ? `${
                  currentBooking.returnRoute?.fromIsland?.name ||
                  currentBooking.returnBoardingIslandName ||
                  'N/A'
                } → ${
                  currentBooking.returnRoute?.toIsland?.name ||
                  currentBooking.returnDestinationIslandName ||
                  'N/A'
                }`
              : null;
          const bookingNumbersSummary =
            isRoundTrip && linkedReturnBookingNumber
              ? `${primaryBookingNumber} / ${linkedReturnBookingNumber}`
              : primaryBookingNumber;
          const routeSummary =
            isRoundTrip && returnRoute
              ? `${outboundRoute} / ${returnRoute}`
              : outboundRoute;

          // Prepare booking details for the payment modal
          const bookingDetails = {
            bookingNumber: bookingNumbersSummary,
            route: routeSummary,
            travelDate:
              currentBooking.departureDate || new Date().toISOString(),
            returnDate:
              isRoundTrip && currentBooking.returnDate
                ? currentBooking.returnDate
                : null,
            amount:
              currentBooking.discountedFare || currentBooking.totalFare || 0,
            currency: 'MVR',
            passengerCount: currentBooking.selectedSeats.length,
            receiptNumber: bookingReceiptNumber || undefined,
            isRoundTrip,
          };

          // Calculate payment window expiry
          const tripInfo = {
            travelDate:
              currentBooking.departureDate || new Date().toISOString(),
            departureTime:
              currentBooking.trip?.departure_time ||
              currentBooking.trip?.departureTime ||
              '00:00',
          };

          // Calculate smart expiry time
          const bookingCreatedAt = new Date();
          const tripDeparture = combineTripDateTime(
            tripInfo.travelDate,
            tripInfo.departureTime
          );
          const expiryCalculation = calculateBookingExpiry(
            bookingCreatedAt,
            tripDeparture
          );

          // Calculate payment window seconds
          const calculatePaymentWindowSeconds = () => {
            let maxTimerSeconds = BUFFER_MINUTES_PAYMENT_WINDOW * 60;
            const minutesUntilDeparture = getMinutesUntilDeparture(
              tripInfo.travelDate,
              tripInfo.departureTime
            );
            if (minutesUntilDeparture > 0) {
              maxTimerSeconds = Math.max(
                30,
                Math.min(maxTimerSeconds, minutesUntilDeparture * 60)
              );
            } else {
              maxTimerSeconds = 0;
            }
            return maxTimerSeconds;
          };

          const seconds = calculatePaymentWindowSeconds();
          const timerExpiry = new Date(Date.now() + seconds * 1000);
          const expiresAtDate = new Date(
            Math.min(
              timerExpiry.getTime(),
              expiryCalculation.expiresAt.getTime()
            )
          );

          // Set payment session - bind to current agent
          if (storeAgent?.id) {
            setPaymentSession({
              bookingId: bookingId,
              userId: storeAgent.id,
              userRole: 'agent',
              bookingDetails: bookingDetails,
              context: 'booking',
              tripInfo,
              sessionData: null,
              startedAt: new Date().toISOString(),
              expiresAt: expiresAtDate.toISOString(),
            });
          }

          // Show modal immediately with booking details
          setCurrentBookingId(bookingId);
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
            successMessage += `\n\nDeparture Booking ID: ${bookingId}`;
            if (linkedReturnBookingId) {
              successMessage += `\nReturn Booking ID: ${linkedReturnBookingId}`;
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

  // Payment method options - using the centralized options from utils
  const paymentOptions = [...AGENT_PAYMENT_OPTIONS];

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION:
        // Island & Date Selection (island-based, like customer)
        return <AgentIslandDateStep onFindTrips={handleFindTrips} />;

      case AGENT_BOOKING_STEPS.TRIP_SELECTION:
        // Trip Selection (auto-discovered trips)
        return <AgentTripSelectionStep />;

      case AGENT_BOOKING_STEPS.CLIENT_SELECTION:
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

      case AGENT_BOOKING_STEPS.SEAT_SELECTION:
        // Seat Selection
        return (
          <SeatSelectionStep
            availableSeats={availableSeats}
            availableReturnSeats={availableReturnSeats}
            selectedSeats={localSelectedSeats}
            selectedReturnSeats={localReturnSelectedSeats}
            onSeatToggle={handleSeatToggle}
            tripType={currentBooking.tripType}
            isLoading={combinedLoading}
            totalFare={currentBooking.totalFare || 0}
            discountRate={currentBooking.discountRate}
            discountedFare={currentBooking.discountedFare}
            agent={storeAgent}
            errors={errors}
            clearError={setError}
            loadingSeats={loadingSeats}
            seatErrors={seatErrors}
            departureTripId={currentBooking.trip?.id || null}
            returnTripId={currentBooking.returnTrip?.id || null}
            onSeatsUpdated={(updatedSeats, isReturn) => {
              // Sync local state when seats are updated via real-time
              if (isReturn) {
                // Return seats are managed by store, no local sync needed
              } else {
                // Departure seats - sync if needed
                // The store already manages this, so we just ensure local state is in sync
              }
            }}
          />
        );

      case AGENT_BOOKING_STEPS.PASSENGER_DETAILS:
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

      case AGENT_BOOKING_STEPS.PAYMENT:
        // Payment & Confirmation
        return (
          <PaymentStep
            client={currentBooking.client}
            tripType={currentBooking.tripType}
            route={currentBooking.route}
            returnRoute={currentBooking.returnRoute}
            departureDate={currentBooking.departureDate}
            returnDate={currentBooking.returnDate}
            departureTime={
              currentBooking.trip?.departure_time ||
              currentBooking.trip?.departureTime ||
              null
            }
            returnTime={
              currentBooking.returnTrip?.departure_time ||
              currentBooking.returnTrip?.departureTime ||
              null
            }
            selectedSeats={currentBooking.selectedSeats}
            selectedReturnSeats={currentBooking.returnSelectedSeats}
            passengers={currentBooking.passengers}
            boardingIslandName={currentBooking.boardingIslandName}
            destinationIslandName={currentBooking.destinationIslandName}
            returnBoardingIslandName={currentBooking.returnBoardingIslandName}
            returnDestinationIslandName={
              currentBooking.returnDestinationIslandName
            }
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
      {/* Progress Steps - Matching customer portal style */}
      <View style={styles.progressContainer}>
        {BOOKING_STEPS.map(step => (
          <View key={step.id} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep >= step.id && styles.progressDotActive,
              ]}
            >
              {currentStep > step.id && <Check size={12} color='#fff' />}
            </View>
            <Text
              style={[
                styles.progressText,
                currentStep >= step.id && styles.progressTextActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        ))}
        <View style={styles.progressLine} />
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
          {currentStep > AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION && (
            <Button
              title='Back'
              onPress={handleBack}
              variant='outline'
              style={styles.navigationButton}
            />
          )}

          {currentStep ===
          AGENT_BOOKING_STEPS.ISLAND_DATE_SELECTION ? null : currentStep === // Island/Date step - button is inside AgentIslandDateStep
            AGENT_BOOKING_STEPS.TRIP_SELECTION ? (
            <Button
              title='Next'
              onPress={handleNext}
              style={styles.navigationButton}
              disabled={
                !currentBooking.trip ||
                (currentBooking.tripType === 'round_trip' &&
                  !currentBooking.returnTrip)
              }
            />
          ) : currentStep < AGENT_BOOKING_STEPS.PAYMENT ? (
            <Button
              title='Next'
              onPress={handleNext}
              style={styles.navigationButton}
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
            clearPaymentSession();
          }}
          onSessionCreated={session => {
            setMibSessionData(session);
            updatePaymentSession({ sessionData: session });
          }}
          tripInfo={
            currentBooking.departureDate && currentBooking.trip
              ? {
                  travelDate: currentBooking.departureDate,
                  departureTime:
                    currentBooking.trip.departure_time ||
                    currentBooking.trip.departureTime ||
                    '00:00',
                }
              : undefined
          }
          onTimerExpired={async () => {
            // Clear session and show message
            clearPaymentSession();
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);
            showError(
              'Payment Session Expired',
              'The payment window has expired. The booking may have been automatically cancelled.'
            );
          }}
          onSuccess={result => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);
            clearPaymentSession();

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
            clearPaymentSession();

            // Navigate to agent payment success page with failure status
            // Reset booking state on failure
            router.push({
              pathname: '/(app)/(agent)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'FAILURE',
                resetBooking: 'true', // Reset booking on failure
              },
            });
          }}
          onCancel={() => {
            // Close the modal first
            setShowMibPayment(false);
            setCurrentBookingId('');
            setMibSessionData(null);
            setMibBookingDetails(null);
            clearPaymentSession();

            // Navigate to agent payment success page with cancelled status
            // Reset booking state on cancellation
            router.push({
              pathname: '/(app)/(agent)/payment-success',
              params: {
                bookingId: currentBookingId,
                result: 'CANCELLED',
                resetBooking: 'true', // Reset booking on cancellation
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
});
