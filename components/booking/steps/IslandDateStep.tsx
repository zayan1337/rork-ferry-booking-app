import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useBookingStore } from '@/store';
import Colors from '@/constants/colors';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import Dropdown from '@/components/Dropdown';
import Button from '@/components/Button';
import {
  fetchActiveIslands,
  getOppositeZoneIslands,
} from '@/utils/islandBookingUtils';
import { TRIP_TYPES } from '@/constants/customer';
import { DatabaseIsland } from '@/types/database';

interface IslandDateStepProps {
  onFindTrips: () => void;
}

export default function IslandDateStep({ onFindTrips }: IslandDateStepProps) {
  const {
    currentBooking,
    setTripType,
    setDepartureDate,
    setReturnDate,
    setBoardingIsland,
    setDestinationIsland,
    setReturnBoardingIsland,
    setReturnDestinationIsland,
  } = useBookingStore();

  const [allIslands, setAllIslands] = useState<DatabaseIsland[]>([]);
  const [destinationIslands, setDestinationIslands] = useState<
    DatabaseIsland[]
  >([]);
  const [returnDestinationIslands, setReturnDestinationIslands] = useState<
    DatabaseIsland[]
  >([]);
  const [loadingIslands, setLoadingIslands] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load all islands on mount
  useEffect(() => {
    loadAllIslands();
  }, []);

  // Update destination islands when boarding island changes
  useEffect(() => {
    if (currentBooking.boardingIslandId && allIslands.length > 0) {
      const destinations = getOppositeZoneIslands(
        allIslands,
        currentBooking.boardingIslandId
      );
      setDestinationIslands(destinations);
    } else {
      setDestinationIslands([]);
    }
  }, [currentBooking.boardingIslandId, allIslands]);

  // Update return destination islands when return boarding island changes
  useEffect(() => {
    if (currentBooking.returnBoardingIslandId && allIslands.length > 0) {
      const destinations = getOppositeZoneIslands(
        allIslands,
        currentBooking.returnBoardingIslandId
      );
      setReturnDestinationIslands(destinations);
    } else {
      setReturnDestinationIslands([]);
    }
  }, [currentBooking.returnBoardingIslandId, allIslands]);

  const loadAllIslands = async () => {
    setLoadingIslands(true);
    try {
      const islands = await fetchActiveIslands();
      setAllIslands(islands);
    } catch (error) {
      console.error('Error loading islands:', error);
      Alert.alert('Error', 'Failed to load islands');
    } finally {
      setLoadingIslands(false);
    }
  };

  const validateAndProceed = () => {
    const newErrors: Record<string, string> = {};

    if (!currentBooking.tripType) {
      newErrors.tripType = 'Please select a trip type';
    }
    if (!currentBooking.departureDate) {
      newErrors.departureDate = 'Please select departure date';
    }
    if (!currentBooking.boardingIslandId) {
      newErrors.boardingIsland = 'Please select boarding island';
    }
    if (!currentBooking.destinationIslandId) {
      newErrors.destinationIsland = 'Please select destination island';
    }

    if (currentBooking.tripType === TRIP_TYPES.ROUND_TRIP) {
      if (!currentBooking.returnDate) {
        newErrors.returnDate = 'Please select return date';
      }
      if (!currentBooking.returnBoardingIslandId) {
        newErrors.returnBoardingIsland = 'Please select return boarding island';
      }
      if (!currentBooking.returnDestinationIslandId) {
        newErrors.returnDestinationIsland = 'Please select return destination';
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onFindTrips();
    }
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Where do you want to go?</Text>

      {/* Trip Type Selection */}
      <View style={styles.tripTypeContainer}>
        <Pressable
          style={[
            styles.tripTypeButton,
            currentBooking.tripType === TRIP_TYPES.ONE_WAY &&
              styles.tripTypeButtonActive,
          ]}
          onPress={() => {
            setTripType(TRIP_TYPES.ONE_WAY);
            if (errors.tripType) setErrors({ ...errors, tripType: '' });
          }}
        >
          <Text
            style={[
              styles.tripTypeText,
              currentBooking.tripType === TRIP_TYPES.ONE_WAY &&
                styles.tripTypeTextActive,
            ]}
          >
            One Way
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tripTypeButton,
            currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
              styles.tripTypeButtonActive,
          ]}
          onPress={() => {
            setTripType(TRIP_TYPES.ROUND_TRIP);
            if (errors.tripType) setErrors({ ...errors, tripType: '' });
          }}
        >
          <Text
            style={[
              styles.tripTypeText,
              currentBooking.tripType === TRIP_TYPES.ROUND_TRIP &&
                styles.tripTypeTextActive,
            ]}
          >
            Round Trip
          </Text>
        </Pressable>
      </View>
      {errors.tripType && (
        <Text style={styles.errorText}>{errors.tripType}</Text>
      )}

      {/* Departure Date */}
      <CalendarDatePicker
        label='Departure Date'
        value={currentBooking.departureDate}
        onChange={date => {
          setDepartureDate(date);
          if (errors.departureDate) setErrors({ ...errors, departureDate: '' });
        }}
        minDate={new Date().toISOString().split('T')[0]}
        error={errors.departureDate}
        required
      />

      {/* Boarding Island */}
      <Dropdown
        label='From (Boarding Island)'
        items={allIslands.map(island => ({
          label: island.name,
          value: island.id,
        }))}
        value={currentBooking.boardingIslandId || ''}
        onChange={islandId => {
          const island = allIslands.find(i => i.id === islandId);
          setBoardingIsland(island?.id || null, island?.name || null);
          if (errors.boardingIsland)
            setErrors({ ...errors, boardingIsland: '' });
          // Clear destination when boarding changes
          setDestinationIsland(null, null);
        }}
        placeholder='Select boarding island'
        error={errors.boardingIsland}
        searchable
        required
      />

      {/* Destination Island - Always visible */}
      <Dropdown
        label='To (Destination Island)'
        items={destinationIslands.map(island => ({
          label: island.name,
          value: island.id,
        }))}
        value={currentBooking.destinationIslandId || ''}
        onChange={islandId => {
          const island = destinationIslands.find(i => i.id === islandId);
          setDestinationIsland(island?.id || null, island?.name || null);
          if (errors.destinationIsland)
            setErrors({ ...errors, destinationIsland: '' });
        }}
        placeholder={
          !currentBooking.boardingIslandId
            ? 'Select boarding island first'
            : destinationIslands.length === 0
              ? 'No destination islands available'
              : 'Select destination island'
        }
        error={errors.destinationIsland}
        searchable
        required
        disabled={
          !currentBooking.boardingIslandId || destinationIslands.length === 0
        }
      />

      {/* Return Trip Section */}
      {currentBooking.tripType === TRIP_TYPES.ROUND_TRIP && (
        <>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionTitle}>Return Trip</Text>

          <CalendarDatePicker
            label='Return Date'
            value={currentBooking.returnDate}
            onChange={date => {
              setReturnDate(date);
              if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
            }}
            minDate={
              currentBooking.departureDate ||
              new Date().toISOString().split('T')[0]
            }
            error={errors.returnDate}
            required
          />

          <Dropdown
            label='Return From (Boarding Island)'
            items={allIslands.map(island => ({
              label: island.name,
              value: island.id,
            }))}
            value={currentBooking.returnBoardingIslandId || ''}
            onChange={islandId => {
              const island = allIslands.find(i => i.id === islandId);
              setReturnBoardingIsland(island?.id || null, island?.name || null);
              if (errors.returnBoardingIsland)
                setErrors({ ...errors, returnBoardingIsland: '' });
              // Clear return destination when return boarding changes
              setReturnDestinationIsland(null, null);
            }}
            placeholder='Select return boarding island'
            error={errors.returnBoardingIsland}
            searchable
            required
          />

          {/* Return Destination - Always visible */}
          <Dropdown
            label='Return To (Destination Island)'
            items={returnDestinationIslands.map(island => ({
              label: island.name,
              value: island.id,
            }))}
            value={currentBooking.returnDestinationIslandId || ''}
            onChange={islandId => {
              const island = returnDestinationIslands.find(
                i => i.id === islandId
              );
              setReturnDestinationIsland(
                island?.id || null,
                island?.name || null
              );
              if (errors.returnDestinationIsland)
                setErrors({ ...errors, returnDestinationIsland: '' });
            }}
            placeholder={
              !currentBooking.returnBoardingIslandId
                ? 'Select return boarding island first'
                : returnDestinationIslands.length === 0
                  ? 'No destination islands available'
                  : 'Select return destination island'
            }
            error={errors.returnDestinationIsland}
            searchable
            required
            disabled={
              !currentBooking.returnBoardingIslandId ||
              returnDestinationIslands.length === 0
            }
          />
        </>
      )}

      {/* Find Trips Button */}
      <Button
        title='Find Trips'
        onPress={validateAndProceed}
        style={styles.findTripsButton}
        disabled={loadingIslands}
      />
    </View>
  );
}

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
  sectionDivider: {
    height: 2,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  findTripsButton: {
    marginTop: 24,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
});
