/**
 * Multi-Stop Check-In Component
 *
 * Component for handling passenger check-in at specific stops on multi-stop routes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Search, UserCheck, UserX, MapPin } from 'lucide-react-native';

import { useCaptainStore } from '@/store/captainStore';
import { useAuthStore } from '@/store/authStore';
import { CaptainRouteStop, CaptainPassenger } from '@/types/captain';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

interface MultiStopCheckInProps {
  tripId: string;
  currentStop: CaptainRouteStop;
  onCheckInComplete: () => void;
}

export default function MultiStopCheckIn({
  tripId,
  currentStop,
  onCheckInComplete,
}: MultiStopCheckInProps) {
  const { user } = useAuthStore();
  const { processMultiStopCheckIn, fetchPassengersForStop } = useCaptainStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [passengers, setPassengers] = useState<CaptainPassenger[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Load passengers for current stop
  useEffect(() => {
    loadPassengers();
  }, [tripId, currentStop.id]);

  const loadPassengers = async () => {
    setLoading(true);
    try {
      const stopPassengers = await fetchPassengersForStop(
        tripId,
        currentStop.id
      );
      setPassengers(stopPassengers);
    } catch (error) {
      console.error('Error loading passengers:', error);
      Alert.alert('Error', 'Failed to load passengers for this stop');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (
    passenger: CaptainPassenger,
    action: 'boarding' | 'dropoff'
  ) => {
    if (!user?.id) return;

    setProcessing(passenger.id);
    try {
      const result = await processMultiStopCheckIn(
        passenger.booking_id,
        currentStop.id,
        action,
        user.id
      );

      if (result.success) {
        Alert.alert('Success', result.message);
        await loadPassengers();
        onCheckInComplete();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error processing check-in:', error);
      Alert.alert('Error', 'Failed to process check-in');
    } finally {
      setProcessing(null);
    }
  };

  const filteredPassengers = passengers.filter(
    passenger =>
      passenger.passenger_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      passenger.booking_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const boardingPassengers = filteredPassengers.filter(
    p => p.action === 'boarding'
  );
  const dropoffPassengers = filteredPassengers.filter(
    p => p.action === 'dropoff'
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={Colors.primary} />
        <Text style={styles.loadingText}>Loading passengers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Stop Info */}
      <Card style={styles.stopInfoCard}>
        <View style={styles.stopHeader}>
          <View style={styles.stopIcon}>
            <MapPin size={20} color={Colors.primary} />
          </View>
          <View style={styles.stopDetails}>
            <Text style={styles.stopName}>{currentStop.island.name}</Text>
            <Text style={styles.stopSequence}>
              Stop {currentStop.stop_sequence}
            </Text>
          </View>
          <View style={styles.currentStopBadge}>
            <Text style={styles.currentStopText}>Current Stop</Text>
          </View>
        </View>
      </Card>

      {/* Search */}
      <Card style={styles.searchCard}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder='Search passengers by name or booking number...'
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
        </View>
      </Card>

      {/* Boarding Passengers */}
      {boardingPassengers.length > 0 && (
        <Card style={styles.passengersCard}>
          <View style={styles.sectionHeader}>
            <UserCheck size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Boarding Passengers</Text>
            <Text style={styles.passengerCount}>
              ({boardingPassengers.length})
            </Text>
          </View>

          {boardingPassengers.map(passenger => (
            <View key={passenger.id} style={styles.passengerItem}>
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>
                  {passenger.passenger_name}
                </Text>
                <Text style={styles.bookingNumber}>
                  {passenger.booking_number}
                </Text>
                <Text style={styles.seatNumber}>
                  Seat: {passenger.seat_number}
                </Text>
              </View>

              <View style={styles.passengerActions}>
                {passenger.check_in_status ? (
                  <View style={styles.checkedInBadge}>
                    <UserCheck size={16} color={Colors.success} />
                    <Text style={styles.checkedInText}>Checked In</Text>
                  </View>
                ) : (
                  <Button
                    title='Check In'
                    onPress={() => handleCheckIn(passenger, 'boarding')}
                    loading={processing === passenger.id}
                    style={styles.checkInButton}
                    size='small'
                  />
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Dropoff Passengers */}
      {dropoffPassengers.length > 0 && (
        <Card style={styles.passengersCard}>
          <View style={styles.sectionHeader}>
            <UserX size={20} color={Colors.warning} />
            <Text style={styles.sectionTitle}>Dropoff Passengers</Text>
            <Text style={styles.passengerCount}>
              ({dropoffPassengers.length})
            </Text>
          </View>

          {dropoffPassengers.map(passenger => (
            <View key={passenger.id} style={styles.passengerItem}>
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>
                  {passenger.passenger_name}
                </Text>
                <Text style={styles.bookingNumber}>
                  {passenger.booking_number}
                </Text>
                <Text style={styles.seatNumber}>
                  Seat: {passenger.seat_number}
                </Text>
              </View>

              <View style={styles.passengerActions}>
                {passenger.check_in_status ? (
                  <View style={styles.checkedInBadge}>
                    <UserCheck size={16} color={Colors.success} />
                    <Text style={styles.checkedInText}>Checked Out</Text>
                  </View>
                ) : (
                  <Button
                    title='Check Out'
                    onPress={() => handleCheckIn(passenger, 'dropoff')}
                    loading={processing === passenger.id}
                    style={styles.checkOutButton}
                    size='small'
                  />
                )}
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* No passengers message */}
      {filteredPassengers.length === 0 && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'No passengers found matching your search'
              : 'No passengers for this stop'}
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  stopInfoCard: {
    marginBottom: 16,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopDetails: {
    flex: 1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  stopSequence: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  currentStopBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentStopText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.card,
  },
  searchCard: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  passengersCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
    flex: 1,
  },
  passengerCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  bookingNumber: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  seatNumber: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  passengerActions: {
    marginLeft: 12,
  },
  checkInButton: {
    backgroundColor: Colors.primary,
    minWidth: 80,
  },
  checkOutButton: {
    backgroundColor: Colors.warning,
    minWidth: 80,
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.success}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  checkedInText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
    marginLeft: 4,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
