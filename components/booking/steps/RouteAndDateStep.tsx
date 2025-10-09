import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Dropdown from '@/components/Dropdown';
import DatePicker from '@/components/DatePicker';
import TripTypeSelector from '@/components/booking/TripTypeSelector';
import { formatRouteOptions } from '@/utils/bookingFormUtils';
import { formatCurrency } from '@/utils/agentFormatters';
import Colors from '@/constants/colors';
import type { Route } from '@/types/agent';

interface RouteAndDateStepProps {
  // Trip type
  tripType: 'one_way' | 'round_trip' | null;
  onTripTypeChange: (tripType: 'one_way' | 'round_trip') => void;

  // Routes
  availableRoutes: Route[];
  selectedRoute: Route | null;
  selectedReturnRoute: Route | null;
  onRouteChange: (route: Route) => void;
  onReturnRouteChange: (route: Route) => void;

  // Dates
  departureDate: string | null;
  returnDate: string | null;
  onDepartureDateChange: (date: string) => void;
  onReturnDateChange: (date: string) => void;

  // Validation errors
  errors: {
    tripType?: string;
    route?: string;
    returnRoute?: string;
    departureDate?: string;
    returnDate?: string;
  };

  // Error clearing functions
  clearError: (field: string) => void;
}

const RouteAndDateStep: React.FC<RouteAndDateStepProps> = ({
  tripType,
  onTripTypeChange,
  availableRoutes,
  selectedRoute,
  selectedReturnRoute,
  onRouteChange,
  onReturnRouteChange,
  departureDate,
  returnDate,
  onDepartureDateChange,
  onReturnDateChange,
  errors,
  clearError,
}) => {
  const routeOptions = formatRouteOptions(availableRoutes);

  const handleRouteSelect = (routeId: string) => {
    const route = availableRoutes.find(r => r.id === routeId);
    if (route) {
      onRouteChange(route);
      if (errors.route) clearError('route');
    }
  };

  const handleReturnRouteSelect = (routeId: string) => {
    const route = availableRoutes.find(r => r.id === routeId);
    if (route) {
      onReturnRouteChange(route);
      if (errors.returnRoute) clearError('returnRoute');
    }
  };

  const handleTripTypeChange = (newTripType: 'one_way' | 'round_trip') => {
    onTripTypeChange(newTripType);
    if (errors.tripType) clearError('tripType');
  };

  const handleDepartureDateChange = (date: string) => {
    onDepartureDateChange(date);
    if (errors.departureDate) clearError('departureDate');
  };

  const handleReturnDateChange = (date: string) => {
    onReturnDateChange(date);
    if (errors.returnDate) clearError('returnDate');
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Select Route & Date</Text>

      <TripTypeSelector
        value={tripType}
        onChange={handleTripTypeChange}
        error={errors.tripType}
      />

      <Dropdown
        label='Departure Route'
        items={routeOptions}
        value={selectedRoute?.id || ''}
        onChange={handleRouteSelect}
        placeholder='Select departure route'
        error={errors.route}
        searchable
        required
      />

      <DatePicker
        label='Departure Date'
        value={departureDate}
        onChange={handleDepartureDateChange}
        minDate={new Date().toISOString().split('T')[0]}
        error={errors.departureDate}
        required
      />

      {tripType === 'round_trip' && (
        <>
          <Dropdown
            label='Return Route'
            items={routeOptions}
            value={selectedReturnRoute?.id || ''}
            onChange={handleReturnRouteSelect}
            placeholder='Select return route'
            error={errors.returnRoute}
            searchable
            required
          />

          <DatePicker
            label='Return Date'
            value={returnDate}
            onChange={handleReturnDateChange}
            minDate={departureDate || new Date().toISOString().split('T')[0]}
            error={errors.returnDate}
            required
          />
        </>
      )}

      {/* Note: Actual fare with multiplier will be calculated after trip selection */}
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
});

export default RouteAndDateStep;
