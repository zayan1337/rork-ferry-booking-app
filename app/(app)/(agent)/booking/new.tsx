import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ViewStyle,
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
  UserPlus,
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

import { Passenger } from "@/types";
import {
  BookingProgressStepper,
  RouteAndDateStep,
  TripSelectionStep,
  ClientInfoStep,
  SeatSelectionStep,
  PassengerDetailsStep,
  PaymentStep,
} from "@/components/booking";
import { useBookingFormValidation } from "@/hooks/useBookingFormValidation";
import { useBookingClientSearch } from "@/hooks/useBookingClientSearch";
import {
  generateBookingSuccessMessage,
  validateBookingStep,
} from "@/utils/bookingFormUtils";

const BOOKING_STEPS = [
  { id: 1, label: "Route", description: "Select route & date" },
  { id: 2, label: "Trip", description: "Choose departure & return trips" },
  { id: 3, label: "Client", description: "Select or add client" },
  { id: 4, label: "Seats", description: "Choose seats" },
  { id: 5, label: "Details", description: "Passenger information" },
  { id: 6, label: "Payment", description: "Payment & confirmation" },
];

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
    validateAgentAccess,
  } = useAgentBookingFormStore();

  // Local form state
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    phone: "",
    idNumber: "",
  });
  const [showAddNewClientForm, setShowAddNewClientForm] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({
    tripType: "",
    departureDate: "",
    returnDate: "",
    route: "",
    returnRoute: "",
    seats: "",
    passengers: "",
    paymentMethod: "",
    terms: "",
    trip: "",
    returnTrip: "",
    client: "",
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
      const selectedClient = clients.find((c) => c.id === clientId);
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
          idNumber: "",
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
          fullName: currentBooking.passengers[index]?.fullName || "",
          idNumber: currentBooking.passengers[index]?.idNumber || "",
          specialAssistance:
            currentBooking.passengers[index]?.specialAssistance || "",
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
    if (currentStep !== 3) {
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
      setClientForm({ name: "", email: "", phone: "", idNumber: "" });
      if (errors.client) setErrors({ ...errors, client: "" });
    } else {
      if (currentStep === 3) {
        setLocalSearchQuery("");
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClientFormChange = (field: string, value: string) => {
    setClientForm((prev) => ({ ...prev, [field]: value }));
    if (errors.client) setErrors({ ...errors, client: "" });
  };

  const handleSaveClient = () => {
    if (!clientForm.name || !clientForm.email || !clientForm.phone) {
      setError("Please fill all required client fields (name, email, phone)");
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
    setLocalSearchQuery("");
    setShowAddNewClientForm(false);
    if (errors.client) setErrors({ ...errors, client: "" });
  };

  const handleShowAddNewClient = () => {
    setShowAddNewClientForm(true);
    clearClientSearch();
    // Pre-fill with search query if it looks like an email
    if (localSearchQuery.includes("@")) {
      setClientForm((prev) => ({ ...prev, email: localSearchQuery }));
    } else if (localSearchQuery.match(/^\d+$/)) {
      setClientForm((prev) => ({ ...prev, phone: localSearchQuery }));
    }
  };

  const handleCreateBooking = async () => {
    if (validateStep(6)) {
      try {
        const result = await createBooking();

        // Reset states
        reset();
        setCurrentStep(1);
        setClientForm({ name: "", email: "", phone: "", idNumber: "" });
        setShowAddNewClientForm(false);
        setTermsAccepted(false);
        setErrors({
          tripType: "",
          departureDate: "",
          returnDate: "",
          route: "",
          returnRoute: "",
          seats: "",
          passengers: "",
          paymentMethod: "",
          terms: "",
          trip: "",
          returnTrip: "",
          client: "",
        });

        // Create success message
        let successMessage = `Your ${
          currentBooking.tripType === "round_trip" ? "round trip" : "one way"
        } booking has been confirmed with QR codes generated.`;
        if (typeof result === "string") {
          // Legacy single booking ID
          successMessage += `\n\nBooking ID: ${result}`;
        } else if (result && typeof result === "object") {
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

        Alert.alert("Booking Created", successMessage, [
          {
            text: "View Bookings",
            onPress: () => {
              // Trigger refresh immediately before navigation
              useAgentStore
                .getState()
                .refreshBookingsData()
                .then(() => {
                  router.push("/(app)/(agent)/(tabs)/bookings");
                });
            },
          },
          {
            text: "New Booking",
            onPress: () => {
              // Stay on the same page, everything is already reset
            },
          },
        ]);
      } catch (error) {
        console.error("Booking creation failed:", error);
        Alert.alert(
          "Booking Failed",
          (error as any)?.message ||
            "The booking could not be created. Please try again."
        );
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return `MVR ${amount.toFixed(2)}`;
  };

  // Format route options for dropdown
  const routeOptions = (availableRoutes || []).map((route) => ({
    label: `${route.fromIsland?.name || "Unknown"} → ${
      route.toIsland?.name || "Unknown"
    }`,
    value: route.id,
  }));

  const tripOptions = (trips || []).map((trip) => ({
    label: `${String(trip.departure_time || "").slice(0, 5)} - ${
      trip.vessel_name || "Unknown"
    } (${String(trip.available_seats || 0)} seats)`,
    value: trip.id,
  }));

  const returnTripOptions = (returnTrips || []).map((trip) => ({
    label: `${String(trip.departure_time || "").slice(0, 5)} - ${
      trip.vessel_name || "Unknown"
    } (${String(trip.available_seats || 0)} seats)`,
    value: trip.id,
  }));

  // Payment method options
  const paymentOptions = [
    { label: "💳 Agent Credit", value: "credit" },
    { label: "🌐 Payment Gateway", value: "gateway" },
    { label: "🎫 Free Ticket", value: "free" },
  ];

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <RouteAndDateStep
            tripType={currentBooking.tripType}
            onTripTypeChange={setTripType}
            availableRoutes={
              (availableRoutes || []).map((route) => ({
                ...route,
                name: `${route.fromIsland?.name || "Unknown"} to ${
                  route.toIsland?.name || "Unknown"
                }`,
                origin: route.fromIsland?.name || "Unknown",
                destination: route.toIsland?.name || "Unknown",
                from_island_id: route.fromIsland?.id || "",
                to_island_id: route.toIsland?.id || "",
                from_island: route.fromIsland,
                to_island: route.toIsland,
                distance: "0 km",
                duration: route.duration || "0h 0m",
                base_fare: route.baseFare,
                status: "active" as const,
                description: "",
                created_at: "",
                updated_at: "",
              })) as any
            }
            selectedRoute={currentBooking.route}
            selectedReturnRoute={currentBooking.returnRoute}
            onRouteChange={setRoute as any}
            onReturnRouteChange={setReturnRoute as any}
            departureDate={currentBooking.departureDate}
            returnDate={currentBooking.returnDate}
            onDepartureDateChange={setDepartureDate}
            onReturnDateChange={setReturnDate}
            errors={errors}
            clearError={(field) => setErrors({ ...errors, [field]: "" })}
          />
        );

      case 2:
        return (
          <TripSelectionStep
            trips={
              (trips || []).map((trip) => ({
                ...trip,
                estimated_duration: "00:00",
                status: "scheduled" as const,
                booked_seats: 0,
                fare_multiplier: 1,
                created_at: "",
                updated_at: "",
              })) as any
            }
            returnTrips={
              (returnTrips || []).map((trip) => ({
                ...trip,
                estimated_duration: "00:00",
                status: "scheduled" as const,
                booked_seats: 0,
                fare_multiplier: 1,
                created_at: "",
                updated_at: "",
              })) as any
            }
            selectedTrip={currentBooking.trip}
            selectedReturnTrip={currentBooking.returnTrip}
            onTripChange={setTrip}
            onReturnTripChange={setReturnTrip}
            isLoading={tripLoading}
            routeId={currentBooking.route?.id || null}
            returnRouteId={currentBooking.returnRoute?.id || null}
            departureDate={currentBooking.departureDate}
            returnDate={currentBooking.returnDate}
            tripType={currentBooking.tripType}
            errors={errors}
            clearError={setError}
          />
        );

      case 3:
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

      case 4:
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

      case 5:
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

      case 6:
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
            onPaymentMethodChange={(method) =>
              setPaymentMethod(method as "credit" | "gateway" | "free")
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
      <Stack.Screen options={{ title: "New Agent Booking" }} />

      {/* Progress Stepper */}
      <View style={styles.progressContainer}>
        <BookingProgressStepper
          steps={BOOKING_STEPS}
          currentStep={currentStep}
        />
      </View>

      <Card variant="elevated" style={styles.bookingCard}>
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
              style={
                currentStep === 1
                  ? styles.singleButton
                  : styles.navigationButton
              }
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
    marginBottom: 24,
  },
  bookingCard: {
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: "#fee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  navigationButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  singleButton: {
    flex: 1,
    marginLeft: "auto",
    marginRight: 8,
  },
});
