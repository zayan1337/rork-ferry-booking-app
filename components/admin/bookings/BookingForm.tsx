import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import { AdminBookingFormData, AdminPassenger } from '@/types/admin/management';
import Button from '@/components/admin/Button';
import TextInput from '@/components/admin/TextInput';
import Dropdown from '@/components/admin/Dropdown';
import Switch from '@/components/admin/Switch';
import { useUserStore } from '@/store/admin/userStore';
import { useTripStore } from '@/store/admin/tripStore';
import { useRouteStore } from '@/store/admin/routeStore';
import { useSeatStore } from '@/store/seatStore';
import DatePicker from '@/components/admin/DatePicker';
import SeatSelector from '@/components/SeatSelector';
import BookingProgressStepper from '@/components/booking/BookingProgressStepper';
import type { Seat } from '@/types';

interface BookingFormProps {
  initialData?: Partial<AdminBookingFormData>;
  onSave: (data: AdminBookingFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  title?: string;
}

interface FormErrors {
  tripType?: string;
  departureDate?: string;
  returnDate?: string;
  route?: string;
  returnRoute?: string;
  trip?: string;
  returnTrip?: string;
  user_id?: string;
  seats?: string;
  passengers?: string;
  paymentMethod?: string;
  [key: string]: string | undefined;
}

const BOOKING_STEPS = [
  { id: 1, label: 'Route', description: 'Select route & date' },
  { id: 2, label: 'Trip', description: 'Choose trip & customer' },
  { id: 3, label: 'Seats', description: 'Select seats' },
  { id: 4, label: 'Passengers', description: 'Passenger information' },
  { id: 5, label: 'Payment', description: 'Payment & confirmation' },
];

export default function BookingForm({
  initialData,
  onSave,
  onCancel,
  loading = false,
  title = 'Booking Form',
}: BookingFormProps) {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});

  // Form data
  const [formData, setFormData] = useState<AdminBookingFormData>({
    user_id: '',
    trip_id: '',
    is_round_trip: false,
    total_fare: 0,
    passengers: [],
    payment_method_type: 'gateway',
    ...initialData,
  });

  // Trip type and dates
  const [tripType, setTripType] = useState<'one_way' | 'round_trip'>(
    initialData?.is_round_trip ? 'round_trip' : 'one_way'
  );
  const [departureDate, setDepartureDate] = useState<string>('');
  const [returnDate, setReturnDate] = useState<string>('');

  // Route and trip selection
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedReturnRouteId, setSelectedReturnRouteId] =
    useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedReturnTripId, setSelectedReturnTripId] = useState<string>('');

  // Seat selection
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [selectedReturnSeats, setSelectedReturnSeats] = useState<Seat[]>([]);

  // Payment and terms
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData?.payment_method_type || 'gateway'
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Stores
  const { users, fetchAll: fetchUsers } = useUserStore();
  const {
    data: trips,
    fetchAll: fetchTrips,
    fetchTripsByDate,
    fetchTripsByRoute,
  } = useTripStore();
  const { data: routes, fetchAll: fetchRoutes } = useRouteStore();
  const {
    availableSeats,
    availableReturnSeats,
    isLoading: seatsLoading,
    fetchAvailableSeats,
    setError: setSeatError,
  } = useSeatStore();

  // Trip options for dropdowns
  const [tripOptions, setTripOptions] = useState<
    { id: string; label: string; value: string; base_fare: number }[]
  >([]);
  const [tripOptionsLoading, setTripOptionsLoading] = useState(false);
  const [returnTripOptions, setReturnTripOptions] = useState<
    { id: string; label: string; value: string; base_fare: number }[]
  >([]);
  const [returnTripOptionsLoading, setReturnTripOptionsLoading] =
    useState(false);

  // Load initial data
  useEffect(() => {
    fetchUsers();
    fetchTrips();
    fetchRoutes();
  }, [fetchUsers, fetchTrips, fetchRoutes]);

  // Server-side fetch to ensure full trip list for selected filters
  useEffect(() => {
    const load = async () => {
      setTripOptionsLoading(true);
      try {
        let list: any[] = [];
        if (departureDate && selectedRouteId) {
          // Narrowest set: fetch by date then filter by route
          const result = await fetchTripsByDate(departureDate);
          list = (result || []).filter(
            (t: any) => t.route_id === selectedRouteId
          );
        } else if (departureDate) {
          list = (await fetchTripsByDate(departureDate)) || [];
        } else if (selectedRouteId) {
          list = (await fetchTripsByRoute(selectedRouteId)) || [];
        } else {
          // Fallback to already-fetched trips
          list = trips || [];
        }

        const mapped = list.map((t: any) => ({
          id: t.id,
          label: `${t.travel_date || ''} ${t.departure_time || ''} – ${
            t.from_island_name || 'Unknown'
          } → ${t.to_island_name || 'Unknown'}${
            t.vessel_name ? ` · ${t.vessel_name}` : ''
          }`,
          value: t.id,
          base_fare: t.base_fare || 0,
        }));
        setTripOptions(mapped);
      } finally {
        setTripOptionsLoading(false);
      }
    };
    load();
  }, [
    departureDate,
    selectedRouteId,
    trips,
    fetchTripsByDate,
    fetchTripsByRoute,
  ]);

  // Load return trip options for round trips
  useEffect(() => {
    const loadReturnTrips = async () => {
      if (tripType === 'round_trip' && returnDate && selectedReturnRouteId) {
        setReturnTripOptionsLoading(true);
        try {
          let list: any[] = [];
          if (returnDate && selectedReturnRouteId) {
            const result = await fetchTripsByDate(returnDate);
            list = (result || []).filter(
              (t: any) => t.route_id === selectedReturnRouteId
            );
          }

          const mapped = list.map((t: any) => ({
            id: t.id,
            label: `${t.travel_date || ''} ${t.departure_time || ''} – ${
              t.from_island_name || 'Unknown'
            } → ${t.to_island_name || 'Unknown'}${
              t.vessel_name ? ` · ${t.vessel_name}` : ''
            }`,
            value: t.id,
            base_fare: t.base_fare || 0,
          }));
          setReturnTripOptions(mapped);
        } finally {
          setReturnTripOptionsLoading(false);
        }
      } else {
        setReturnTripOptions([]);
      }
    };
    loadReturnTrips();
  }, [tripType, returnDate, selectedReturnRouteId, fetchTripsByDate]);

  // Fetch available seats when trip is selected
  useEffect(() => {
    if (selectedTripId && fetchAvailableSeats) {
      fetchAvailableSeats(selectedTripId, false);
    }
  }, [selectedTripId, fetchAvailableSeats]);

  // When return trip changes, fetch return seats
  useEffect(() => {
    const run = async () => {
      if (selectedReturnTripId && fetchAvailableSeats) {
        try {
          await fetchAvailableSeats(selectedReturnTripId, true);
        } catch (e) {
          console.error('Error fetching return seats:', e);
          if (setSeatError) {
            setSeatError('Failed to fetch return seats');
          }
        }
      }
    };
    run();
  }, [selectedReturnTripId, fetchAvailableSeats, setSeatError]);

  // Auto-calculate total fare when seats change
  useEffect(() => {
    const calculateFare = () => {
      let total = 0;

      // Calculate departure fare
      if (selectedSeats.length > 0) {
        const selectedTrip = tripOptions.find(t => t.id === selectedTripId);
        if (selectedTrip) {
          total += selectedSeats.length * selectedTrip.base_fare;
        }
      }

      // Calculate return fare for round trips
      if (tripType === 'round_trip' && selectedReturnSeats.length > 0) {
        const selectedReturnTrip = returnTripOptions.find(
          t => t.id === selectedReturnTripId
        );
        if (selectedReturnTrip) {
          total += selectedReturnSeats.length * selectedReturnTrip.base_fare;
        }
      }

      setFormData(prev => ({ ...prev, total_fare: total }));
    };

    calculateFare();
  }, [
    selectedSeats,
    selectedReturnSeats,
    selectedTripId,
    selectedReturnTripId,
    tripType,
    tripOptions,
    returnTripOptions,
  ]);

  // Auto-update passengers when seats change
  useEffect(() => {
    const updatePassengers = () => {
      const newPassengers: AdminPassenger[] = selectedSeats.map(
        (seat, index) => ({
          passenger_name: formData.passengers[index]?.passenger_name || '',
          passenger_contact_number:
            formData.passengers[index]?.passenger_contact_number || '',
          special_assistance_request:
            formData.passengers[index]?.special_assistance_request || '',
          seat_id: seat.id,
        })
      );

      setFormData(prev => ({ ...prev, passengers: newPassengers }));
    };

    updatePassengers();
  }, [selectedSeats]);

  // Auto-update return passengers when return seats change
  useEffect(() => {
    const updateReturnPassengers = () => {
      if (tripType === 'round_trip' && selectedReturnSeats.length > 0) {
        const newReturnPassengers: AdminPassenger[] = selectedReturnSeats.map(
          (seat, index) => ({
            passenger_name: formData.passengers?.[index]?.passenger_name || '',
            passenger_contact_number:
              formData.passengers?.[index]?.passenger_contact_number || '',
            special_assistance_request:
              formData.passengers?.[index]?.special_assistance_request || '',
            seat_id: seat.id,
          })
        );

        setFormData(prev => ({
          ...prev,
          passengers: newReturnPassengers,
        }));
      }
    };

    updateReturnPassengers();
  }, [selectedReturnSeats, tripType, formData.passengers]);

  // Route options for dropdown
  const routeOptions = (routes || []).map((route: any) => ({
    label: `${route.from_island_name} → ${route.to_island_name}`,
    value: route.id,
  }));

  // User options for dropdown
  const userOptions = (users || []).map((user: any) => ({
    label: `${user.name || 'Unnamed'}${user.email ? ` (${user.email})` : ''}`,
    value: user.id,
  }));

  // Seat selection handlers
  const onSeatToggle = useCallback(
    (seat: Seat) => {
      const isSelected = selectedSeats.some(s => s.id === seat.id);
      if (isSelected) {
        setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      } else {
        setSelectedSeats(prev => [...prev, seat]);
      }
    },
    [selectedSeats]
  );

  const onReturnSeatToggle = useCallback(
    (seat: Seat) => {
      const isSelected = selectedReturnSeats.some(s => s.id === seat.id);
      if (isSelected) {
        setSelectedReturnSeats(prev => prev.filter(s => s.id !== seat.id));
      } else {
        setSelectedReturnSeats(prev => [...prev, seat]);
      }
    },
    [selectedReturnSeats]
  );

  // Validation
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    switch (step) {
      case 1: // Route & Date
        if (!departureDate) newErrors.departureDate = 'Please select a date';
        if (!selectedRouteId) newErrors.route = 'Please select a route';
        if (tripType === 'round_trip' && !returnDate)
          newErrors.returnDate = 'Please select return date';
        if (tripType === 'round_trip' && !selectedReturnRouteId)
          newErrors.returnRoute = 'Please select return route';
        break;

      case 2: // Trip & Customer
        if (!selectedTripId) newErrors.trip = 'Please select a trip';
        if (!formData.user_id) newErrors.user_id = 'Please select a customer';
        if (tripType === 'round_trip' && !selectedReturnTripId)
          newErrors.returnTrip = 'Please select return trip';
        break;

      case 3: // Seats
        if (selectedSeats.length === 0)
          newErrors.seats = 'Please select at least one seat';
        if (tripType === 'round_trip' && selectedReturnSeats.length === 0)
          newErrors.returnSeats = 'Please select return seats';
        if (
          tripType === 'round_trip' &&
          selectedSeats.length !== selectedReturnSeats.length
        ) {
          newErrors.seats = 'Number of departure and return seats must match';
        }
        break;

      case 4: // Passengers
        for (let i = 0; i < formData.passengers.length; i++) {
          if (!formData.passengers[i].passenger_name.trim()) {
            newErrors[`passenger_${i}`] = `Passenger ${i + 1} name is required`;
          }
        }
        break;

      case 5: // Payment
        if (!paymentMethod)
          newErrors.paymentMethod = 'Please select payment method';
        if (!termsAccepted)
          newErrors.terms = 'You must accept the terms and conditions';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      try {
        const finalData: AdminBookingFormData = {
          ...formData,
          is_round_trip: tripType === 'round_trip',
          trip_id: selectedTripId,
          payment_method_type: paymentMethod,
        };
        await onSave(finalData);
      } catch (error) {
        Alert.alert('Error', 'Failed to create booking. Please try again.');
      }
    }
  };

  const clearError = (field: string) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updatePassenger = (
    index: number,
    field: keyof AdminPassenger,
    value: string
  ) => {
    const updatedPassengers = [...formData.passengers];
    updatedPassengers[index] = {
      ...updatedPassengers[index],
      [field]: value,
    };
    setFormData(prev => ({ ...prev, passengers: updatedPassengers }));
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Trip Details</Text>

            <View style={styles.tripTypeContainer}>
              <Text style={styles.label}>Trip Type</Text>
              <View style={styles.tripTypeButtons}>
                <Button
                  title='One Way'
                  variant={tripType === 'one_way' ? 'primary' : 'outline'}
                  onPress={() => {
                    setTripType('one_way');
                    clearError('tripType');
                  }}
                  style={styles.tripTypeButton}
                />
                <Button
                  title='Round Trip'
                  variant={tripType === 'round_trip' ? 'primary' : 'outline'}
                  onPress={() => {
                    setTripType('round_trip');
                    clearError('tripType');
                  }}
                  style={styles.tripTypeButton}
                />
              </View>
              {errors.tripType && (
                <Text style={styles.errorText}>{errors.tripType}</Text>
              )}
            </View>

            <DatePicker
              label='Departure Date'
              value={departureDate}
              onChange={date => {
                setDepartureDate(date);
                clearError('departureDate');
              }}
              error={errors.departureDate}
            />

            <Dropdown
              label='Departure Route'
              options={routeOptions}
              value={selectedRouteId}
              onValueChange={routeId => {
                setSelectedRouteId(routeId);
                clearError('route');
              }}
              placeholder='Select departure route'
              error={errors.route}
            />

            {tripType === 'round_trip' && (
              <>
                <DatePicker
                  label='Return Date'
                  value={returnDate}
                  onChange={date => {
                    setReturnDate(date);
                    clearError('returnDate');
                  }}
                  error={errors.returnDate}
                />

                <Dropdown
                  label='Return Route'
                  options={routeOptions}
                  value={selectedReturnRouteId}
                  onValueChange={routeId => {
                    setSelectedReturnRouteId(routeId);
                    clearError('returnRoute');
                  }}
                  placeholder='Select return route'
                  error={errors.returnRoute}
                />
              </>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Trip and Customer</Text>

            <Dropdown
              label='Customer'
              options={userOptions}
              value={formData.user_id}
              onValueChange={value => {
                setFormData(prev => ({ ...prev, user_id: value }));
                clearError('user_id');
              }}
              placeholder='Select a customer'
              error={errors.user_id}
            />

            <Dropdown
              label='Departure Trip'
              options={tripOptions}
              value={selectedTripId}
              onValueChange={tripId => {
                setSelectedTripId(tripId);
                clearError('trip');
              }}
              placeholder={
                tripOptionsLoading
                  ? 'Loading trips...'
                  : 'Select departure trip'
              }
              error={errors.trip}
            />

            {tripType === 'round_trip' && (
              <Dropdown
                label='Return Trip'
                options={returnTripOptions}
                value={selectedReturnTripId || ''}
                onValueChange={tripId => {
                  setSelectedReturnTripId(tripId);
                  clearError('returnTrip');
                }}
                placeholder={
                  returnTripOptionsLoading
                    ? 'Loading return trips...'
                    : 'Select return trip'
                }
                error={errors.returnTrip}
              />
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Seats</Text>

            <Text style={styles.cardTitle}>Departure Seats</Text>
            <SeatSelector
              seats={availableSeats}
              selectedSeats={selectedSeats}
              onSeatToggle={onSeatToggle}
              isLoading={seatsLoading}
            />

            {tripType === 'round_trip' && selectedReturnTripId && (
              <>
                <Text style={styles.cardTitle}>Return Seats</Text>
                <SeatSelector
                  seats={availableReturnSeats}
                  selectedSeats={selectedReturnSeats}
                  onSeatToggle={onReturnSeatToggle}
                  isLoading={seatsLoading}
                />
              </>
            )}

            {errors.seats && (
              <Text style={styles.errorText}>{errors.seats}</Text>
            )}
            {errors.returnSeats && (
              <Text style={styles.errorText}>{errors.returnSeats}</Text>
            )}

            {formData.total_fare > 0 && (
              <View style={styles.fareContainer}>
                <Text style={styles.fareLabel}>Total Fare:</Text>
                <Text style={styles.fareValue}>
                  MVR {formData.total_fare.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Passenger Details</Text>

            {formData.passengers.map((passenger, index) => (
              <View key={index} style={styles.passengerContainer}>
                <Text style={styles.passengerTitle}>
                  Passenger {index + 1} - Seat {selectedSeats[index]?.number}
                </Text>

                <TextInput
                  label='Full Name'
                  value={passenger.passenger_name}
                  onChangeText={text => {
                    updatePassenger(index, 'passenger_name', text);
                    clearError(`passenger_${index}`);
                  }}
                  placeholder='Enter passenger name'
                  error={errors[`passenger_${index}`]}
                />

                <TextInput
                  label='Contact Number'
                  value={passenger.passenger_contact_number}
                  onChangeText={text => {
                    updatePassenger(index, 'passenger_contact_number', text);
                  }}
                  placeholder='Enter contact number'
                />

                <TextInput
                  label='Special Assistance'
                  value={passenger.special_assistance_request}
                  onChangeText={text => {
                    updatePassenger(index, 'special_assistance_request', text);
                  }}
                  placeholder='Any special requirements? (optional)'
                  multiline
                />
              </View>
            ))}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Payment Method</Text>

            <Dropdown
              label='Payment Method'
              options={[
                { label: 'Gateway', value: 'gateway' },
                { label: 'Wallet', value: 'wallet' },
                { label: 'Bank Transfer', value: 'bank_transfer' },
                { label: 'Cash', value: 'cash' },
              ]}
              value={paymentMethod}
              onValueChange={val => {
                setPaymentMethod(val);
                clearError('paymentMethod');
              }}
              placeholder='Select payment method'
              error={errors.paymentMethod}
            />

            <View style={styles.termsContainer}>
              <Switch
                label='I accept the terms and conditions'
                value={termsAccepted}
                onValueChange={value => {
                  setTermsAccepted(value);
                  clearError('terms');
                }}
              />
              {errors.terms && (
                <Text style={styles.errorText}>{errors.terms}</Text>
              )}
            </View>

            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Admin Booking Summary</Text>
              <Text style={styles.summaryText}>
                Trip Type:{' '}
                {tripType === 'round_trip' ? 'Round Trip' : 'One Way'}
              </Text>
              <Text style={styles.summaryText}>
                Passengers: {formData.passengers.length}
              </Text>
              <Text style={styles.summaryText}>
                Total Fare: MVR {formData.total_fare.toFixed(2)}
              </Text>
              <Text style={styles.summaryText}>
                Status: Confirmed (Admin Booking)
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <BookingProgressStepper
          steps={BOOKING_STEPS}
          currentStep={currentStep}
        />
      </View>

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
              currentStep === 1 ? styles.singleButton : styles.navigationButton
            }
          />
        ) : (
          <Button
            title='Create Booking'
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.navigationButton}
          />
        )}
      </View>

      <Button
        title='Cancel'
        onPress={onCancel}
        variant='outline'
        style={styles.cancelButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 32,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  tripTypeContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  tripTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  tripTypeButton: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  passengerContainer: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fareLabel: {
    fontSize: 16,
    color: colors.text,
  },
  fareValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  termsContainer: {
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
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
  cancelButton: {
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: 8,
  },
});
