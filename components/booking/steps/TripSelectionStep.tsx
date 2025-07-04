import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Dropdown from '@/components/Dropdown';
import GenerateTripsButton from '@/components/GenerateTripsButton';
import { formatTripOptions } from '@/utils/bookingFormUtils';
import Colors from '@/constants/colors';
import type { Trip } from '@/types/agent';

interface TripSelectionStepProps {
  // Trip data
  trips: Trip[];
  returnTrips: Trip[];
  selectedTrip: Trip | null;
  selectedReturnTrip: Trip | null;
  onTripChange: (trip: Trip) => void;
  onReturnTripChange: (trip: Trip) => void;
  
  // Loading states
  isLoading: boolean;
  
  // Trip generation
  onTripsGenerated: () => void;
  
  // Form data for trip generation
  routeId: string | null;
  returnRouteId: string | null;
  departureDate: string | null;
  returnDate: string | null;
  tripType: 'one_way' | 'round_trip' | null;
  
  // Validation errors
  errors: {
    trip?: string;
    returnTrip?: string;
  };
  
  // Error clearing functions
  clearError: (field: string) => void;
}

const TripSelectionStep: React.FC<TripSelectionStepProps> = ({
  trips,
  returnTrips,
  selectedTrip,
  selectedReturnTrip,
  onTripChange,
  onReturnTripChange,
  isLoading,
  onTripsGenerated,
  routeId,
  returnRouteId,
  departureDate,
  returnDate,
  tripType,
  errors,
  clearError,
}) => {
  const tripOptions = formatTripOptions(trips);
  const returnTripOptions = formatTripOptions(returnTrips);

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
      <Text style={styles.stepTitle}>Select Trips</Text>

      {/* Departure Trip Selection */}
      <Dropdown
        label="Select Departure Trip"
        items={tripOptions}
        value={selectedTrip?.id || ''}
        onChange={handleTripSelect}
        placeholder={tripOptions.length === 0 ? "No departure trips available" : "Select departure trip"}
        error={errors.trip}
        required
        disabled={tripOptions.length === 0}
      />

      {tripOptions.length === 0 && routeId && departureDate && !isLoading && (
        <View style={styles.noTripsContainer}>
          <Text style={styles.noTripsText}>
            No trips available for this route on {new Date(departureDate).toLocaleDateString()}.
          </Text>
          <Text style={styles.noTripsSubtext}>
            Please try a different date or generate trips for this route.
          </Text>
          <GenerateTripsButton
            routeId={routeId}
            date={departureDate}
            onTripsGenerated={onTripsGenerated}
          />
        </View>
      )}

      {isLoading && routeId && departureDate && (
        <Text style={styles.loadingText}>Loading departure trips...</Text>
      )}

      {/* Return Trip Selection */}
      {tripType === 'round_trip' && (
        <>
          <Dropdown
            label="Select Return Trip"
            items={returnTripOptions}
            value={selectedReturnTrip?.id || ''}
            onChange={handleReturnTripSelect}
            placeholder={returnTripOptions.length === 0 ? "No return trips available" : "Select return trip"}
            error={errors.returnTrip}
            required
            disabled={returnTripOptions.length === 0}
          />

          {returnTripOptions.length === 0 && returnRouteId && returnDate && !isLoading && (
            <View style={styles.noTripsContainer}>
              <Text style={styles.noTripsText}>
                No return trips available for this route on {new Date(returnDate).toLocaleDateString()}.
              </Text>
              <Text style={styles.noTripsSubtext}>
                Please try a different return date or generate trips for this route.
              </Text>
              <GenerateTripsButton
                routeId={returnRouteId}
                date={returnDate}
                onTripsGenerated={onTripsGenerated}
              />
            </View>
          )}

          {isLoading && returnRouteId && returnDate && (
            <Text style={styles.loadingText}>Loading return trips...</Text>
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
  noTripsContainer: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginBottom: 16,
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
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});

export default TripSelectionStep; 