import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Users,
  CreditCard,
  Check,
  User,
  Mail,
  Phone,
  DollarSign,
  Search,
  UserPlus
} from "lucide-react-native";
import { useAgentStore } from "@/store/agent/agentStore";
import { useAgentBookingFormStore } from "@/store/agent/agentBookingFormStore";
import { useRouteStore, useTripStore } from "@/store";
import type { AgentClient } from "@/types/agent";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Dropdown from "@/components/Dropdown";
import SeatSelector from "@/components/SeatSelector";
import DatePicker from "@/components/DatePicker";
import GenerateTripsButton from "@/components/GenerateTripsButton";
import { Passenger } from "@/types";

export default function AgentNewBookingScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();

  // Stores
  const agent = useAgentStore((state) => state.agent);
  const clients = useAgentStore((state) => state.clients);

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
  } = useAgentBookingFormStore();

  // Local state
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  });
  const [showAddNewClientForm, setShowAddNewClientForm] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
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
      fetchTrips(currentBooking.returnRoute.id, currentBooking.returnDate, true);
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
      const newPassengers: Passenger[] = currentBooking.selectedSeats.map((_, index) => ({
        fullName: currentBooking.passengers[index]?.fullName || '',
        idNumber: currentBooking.passengers[index]?.idNumber || '',
        specialAssistance: currentBooking.passengers[index]?.specialAssistance || '',
      }));
      updatePassengers(newPassengers);
    } else if (currentBooking.selectedSeats.length === 0) {
      // Clear passengers when no seats selected
      updatePassengers([]);
    }
  }, [currentBooking.selectedSeats.length, updatePassengers]);

  // Clear client search when leaving step 3 or component unmounts
  useEffect(() => {
    if (currentStep !== 3) {
      clearClientSearch();
    }
  }, [currentStep, clearClientSearch]);

  useEffect(() => {
    return () => {
      clearClientSearch();
    };
  }, [clearClientSearch]);

  const validateStep = (step: number) => {
    const newErrors = { ...errors };
    let isValid = true;

    switch (step) {
      case 1: // Route & Date
        if (!currentBooking.tripType) {
          newErrors.tripType = 'Please select a trip type';
          isValid = false;
        }
        if (!currentBooking.departureDate) {
          newErrors.departureDate = 'Please select a departure date';
          isValid = false;
        }
        if (currentBooking.tripType === 'round_trip' && !currentBooking.returnDate) {
          newErrors.returnDate = 'Please select a return date';
          isValid = false;
        }
        if (!currentBooking.route) {
          newErrors.route = 'Please select a departure route';
          isValid = false;
        }
        if (currentBooking.tripType === 'round_trip' && !currentBooking.returnRoute) {
          newErrors.returnRoute = 'Please select a return route';
          isValid = false;
        }
        break;

      case 2: // Trip Selection
        if (!currentBooking.trip) {
          newErrors.trip = 'Please select a departure trip';
          isValid = false;
        }
        if (currentBooking.tripType === 'round_trip' && !currentBooking.returnTrip) {
          newErrors.returnTrip = 'Please select a return trip';
          isValid = false;
        }
        break;

      case 3: // Client Info
        if (!currentBooking.client) {
          if (showAddNewClientForm) {
            if (!clientForm.name.trim()) {
              newErrors.client = 'Please enter client name';
              isValid = false;
            } else if (!clientForm.email.trim()) {
              newErrors.client = 'Please enter client email';
              isValid = false;
            } else if (!clientForm.phone.trim()) {
              newErrors.client = 'Please enter client phone';
              isValid = false;
            }
            // ID number is optional - no validation required
          } else {
            newErrors.client = 'Please select an existing client or add a new one';
            isValid = false;
          }
        }
        break;

      case 4: // Seat Selection
        if (currentBooking.selectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one seat';
          isValid = false;
        }
        if (currentBooking.tripType === 'round_trip' && currentBooking.returnSelectedSeats.length === 0) {
          newErrors.seats = 'Please select at least one return seat';
          isValid = false;
        }
        if (currentBooking.tripType === 'round_trip' &&
          currentBooking.selectedSeats.length !== currentBooking.returnSelectedSeats.length) {
          newErrors.seats = 'Number of departure and return seats must match';
          isValid = false;
        }
        break;

      case 5: // Passenger Details
        const incompletePassenger = currentBooking.passengers.find(p => !p.fullName.trim());
        if (incompletePassenger) {
          newErrors.passengers = 'Please enter details for all passengers';
          isValid = false;
        }
        break;

      case 6: // Payment
        if (!currentBooking.paymentMethod) {
          newErrors.paymentMethod = 'Please select a payment method';
          isValid = false;
        }
        if (!termsAccepted) {
          newErrors.terms = 'You must accept the terms and conditions';
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // Save client info before moving to seat selection
      if (currentStep === 3) {
        if (showAddNewClientForm) {
          handleSaveClient();
          return;
        } else if (currentBooking.client) {
          setCurrentStep(4); // Move to seat selection
          return;
        }
      }

      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && showAddNewClientForm) {
      // If we're on add new client form, go back to search
      setShowAddNewClientForm(false);
      setClientForm({ name: '', email: '', phone: '', idNumber: '' });
      if (errors.client) setErrors({ ...errors, client: '' });
    } else {
      if (currentStep === 3) {
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

    setCurrentStep(4); // Move to seat selection
  };

  const handleClientSearch = async (query: string) => {
    if (query.length >= 3) { // Start searching after 3 characters
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
    if (validateStep(6)) {
      try {
        const result = await createBooking();

        // Reset states
        reset();
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
        let successMessage = `Your ${currentBooking.tripType === 'round_trip' ? 'round trip' : 'one way'} booking has been confirmed with QR codes generated.`;
        if (typeof result === 'string') {
          // Legacy single booking ID
          successMessage += `\n\nBooking ID: ${result}`;
        } else if (result && typeof result === 'object') {
          // New format with departure and return booking IDs
          const bookingResult = result as { bookingId: string; returnBookingId?: string };
          successMessage += `\n\nDeparture Booking ID: ${bookingResult.bookingId}`;
          if (bookingResult.returnBookingId) {
            successMessage += `\nReturn Booking ID: ${bookingResult.returnBookingId}`;
          }
        }

        Alert.alert(
          "Booking Created",
          successMessage,
          [
            {
              text: "View Bookings",
              onPress: () => {
                // Trigger refresh immediately before navigation
                useAgentStore.getState().refreshBookingsData().then(() => {
                  router.push("/(app)/(agent)/(tabs)/bookings");
                });
              }
            },
            {
              text: "New Booking",
              onPress: () => {
                // Stay on the same page, everything is already reset
              }
            }
          ]
        );
      } catch (error) {
        console.error('Booking creation failed:', error);
        Alert.alert(
          "Booking Failed",
          (error as any)?.message || "The booking could not be created. Please try again.",
        );
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `MVR ${amount.toFixed(2)}`;
  };

  // Format route options for dropdown
  const routeOptions = (availableRoutes || []).map(route => ({
    label: `${route.fromIsland?.name || 'Unknown'} → ${route.toIsland?.name || 'Unknown'}`,
    value: route.id
  }));

  const tripOptions = (trips || []).map(trip => ({
    label: `${String(trip.departure_time || '').slice(0, 5)} - ${trip.vessel_name || 'Unknown'} (${String(trip.available_seats || 0)} seats)`,
    value: trip.id,
  }));

  const returnTripOptions = (returnTrips || []).map(trip => ({
    label: `${String(trip.departure_time || '').slice(0, 5)} - ${trip.vessel_name || 'Unknown'} (${String(trip.available_seats || 0)} seats)`,
    value: trip.id,
  }));

  // Payment method options
  const paymentOptions = [
    { label: '💳 Agent Credit', value: 'credit' },
    { label: '🌐 Payment Gateway', value: 'gateway' },
    { label: '🎫 Free Ticket', value: 'free' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Stack.Screen options={{ title: "New Agent Booking" }} />

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4, 5, 6].map(step => (
          <View key={step} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive
              ]}
            >
              {currentStep > step && (
                <Check size={12} color="#fff" />
              )}
            </View>
            <Text
              style={[
                styles.progressText,
                currentStep >= step && styles.progressTextActive
              ]}
            >
              {step === 1 ? "Route" :
                step === 2 ? "Trip" :
                  step === 3 ? "Client" :
                    step === 4 ? "Seats" :
                      step === 5 ? "Details" :
                        step === 6 ? "Payment" : ""}
            </Text>
          </View>
        ))}
        <View style={styles.progressLine} />
      </View>

      <Card variant="elevated" style={styles.bookingCard}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Step 1: Route & Date Selection */}
        {currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>Select Route & Date</Text>

            <View style={styles.tripTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  currentBooking.tripType === 'one_way' && styles.tripTypeButtonActive
                ]}
                onPress={() => {
                  setTripType('one_way');
                  if (errors.tripType) setErrors({ ...errors, tripType: '' });
                }}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    currentBooking.tripType === 'one_way' && styles.tripTypeTextActive
                  ]}
                >
                  One Way
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tripTypeButton,
                  currentBooking.tripType === 'round_trip' && styles.tripTypeButtonActive
                ]}
                onPress={() => {
                  setTripType('round_trip');
                  if (errors.tripType) setErrors({ ...errors, tripType: '' });
                }}
              >
                <Text
                  style={[
                    styles.tripTypeText,
                    currentBooking.tripType === 'round_trip' && styles.tripTypeTextActive
                  ]}
                >
                  Round Trip
                </Text>
              </TouchableOpacity>
            </View>

            {errors.tripType ? (
              <Text style={styles.errorText}>{errors.tripType}</Text>
            ) : null}

            <Dropdown
              label="Departure Route"
              items={routeOptions}
              value={currentBooking.route?.id || ''}
              onChange={(routeId) => {
                const selectedRoute = (availableRoutes || []).find(r => r.id === routeId);
                if (selectedRoute) {
                  setRoute(selectedRoute);
                  if (errors.route) setErrors({ ...errors, route: '' });
                }
              }}
              placeholder="Select departure route"
              error={errors.route}
              searchable
              required
            />

            <DatePicker
              label="Departure Date"
              value={currentBooking.departureDate}
              onChange={(date) => {
                setDepartureDate(date);
                if (errors.departureDate) setErrors({ ...errors, departureDate: '' });
              }}
              minDate={new Date().toISOString().split('T')[0]}
              error={errors.departureDate}
              required
            />

            {currentBooking.tripType === 'round_trip' && (
              <>
                <Dropdown
                  label="Return Route"
                  items={routeOptions}
                  value={currentBooking.returnRoute?.id || ''}
                  onChange={(routeId) => {
                    const selectedRoute = (availableRoutes || []).find(r => r.id === routeId);
                    if (selectedRoute) {
                      setReturnRoute(selectedRoute);
                      if (errors.returnRoute) setErrors({ ...errors, returnRoute: '' });
                    }
                  }}
                  placeholder="Select return route"
                  error={errors.returnRoute}
                  searchable
                  required
                />

                <DatePicker
                  label="Return Date"
                  value={currentBooking.returnDate}
                  onChange={(date) => {
                    setReturnDate(date);
                    if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
                  }}
                  minDate={currentBooking.departureDate || new Date().toISOString().split('T')[0]}
                  error={errors.returnDate}
                  required
                />
              </>
            )}

            {currentBooking.route && (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Base Fare:</Text>
                <Text style={styles.fareValue}>
                  MVR {(currentBooking.route.baseFare || 0).toFixed(2)} per seat
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Trip Selection */}
        {currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>Select Trips</Text>

            <Dropdown
              label="Select Departure Trip"
              items={tripOptions}
              value={currentBooking.trip?.id || ''}
              onChange={(tripId) => {
                const selectedTrip = (trips || []).find(t => t.id === tripId);
                if (selectedTrip) {
                  setTrip(selectedTrip);
                  if (errors.trip) setErrors({ ...errors, trip: '' });
                }
              }}
              placeholder={tripOptions.length === 0 ? "No departure trips available" : "Select departure trip"}
              error={errors.trip}
              required
              disabled={tripOptions.length === 0}
            />

            {tripOptions.length === 0 && currentBooking.route && currentBooking.departureDate && !tripLoading && (
              <View style={styles.noTripsContainer}>
                <Text style={styles.noTripsText}>
                  No trips available for this route on {new Date(currentBooking.departureDate).toLocaleDateString()}.
                </Text>
                <Text style={styles.noTripsSubtext}>
                  Please try a different date or generate trips for this route.
                </Text>
                <GenerateTripsButton
                  routeId={currentBooking.route.id}
                  date={currentBooking.departureDate}
                  onTripsGenerated={() => {
                    // Refresh trips after generation
                    fetchTrips(currentBooking.route!.id, currentBooking.departureDate!, false);
                  }}
                />
              </View>
            )}

            {tripLoading && currentBooking.route && currentBooking.departureDate && (
              <Text style={styles.loadingText}>Loading departure trips...</Text>
            )}

            {currentBooking.tripType === 'round_trip' && (
              <Dropdown
                label="Select Return Trip"
                items={returnTripOptions}
                value={currentBooking.returnTrip?.id || ''}
                onChange={(tripId) => {
                  const selectedTrip = (returnTrips || []).find(t => t.id === tripId);
                  if (selectedTrip) {
                    setReturnTrip(selectedTrip);
                    if (errors.returnTrip) setErrors({ ...errors, returnTrip: '' });
                  }
                }}
                placeholder={returnTripOptions.length === 0 ? "No return trips available" : "Select return trip"}
                error={errors.returnTrip}
                required
                disabled={returnTripOptions.length === 0}
              />
            )}

            {currentBooking.tripType === 'round_trip' && returnTripOptions.length === 0 && currentBooking.returnRoute && currentBooking.returnDate && !tripLoading && (
              <View style={styles.noTripsContainer}>
                <Text style={styles.noTripsText}>
                  No return trips available for this route on {new Date(currentBooking.returnDate).toLocaleDateString()}.
                </Text>
                <Text style={styles.noTripsSubtext}>
                  Please try a different return date or generate trips for this route.
                </Text>
                <GenerateTripsButton
                  routeId={currentBooking.returnRoute.id}
                  date={currentBooking.returnDate}
                  onTripsGenerated={() => {
                    // Refresh return trips after generation
                    fetchTrips(currentBooking.returnRoute!.id, currentBooking.returnDate!, true);
                  }}
                />
              </View>
            )}

            {currentBooking.tripType === 'round_trip' && tripLoading && currentBooking.returnRoute && currentBooking.returnDate && (
              <Text style={styles.loadingText}>Loading return trips...</Text>
            )}
          </View>
        )}

        {/* Step 3: Client Information */}
        {currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>Client Information</Text>

            {!currentBooking.client && !showAddNewClientForm && (
              <View>
                <Text style={styles.searchLabel}>Search for existing client by email or phone:</Text>
                <Input
                  label=""
                  placeholder="Enter client email or phone number"
                  value={localSearchQuery}
                  onChangeText={handleClientSearchInputChange}
                  keyboardType="email-address"
                />

                {isSearchingClients && (
                  <View style={styles.searchingContainer}>
                    <Text style={styles.searchingText}>Searching...</Text>
                  </View>
                )}

                {clientSearchResults.length > 0 && (
                  <View style={styles.searchResultsContainer}>
                    <Text style={styles.searchResultsTitle}>Found clients:</Text>
                    {clientSearchResults.map((client, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.clientResultItem}
                        onPress={() => handleSelectExistingClient(client)}
                      >
                        <View style={styles.clientResultInfo}>
                          <Text style={styles.clientResultName}>{client.name}</Text>
                          <Text style={styles.clientResultDetails}>
                            {client.email} • {client.phone}
                          </Text>
                          {client.hasAccount && (
                            <Text style={styles.clientResultBadge}>Has Account</Text>
                          )}
                        </View>
                        <ArrowRight size={16} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {localSearchQuery.length >= 3 && clientSearchResults.length === 0 && !isSearchingClients && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No existing clients found</Text>
                  </View>
                )}

                <Button
                  title="Add New Client"
                  onPress={handleShowAddNewClient}
                  variant="outline"
                  style={styles.addNewClientButton}
                />
              </View>
            )}

            {currentBooking.client && !showAddNewClientForm && (
              <View style={styles.selectedClientContainer}>
                <Text style={styles.selectedClientTitle}>Selected Client:</Text>
                <View style={styles.selectedClientInfo}>
                  <Text style={styles.selectedClientName}>{currentBooking.client.name}</Text>
                  <Text style={styles.selectedClientDetails}>
                    {currentBooking.client.email} • {currentBooking.client.phone}
                  </Text>
                  {currentBooking.client.hasAccount && (
                    <Text style={styles.selectedClientBadge}>Has Account</Text>
                  )}
                </View>
                <Button
                  title="Change Client"
                  onPress={() => {
                    setClient(null as any);
                    clearClientSearch();
                    setLocalSearchQuery('');
                    setShowAddNewClientForm(false);
                  }}
                  variant="outline"
                  style={styles.changeClientButton}
                />
              </View>
            )}

            {showAddNewClientForm && (
              <View style={styles.newClientFormContainer}>
                <Text style={styles.newClientFormTitle}>Add New Client</Text>

                <Input
                  label="Client Name"
                  placeholder="Enter client name"
                  value={clientForm.name}
                  onChangeText={(text) => handleClientFormChange('name', text)}
                  required
                />

                <Input
                  label="Client Email"
                  placeholder="Enter client email"
                  value={clientForm.email}
                  onChangeText={(text) => handleClientFormChange('email', text)}
                  keyboardType="email-address"
                  required
                />

                <Input
                  label="Client Phone"
                  placeholder="Enter client phone"
                  value={clientForm.phone}
                  onChangeText={(text) => handleClientFormChange('phone', text)}
                  keyboardType="phone-pad"
                  required
                />

                <Input
                  label="ID Number (Optional)"
                  placeholder="Enter ID number (optional)"
                  value={clientForm.idNumber}
                  onChangeText={(text) => handleClientFormChange('idNumber', text)}
                />
              </View>
            )}

            {errors.client ? (
              <Text style={styles.errorText}>{errors.client}</Text>
            ) : null}
          </View>
        )}

        {/* Step 4: Seat Selection */}
        {currentStep === 4 && (
          <View>
            <Text style={styles.stepTitle}>Select Seats</Text>

            <Text style={styles.seatSectionTitle}>Departure Seats</Text>
            {availableSeats ? (
              <SeatSelector
                seats={availableSeats}
                selectedSeats={currentBooking.selectedSeats || []}
                onSeatToggle={async (seat) => {
                  await toggleSeatSelection(seat, false);
                  if (errors.seats) setErrors({ ...errors, seats: '' });
                }}
                isLoading={combinedLoading}
              />
            ) : (
              <Text style={styles.loadingText}>Loading available seats...</Text>
            )}

            {currentBooking.tripType === 'round_trip' && (
              <>
                <Text style={styles.seatSectionTitle}>Return Seats</Text>
                {availableReturnSeats ? (
                  <SeatSelector
                    seats={availableReturnSeats}
                    selectedSeats={currentBooking.returnSelectedSeats || []}
                    onSeatToggle={async (seat) => {
                      await toggleSeatSelection(seat, true);
                      if (errors.seats) setErrors({ ...errors, seats: '' });
                    }}
                    isLoading={combinedLoading}
                  />
                ) : (
                  <Text style={styles.loadingText}>Loading available return seats...</Text>
                )}
              </>
            )}

            {errors.seats ? (
              <Text style={styles.errorText}>{errors.seats}</Text>
            ) : null}

            {currentBooking.selectedSeats && currentBooking.selectedSeats.length > 0 && (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Total Fare:</Text>
                <Text style={styles.fareValue}>
                  MVR {(currentBooking.totalFare || 0).toFixed(2)}
                </Text>
              </View>
            )}

            {storeAgent && currentBooking.discountRate && currentBooking.discountRate > 0 ? (
              <View style={styles.fareContainer}>
                <Text style={styles.discountLabel}>
                  Agent Discount ({String(currentBooking.discountRate)}%):
                </Text>
                <Text style={styles.discountValue}>
                  MVR {((currentBooking.totalFare || 0) * (currentBooking.discountRate / 100)).toFixed(2)}
                </Text>
              </View>
            ) : null}

            {storeAgent && currentBooking.discountedFare && currentBooking.discountedFare < (currentBooking.totalFare || 0) ? (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Discounted Fare:</Text>
                <Text style={styles.fareValue}>
                  MVR {(currentBooking.discountedFare || 0).toFixed(2)}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Step 5: Passenger Details */}
        {currentStep === 5 && (
          <View>
            <Text style={styles.stepTitle}>Passenger Details</Text>

            {currentBooking.passengers.map((passenger, index) => (
              <View key={index} style={styles.passengerContainer}>
                <Text style={styles.passengerTitle}>
                  Passenger {String(index + 1)} - Seat {String(currentBooking.selectedSeats[index]?.number || 'N/A')}
                </Text>

                <Input
                  label="Full Name"
                  placeholder="Enter passenger name"
                  value={passenger.fullName}
                  onChangeText={(text) => updatePassengerDetail(index, 'fullName', text)}
                  required
                />

                <Input
                  label="ID Number"
                  placeholder="Enter ID number (optional)"
                  value={passenger.idNumber || ''}
                  onChangeText={(text) => updatePassengerDetail(index, 'idNumber', text)}
                />

                <Input
                  label="Special Assistance"
                  placeholder="Any special requirements? (optional)"
                  value={passenger.specialAssistance || ''}
                  onChangeText={(text) => updatePassengerDetail(index, 'specialAssistance', text)}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            {errors.passengers ? (
              <Text style={styles.errorText}>{errors.passengers}</Text>
            ) : null}
          </View>
        )}

        {/* Step 6: Payment */}
        {currentStep === 6 && (
          <View>
            <Text style={styles.stepTitle}>Payment</Text>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Booking Summary</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Client:</Text>
                <Text style={styles.summaryValue}>{currentBooking.client?.name || 'N/A'}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Trip Type:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.tripType === 'one_way' ? 'One Way' : 'Round Trip'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Route:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.route?.fromIsland?.name || 'N/A'} → {currentBooking.route?.toIsland?.name || 'N/A'}
                </Text>
              </View>

              {currentBooking.tripType === 'round_trip' && currentBooking.returnRoute ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Return Route:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.returnRoute.fromIsland?.name || 'N/A'} → {currentBooking.returnRoute.toIsland?.name || 'N/A'}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Departure Date:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.departureDate ? new Date(currentBooking.departureDate).toLocaleDateString() : 'N/A'}
                </Text>
              </View>

              {currentBooking.tripType === 'round_trip' && currentBooking.returnDate ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Return Date:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.returnDate ? new Date(currentBooking.returnDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Passengers:</Text>
                <Text style={styles.summaryValue}>{String(currentBooking.passengers?.length || 0)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Seats:</Text>
                <Text style={styles.summaryValue}>
                  {currentBooking.selectedSeats?.map(seat => String(seat.number || '')).join(', ') || 'None'}
                </Text>
              </View>

              {currentBooking.tripType === 'round_trip' && currentBooking.returnSelectedSeats.length > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Return Seats:</Text>
                  <Text style={styles.summaryValue}>
                    {currentBooking.returnSelectedSeats?.map(seat => String(seat.number || '')).join(', ') || 'None'}
                  </Text>
                </View>
              ) : null}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  MVR {(storeAgent && currentBooking.discountedFare ? currentBooking.discountedFare : currentBooking.totalFare || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <Dropdown
              label="Payment Method"
              items={paymentOptions}
              value={currentBooking.paymentMethod || ''}
              onChange={(value) => {
                setPaymentMethod(value as 'credit' | 'gateway' | 'free');
                if (errors.paymentMethod) setErrors({ ...errors, paymentMethod: '' });
              }}
              placeholder="Select payment method"
              error={errors.paymentMethod}
              required
            />

            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => {
                  setTermsAccepted(!termsAccepted);
                  if (errors.terms) setErrors({ ...errors, terms: '' });
                }}
              >
                <View style={[
                  styles.checkboxInner,
                  termsAccepted && styles.checkboxChecked
                ]} />
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Text style={styles.termsLink}>Terms and Conditions</Text>
              </Text>
            </View>

            {errors.terms ? (
              <Text style={styles.errorText}>{errors.terms}</Text>
            ) : null}
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              style={styles.navigationButton}
            />
          )}

          {currentStep < 6 ? (
            <Button
              title="Next"
              onPress={handleNext}
              style={currentStep === 1 ? styles.singleButton : styles.navigationButton}
            />
          ) : (
            <Button
              title="Confirm Booking"
              onPress={handleCreateBooking}
              loading={combinedLoading}
              disabled={combinedLoading}
              style={styles.navigationButton}
            />
          )}
        </View>
      </Card>
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
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  tripTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tripTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  tripTypeTextActive: {
    color: Colors.card,
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
  discountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
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
    marginBottom: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  searchingContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  searchingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  searchResultsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  clientResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
  },
  clientResultInfo: {
    flex: 1,
  },
  clientResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  clientResultDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  clientResultBadge: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  noResultsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addNewClientButton: {
    marginTop: 16,
  },
  selectedClientContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedClientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  selectedClientInfo: {
    marginBottom: 12,
  },
  selectedClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedClientDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectedClientBadge: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  changeClientButton: {
    marginTop: 16,
  },
  newClientFormContainer: {
    marginTop: 16,
  },
  newClientFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  noTripsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  noTripsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  noTripsSubtext: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 16,
  },
});