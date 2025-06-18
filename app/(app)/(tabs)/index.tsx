import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Calendar,
  MapPin,
  ArrowRight,
  Search,
  Ticket,
  Clock,
  LifeBuoy,
  X
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore, useRouteStore, useUserBookingsStore } from '@/store';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function HomeScreen() {
  const { user } = useAuthStore();

  // Core booking state
  const {
    setQuickBookingData,
    resetCurrentBooking,
    currentBooking
  } = useBookingStore();

  // Route management
  const {
    availableRoutes,
    fetchAvailableRoutes,
    isLoading: routeLoading
  } = useRouteStore();

  // User bookings management
  const {
    bookings,
    fetchUserBookings,
    isLoading: bookingsLoading
  } = useUserBookingsStore();

  // Combined loading state
  const isLoading = routeLoading || bookingsLoading;

  // Quick booking state
  const [selectedFromIsland, setSelectedFromIsland] = useState<string>('');
  const [selectedToIsland, setSelectedToIsland] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Error messages state
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Fetch user bookings when component mounts
    fetchUserBookings();
    // Fetch available routes for quick booking
    fetchAvailableRoutes();
  }, []);

  // Reset quick booking fields whenever the screen comes into focus (tab change, reload, navigation)
  useFocusEffect(
    React.useCallback(() => {
      setSelectedFromIsland('');
      setSelectedToIsland('');
      setSelectedDate('');
      setErrorMessage('');
    }, [])
  );

  const handleRefresh = () => {
    fetchUserBookings();
  };

  const handleStartBooking = async () => {
    // Clear any previous error
    setErrorMessage('');

    // Validate that all fields are selected and show specific error messages
    if (!selectedFromIsland) {
      setErrorMessage("Please select a departure island");
      return;
    }

    if (!selectedToIsland) {
      setErrorMessage("Please select a destination island");
      return;
    }

    if (!selectedDate) {
      setErrorMessage("Please select a travel date");
      return;
    }

    // Check if the selected route combination exists in the database
    const matchingRoute = availableRoutes.find(route =>
      route.fromIsland.name === selectedFromIsland &&
      route.toIsland.name === selectedToIsland
    );

    if (!matchingRoute) {
      setErrorMessage(`No ferry route available from ${selectedFromIsland} to ${selectedToIsland}. Please select a different destination.`);
      return;
    }

    // Use the new function to set quick booking data
    setQuickBookingData(matchingRoute, selectedDate);

    // Small delay to ensure state is updated before navigation
    await new Promise(resolve => setTimeout(resolve, 100));

    // Navigate to the booking page
    router.push('/book');
  };

  const handleViewBooking = (bookingId: string) => {
    router.push(`/booking-details/${bookingId}`);
  };

  // Get unique island names for selection, filtered based on current selection and available routes
  const fromIslands = [...new Set(availableRoutes.map(route => route.fromIsland.name))];

  // Only show destination islands that have actual routes from the selected departure island
  const toIslands = selectedFromIsland
    ? [...new Set(availableRoutes
      .filter(route => route.fromIsland.name === selectedFromIsland)
      .map(route => route.toIsland.name))]
    : [];

  // Generate date options for the next 30 days
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const isToday = i === 0;
      const isTomorrow = i === 1;

      dates.push({
        dateString: date.toISOString().split('T')[0],
        day: date.getDate(),
        month: date.toLocaleString('default', { month: 'short' }),
        year: date.getFullYear(),
        dayName: date.toLocaleString('default', { weekday: 'short' }),
        isToday,
        isTomorrow
      });
    }

    return dates;
  };

  // Get upcoming bookings (confirmed status and future date)
  const upcomingBookings = bookings
    .filter(booking =>
      booking.status === 'confirmed' &&
      new Date(booking.departureDate) >= new Date()
    )
    .sort((a, b) =>
      new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
    )
    .slice(0, 2); // Show only the next 2 upcoming bookings

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.profile?.full_name}</Text>
        </View>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/validate-ticket')}
        >
          <Search size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Quick Booking Card */}
      <Card variant="elevated" style={styles.quickBookingCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Book a Ferry</Text>
        </View>

        <View style={styles.bookingForm}>
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowFromModal(true)}
          >
            <View style={styles.formIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>From</Text>
              <Text style={[
                styles.formPlaceholder,
                selectedFromIsland && styles.formValue
              ]}>
                {selectedFromIsland || 'Select departure island'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.formDivider}>
            <ArrowRight size={16} color={Colors.textSecondary} />
          </View>

          <TouchableOpacity
            style={styles.formRow}
            onPress={() => {
              if (!selectedFromIsland) {
                setErrorMessage("Please select a departure island first");
                return;
              }
              setShowToModal(true);
            }}
          >
            <View style={styles.formIcon}>
              <MapPin size={20} color={Colors.secondary} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>To</Text>
              <Text style={[
                styles.formPlaceholder,
                selectedToIsland && styles.formValue
              ]}>
                {selectedToIsland || (selectedFromIsland ? 'Select destination island' : 'Select departure island first')}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.formDivider} />

          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowDateModal(true)}
          >
            <View style={styles.formIcon}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Date</Text>
              <Text style={[
                styles.formPlaceholder,
                selectedDate && styles.formValue
              ]}>
                {selectedDate
                  ? new Date(selectedDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                  : 'Select travel date'
                }
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Error message display */}
        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Button
          title="Start Booking"
          onPress={handleStartBooking}
          fullWidth
          style={styles.bookButton}
        />
      </Card>

      {/* From Island Selection Modal */}
      <Modal
        visible={showFromModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Departure Island</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowFromModal(false)}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {fromIslands.map((island) => (
              <TouchableOpacity
                key={island}
                style={[
                  styles.islandOption,
                  selectedFromIsland === island && styles.islandOptionSelected
                ]}
                onPress={() => {
                  setSelectedFromIsland(island);
                  // Clear the "To" selection since available destinations will change
                  setSelectedToIsland('');
                  // Clear error message when user makes a selection
                  setErrorMessage('');
                  setShowFromModal(false);
                }}
              >
                <Text style={styles.islandText}>{island}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* To Island Selection Modal */}
      <Modal
        visible={showToModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Destination Island</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowToModal(false)}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {toIslands.map((island) => (
              <TouchableOpacity
                key={island}
                style={[
                  styles.islandOption,
                  selectedToIsland === island && styles.islandOptionSelected
                ]}
                onPress={() => {
                  setSelectedToIsland(island);
                  // Clear the "From" selection if it's the same as the new "To" selection
                  if (selectedFromIsland === island) {
                    setSelectedFromIsland('');
                  }
                  // Clear error message when user makes a selection
                  setErrorMessage('');
                  setShowToModal(false);
                }}
              >
                <Text style={styles.islandText}>{island}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Date Selection Modal */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDateModal(false)}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {generateDateOptions().map((date) => (
              <TouchableOpacity
                key={date.dateString}
                style={[
                  styles.dateOption,
                  selectedDate === date.dateString && styles.dateOptionSelected
                ]}
                onPress={() => {
                  setSelectedDate(date.dateString);
                  // Clear error message when user makes a selection
                  setErrorMessage('');
                  setShowDateModal(false);
                }}
              >
                <View style={styles.dateInfo}>
                  <Text style={styles.dateText}>
                    {date.dayName}, {date.day} {date.month} {date.year}
                  </Text>
                  {(date.isToday || date.isTomorrow) && (
                    <Text style={styles.dateSubText}>
                      {date.isToday ? 'Today' : 'Tomorrow'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Upcoming Trips Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Trips</Text>
        <TouchableOpacity onPress={() => router.push('/bookings')}>
          <Text style={styles.sectionLink}>View All</Text>
        </TouchableOpacity>
      </View>

      {upcomingBookings.length > 0 ? (
        upcomingBookings.map(booking => (
          <TouchableOpacity
            key={booking.id}
            onPress={() => handleViewBooking(booking.id)}
            activeOpacity={0.7}
          >
            <Card variant="elevated" style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.tripRoute}>
                  <Text style={styles.tripLocation}>{booking.route.fromIsland.name}</Text>
                  <View style={styles.tripArrow}>
                    <View style={styles.tripLine} />
                    <ArrowRight size={16} color={Colors.primary} />
                    <View style={styles.tripLine} />
                  </View>
                  <Text style={styles.tripLocation}>{booking.route.toIsland.name}</Text>
                </View>
                <View style={styles.tripBadge}>
                  <Text style={styles.tripBadgeText}>#{booking.bookingNumber}</Text>
                </View>
              </View>

              <View style={styles.tripDetails}>
                <View style={styles.tripDetail}>
                  <Calendar size={16} color={Colors.textSecondary} style={styles.tripIcon} />
                  <Text style={styles.tripText}>
                    {new Date(booking.departureDate).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>

                <View style={styles.tripDetail}>
                  <Clock size={16} color={Colors.textSecondary} style={styles.tripIcon} />
                  <Text style={styles.tripText}>{booking.departureTime}</Text>
                </View>

                <View style={styles.tripDetail}>
                  <Ticket size={16} color={Colors.textSecondary} style={styles.tripIcon} />
                  <Text style={styles.tripText}>{booking.passengers.length} passenger(s)</Text>
                </View>
              </View>

              <View style={styles.tripFooter}>
                <Button
                  title="View Ticket"
                  variant="outline"
                  size="small"
                  onPress={() => handleViewBooking(booking.id)}
                />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      ) : (
        <Card variant="outlined" style={styles.emptyCard}>
          <Text style={styles.emptyText}>No upcoming trips</Text>
          <Button
            title="Book Now"
            variant="primary"
            size="small"
            onPress={handleStartBooking}
            style={styles.emptyButton}
          />
        </Card>
      )}

      {/* Quick Actions Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/validate-ticket')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#e3f2fd' }]}>
            <Ticket size={24} color={Colors.primary} />
          </View>
          <Text style={styles.quickActionText}>Validate Ticket</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/bookings')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#e8f5e9' }]}>
            <Clock size={24} color="#2ecc71" />
          </View>
          <Text style={styles.quickActionText}>My Bookings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/support')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#fff3e0' }]}>
            <LifeBuoy size={24} color="#f39c12" />
          </View>
          <Text style={styles.quickActionText}>Support</Text>
        </TouchableOpacity>
      </View>

      {/* Featured Image */}
      <Card variant="elevated" style={styles.featuredCard}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=1000&auto=format&fit=crop' }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>Explore the Islands</Text>
          <Text style={styles.featuredText}>
            Discover the beauty of Maldivian islands with our ferry services
          </Text>
          <Button
            title="Book Now"
            size="small"
            onPress={handleStartBooking}
            style={styles.featuredButton}
          />
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
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickBookingCard: {
    marginBottom: 24,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  bookingForm: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  formIcon: {
    width: 40,
    alignItems: 'center',
  },
  formField: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  formPlaceholder: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  formValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  formDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButton: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  sectionLink: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  tripCard: {
    marginBottom: 16,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripLocation: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  tripArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  tripLine: {
    height: 1,
    width: 10,
    backgroundColor: Colors.border,
  },
  tripBadge: {
    backgroundColor: Colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tripBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  tripDetails: {
    marginBottom: 16,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripIcon: {
    marginRight: 8,
  },
  tripText: {
    fontSize: 14,
    color: Colors.text,
  },
  tripFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 16,
    alignItems: 'flex-start',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 120,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  featuredCard: {
    overflow: 'hidden',
    padding: 0,
  },
  featuredImage: {
    width: '100%',
    height: 150,
  },
  featuredContent: {
    padding: 16,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  featuredText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  featuredButton: {
    alignSelf: 'flex-start',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalContent: {
    padding: 16,
  },
  islandOption: {
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  islandOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  islandText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  dateOption: {
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 12,
  },
  dateOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.highlight,
  },
  dateInfo: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  dateSubText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
  },
  errorContainer: {
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#ffebee",
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
});