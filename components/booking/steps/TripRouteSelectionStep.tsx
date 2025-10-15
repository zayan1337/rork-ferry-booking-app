import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import DatePicker from '@/components/DatePicker';
import Dropdown from '@/components/Dropdown';
import Colors from '@/constants/colors';
import type { Route } from '@/types';
import type { Trip } from '@/types/booking';
import { formatTripOptions } from '@/utils/bookingFormUtils';

interface TripRouteSelectionStepProps {
  // Trip type
  tripType: 'one_way' | 'round_trip' | null;
  onTripTypeChange: (type: 'one_way' | 'round_trip') => void;

  // Date selection
  departureDate: string | null;
  returnDate: string | null;
  onDepartureDateChange: (date: string) => void;
  onReturnDateChange: (date: string | null) => void;

  // Route selection
  routes: Route[];
  selectedRoute: Route | null;
  selectedReturnRoute: Route | null;
  onRouteChange: (route: Route) => void;
  onReturnRouteChange: (route: Route | null) => void;

  // Trip selection
  trips: Trip[];
  returnTrips: Trip[];
  selectedTrip: Trip | null;
  selectedReturnTrip: Trip | null;
  onTripChange: (trip: Trip) => void;
  onReturnTripChange: (trip: Trip) => void;

  // Loading states
  isLoadingRoutes: boolean;
  isLoadingTrips: boolean;

  // Validation errors
  errors: {
    tripType?: string;
    departureDate?: string;
    returnDate?: string;
    route?: string;
    returnRoute?: string;
    trip?: string;
    returnTrip?: string;
  };

  // Error clearing
  clearError: (field: string) => void;
}

const TripRouteSelectionStep: React.FC<TripRouteSelectionStepProps> = ({
  tripType,
  onTripTypeChange,
  departureDate,
  returnDate,
  onDepartureDateChange,
  onReturnDateChange,
  routes,
  selectedRoute,
  selectedReturnRoute,
  onRouteChange,
  onReturnRouteChange,
  trips,
  returnTrips,
  selectedTrip,
  selectedReturnTrip,
  onTripChange,
  onReturnTripChange,
  isLoadingRoutes,
  isLoadingTrips,
  errors,
  clearError,
}) => {
  // For now, use routes directly - filtering can be added back later if needed
  // The automatic trip fetching already handles showing only available trips
  const displayRoutes = routes;

  const routeOptions = displayRoutes.map(route => ({
    label: `${route.fromIsland?.name || 'Unknown'} → ${route.toIsland?.name || 'Unknown'}`,
    value: route.id,
  }));

  const tripOptions = formatTripOptions(trips as any);
  const returnTripOptions = formatTripOptions(returnTrips as any);

  const handleTripTypeChange = (type: 'one_way' | 'round_trip') => {
    onTripTypeChange(type);
    if (errors.tripType) clearError('tripType');
  };

  const handleRouteSelect = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (route) {
      onRouteChange(route);
      if (errors.route) clearError('route');
    }
  };

  const handleReturnRouteSelect = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (route) {
      onReturnRouteChange(route);
      if (errors.returnRoute) clearError('returnRoute');
    }
  };

  const handleTripSelect = (tripId: string) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      onTripChange(trip);
      if (errors.trip) clearError('trip');
    }
  };

  const handleReturnTripSelect = (tripId: string) => {
    const trip = returnTrips.find(t => t.id === tripId);
    if (trip) {
      onReturnTripChange(trip);
      if (errors.returnTrip) clearError('returnTrip');
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Select Trip Type, Date & Route</Text>

      {/* Trip Type Selection */}
      <View style={styles.tripTypeContainer}>
        <Pressable
          style={[
            styles.tripTypeButton,
            tripType === 'one_way' && styles.tripTypeButtonActive,
          ]}
          onPress={() => handleTripTypeChange('one_way')}
        >
          <Text
            style={[
              styles.tripTypeText,
              tripType === 'one_way' && styles.tripTypeTextActive,
            ]}
          >
            One Way
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tripTypeButton,
            tripType === 'round_trip' && styles.tripTypeButtonActive,
          ]}
          onPress={() => handleTripTypeChange('round_trip')}
        >
          <Text
            style={[
              styles.tripTypeText,
              tripType === 'round_trip' && styles.tripTypeTextActive,
            ]}
          >
            Round Trip
          </Text>
        </Pressable>
      </View>

      {errors.tripType && (
        <Text style={styles.errorText}>{errors.tripType}</Text>
      )}

      {/* Date Selection */}
      <DatePicker
        label='Departure Date'
        value={departureDate}
        onChange={date => {
          onDepartureDateChange(date);
          if (errors.departureDate) clearError('departureDate');
        }}
        minDate={new Date().toISOString().split('T')[0]}
        error={errors.departureDate}
        required
      />

      {tripType === 'round_trip' && (
        <DatePicker
          label='Return Date'
          value={returnDate}
          onChange={date => {
            onReturnDateChange(date);
            if (errors.returnDate) clearError('returnDate');
          }}
          minDate={departureDate || new Date().toISOString().split('T')[0]}
          error={errors.returnDate}
          required
        />
      )}

      {/* Route Selection */}
      <Dropdown
        label='Departure Route'
        items={routeOptions}
        value={selectedRoute?.id || ''}
        onChange={handleRouteSelect}
        placeholder={
          isLoadingRoutes
            ? 'Loading routes...'
            : routeOptions.length === 0
              ? 'No routes available'
              : 'Select departure route'
        }
        error={errors.route}
        searchable
        required
        disabled={isLoadingRoutes}
      />

      {tripType === 'round_trip' && (
        <Dropdown
          label='Return Route'
          items={routeOptions}
          value={selectedReturnRoute?.id || ''}
          onChange={handleReturnRouteSelect}
          placeholder={
            isLoadingRoutes ? 'Loading routes...' : 'Select return route'
          }
          error={errors.returnRoute}
          searchable
          required
          disabled={isLoadingRoutes}
        />
      )}

      {/* Trip Selection */}
      {selectedRoute && departureDate && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>
            {isLoadingTrips
              ? 'Loading Available Trips...'
              : 'Select Departure Trip'}
          </Text>

          {!isLoadingTrips && tripOptions.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📅 Date • 🕐 Time • 🚢 Ship • 💰 Fare/Seat • 💺 Available
              </Text>
            </View>
          )}

          <Dropdown
            label='Select Departure Trip'
            items={tripOptions}
            value={selectedTrip?.id || ''}
            onChange={handleTripSelect}
            placeholder={
              isLoadingTrips
                ? 'Loading trips...'
                : tripOptions.length === 0
                  ? 'No trips available for this date'
                  : 'Select a departure trip'
            }
            error={errors.trip}
            required
            disabled={tripOptions.length === 0 || isLoadingTrips}
          />

          {tripOptions.length === 0 && !isLoadingTrips && (
            <View style={styles.noTripsContainer}>
              <Text style={styles.noTripsText}>
                ⚠️ No trips available for this route on{' '}
                {new Date(departureDate).toLocaleDateString()}.
              </Text>
              <Text style={styles.noTripsSubtext}>
                💡 Try selecting a different date or contact the administrator
                to schedule trips.
              </Text>
            </View>
          )}
        </>
      )}

      {tripType === 'round_trip' && selectedReturnRoute && returnDate && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>
            {isLoadingTrips ? 'Loading Return Trips...' : 'Select Return Trip'}
          </Text>

          {!isLoadingTrips && returnTripOptions.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📅 Date • 🕐 Time • 🚢 Ship • 💰 Fare/Seat • 💺 Available
              </Text>
            </View>
          )}

          <Dropdown
            label='Select Return Trip'
            items={returnTripOptions}
            value={selectedReturnTrip?.id || ''}
            onChange={handleReturnTripSelect}
            placeholder={
              isLoadingTrips
                ? 'Loading return trips...'
                : returnTripOptions.length === 0
                  ? 'No return trips available for this date'
                  : 'Select a return trip'
            }
            error={errors.returnTrip}
            required
            disabled={returnTripOptions.length === 0 || isLoadingTrips}
          />

          {returnTripOptions.length === 0 && !isLoadingTrips && (
            <View style={styles.noTripsContainer}>
              <Text style={styles.noTripsText}>
                ⚠️ No return trips available for this route on{' '}
                {new Date(returnDate).toLocaleDateString()}.
              </Text>
              <Text style={styles.noTripsSubtext}>
                💡 Try selecting a different return date or contact the
                administrator to schedule trips.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  tripTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tripTypeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripTypeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#e3f2fd',
  },
  tripTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tripTypeTextActive: {
    color: Colors.primary,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  infoText: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 18,
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
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: -16,
    marginBottom: 16,
  },
});

export default TripRouteSelectionStep;
