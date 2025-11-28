import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  Calendar,
  MapPin,
  ArrowRight,
  Search,
  Ticket,
  Clock,
  LifeBuoy,
  X,
  Ship,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useRouteStore, useUserBookingsStore } from '@/store';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import CalendarDatePicker from '@/components/CalendarDatePicker';
import { useQuickBooking } from '@/hooks/useQuickBooking';
import { useModalState } from '@/hooks/useModalState';
import { useAlertContext } from '@/components/AlertProvider';
import { formatTimeAMPM, formatBookingDate } from '@/utils/dateUtils';
import {
  fetchActiveIslands,
  getOppositeZoneIslands,
} from '@/utils/islandBookingUtils';
import { DatabaseIsland } from '@/types/database';

export default function HomeScreen() {
  const { user, isGuestMode } = useAuthStore();
  const { showError } = useAlertContext();

  // Add scroll reference
  const scrollViewRef = useRef<ScrollView>(null);

  // Islands state
  const [allIslands, setAllIslands] = useState<DatabaseIsland[]>([]);
  const [loadingIslands, setLoadingIslands] = useState(false);

  // Route management
  const {
    availableRoutes,
    fetchAvailableRoutes,
    isLoading: routeLoading,
  } = useRouteStore();

  // User bookings management
  const {
    bookings,
    fetchUserBookings,
    isLoading: bookingsLoading,
  } = useUserBookingsStore();

  // Don't show loading for background data fetching - let the UI render immediately
  // Only show loading indicators within specific components that need the data

  // Quick booking functionality
  const {
    quickBookingState,
    updateField,
    resetForm,
    validateAndStartBooking,
    isLoading: quickBookingLoading,
  } = useQuickBooking();

  // Modal state management
  const { modalStates, openModal, closeModal } = useModalState();

  useEffect(() => {
    // Fetch data in background without blocking UI
    if (!isGuestMode) {
      fetchUserBookings();
    }
    fetchAvailableRoutes();
    loadIslands();
  }, [isGuestMode]);

  const loadIslands = async () => {
    setLoadingIslands(true);
    try {
      const islands = await fetchActiveIslands();
      setAllIslands(islands);
    } catch (error) {
      console.error('Error loading islands:', error);
    } finally {
      setLoadingIslands(false);
    }
  };

  // Reset quick booking fields whenever the screen comes into focus (tab change, reload, navigation)
  useFocusEffect(
    React.useCallback(() => {
      // Use a direct state reset to avoid dependency issues
      // This ensures form is cleared when returning to the home screen
      // resetForm();
    }, [])
  );

  // Handle back button press to close modals
  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // Check if any modal is open
          if (modalStates.showFromModal) {
            closeModal('showFromModal');
            return true; // Prevent default back behavior
          }
          if (modalStates.showToModal) {
            closeModal('showToModal');
            return true; // Prevent default back behavior
          }
          if (modalStates.showDateModal) {
            closeModal('showDateModal');
            return true; // Prevent default back behavior
          }
          return false; // Allow default back behavior
        }
      );

      return () => backHandler.remove();
    }, [
      modalStates.showFromModal,
      modalStates.showToModal,
      modalStates.showDateModal,
      closeModal,
    ])
  );

  const handleRefresh = () => {
    if (!isGuestMode) {
      fetchUserBookings();
    }
    loadIslands();
  };

  const handleStartBooking = async () => {
    await validateAndStartBooking();
  };

  // New function to handle Book Now buttons - scrolls to top to focus on quick booking form
  const handleBookNowClick = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const navigateToBookings = useCallback(() => {
    if (isGuestMode) {
      showError(
        'Login Required',
        'Please sign in or create an account to view your bookings.'
      );
      router.push('/(auth)' as any);
      return;
    }
    router.push('/bookings' as any);
  }, [isGuestMode, showError]);

  const handleViewBooking = useCallback(
    (bookingId: string) => {
      if (isGuestMode) {
        showError('Login Required', 'Please sign in to view booking details.');
        router.push('/(auth)' as any);
        return;
      }
      router.push(`./booking-details/${bookingId}`);
    },
    [isGuestMode, showError]
  );

  const handleVesselTracking = () => {
    router.push('/vessel-tracking');
  };

  // Get unique island names for selection, filtered based on current selection and available zones
  const fromIslands = useMemo(
    () => allIslands.map(island => island.name),
    [allIslands]
  );

  // Only show destination islands from opposite zone
  const toIslands = useMemo(() => {
    if (!quickBookingState.selectedFromIsland) return [];

    const selectedIsland = allIslands.find(
      island => island.name === quickBookingState.selectedFromIsland
    );

    if (!selectedIsland) return [];

    const oppositeZoneIslands = getOppositeZoneIslands(
      allIslands,
      selectedIsland.id
    );

    return oppositeZoneIslands.map(island => island.name);
  }, [allIslands, quickBookingState.selectedFromIsland]);

  // Get upcoming bookings (confirmed status and future datetime)
  const upcomingBookings = bookings
    .filter(booking => {
      if (booking.status !== 'confirmed') return false;

      // Combine departure date and time for accurate comparison
      const departureDate = new Date(booking.departureDate);
      const now = new Date();

      // If booking has a departure time, combine it with the date
      if (booking.departureTime) {
        const [hours, minutes] = booking.departureTime.split(':').map(Number);
        departureDate.setHours(hours || 0, minutes || 0, 0, 0);
      } else {
        // If no time, set to start of day for date-only comparison
        departureDate.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);
      }

      // Only show bookings that haven't departed yet
      return departureDate >= now;
    })
    .sort((a, b) => {
      // Sort by combined date and time
      const dateA = new Date(a.departureDate);
      const dateB = new Date(b.departureDate);

      if (a.departureTime) {
        const [hoursA, minutesA] = a.departureTime.split(':').map(Number);
        dateA.setHours(hoursA || 0, minutesA || 0, 0, 0);
      }

      if (b.departureTime) {
        const [hoursB, minutesB] = b.departureTime.split(':').map(Number);
        dateB.setHours(hoursB || 0, minutesB || 0, 0, 0);
      }

      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 2); // Show only the next 2 upcoming bookings

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={routeLoading || bookingsLoading || loadingIslands}
          onRefresh={handleRefresh}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          {isGuestMode ? (
            <>
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.userName}>Crystal Transfer Vaavu</Text>
            </>
          ) : (
            <>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.profile?.full_name}</Text>
            </>
          )}
        </View>
        <Pressable
          style={styles.searchButton}
          android_ripple={{ color: Colors.border }}
          onPress={() => router.push('/validate-ticket')}
        >
          {({ pressed }) => (
            <View style={pressed && { opacity: 0.7 }}>
              <Search size={20} color={Colors.text} />
            </View>
          )}
        </Pressable>
      </View>

      {/* Quick Booking Card */}
      <Card variant='elevated' style={styles.quickBookingCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Book a Ferry</Text>
        </View>

        <View style={styles.bookingForm}>
          <Pressable
            style={styles.formRow}
            android_ripple={{ color: Colors.highlight }}
            onPress={() => openModal('showFromModal')}
          >
            {({ pressed }) => (
              <>
                <View style={styles.formIcon}>
                  <MapPin size={20} color={Colors.primary} />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>From</Text>
                  <Text
                    style={[
                      styles.formPlaceholder,
                      quickBookingState.selectedFromIsland && styles.formValue,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {quickBookingState.selectedFromIsland ||
                      'Select departure island'}
                  </Text>
                </View>
              </>
            )}
          </Pressable>

          <View style={styles.formDivider}>
            <ArrowRight size={16} color={Colors.textSecondary} />
          </View>

          <Pressable
            style={styles.formRow}
            android_ripple={{ color: Colors.highlight }}
            onPress={() => {
              if (!quickBookingState.selectedFromIsland) {
                updateField('selectedFromIsland', ''); // This will trigger error in hook
                return;
              }
              openModal('showToModal');
            }}
          >
            {({ pressed }) => (
              <>
                <View style={styles.formIcon}>
                  <MapPin size={20} color={Colors.secondary} />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>To</Text>
                  <Text
                    style={[
                      styles.formPlaceholder,
                      quickBookingState.selectedToIsland && styles.formValue,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {quickBookingState.selectedToIsland ||
                      (quickBookingState.selectedFromIsland
                        ? 'Select destination island'
                        : 'Please select departure island first')}
                  </Text>
                </View>
              </>
            )}
          </Pressable>

          <View style={styles.formDivider} />

          <Pressable
            style={styles.formRow}
            android_ripple={{ color: Colors.highlight }}
            onPress={() => openModal('showDateModal')}
          >
            {({ pressed }) => (
              <>
                <View style={styles.formIcon}>
                  <Calendar size={20} color={Colors.primary} />
                </View>
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Date</Text>
                  <Text
                    style={[
                      styles.formPlaceholder,
                      quickBookingState.selectedDate && styles.formValue,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {quickBookingState.selectedDate
                      ? formatBookingDate(quickBookingState.selectedDate)
                      : 'Select travel date'}
                  </Text>
                </View>
              </>
            )}
          </Pressable>
        </View>

        {/* Error message display */}
        {quickBookingState.errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {quickBookingState.errorMessage}
            </Text>
          </View>
        ) : null}

        <Button
          title='Start Booking'
          onPress={handleStartBooking}
          loading={quickBookingLoading}
          disabled={quickBookingLoading}
          style={styles.bookButton}
        />
      </Card>

      {/* From Island Selection Modal */}
      <Modal
        visible={modalStates.showFromModal}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => closeModal('showFromModal')}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Departure Island</Text>
            <Pressable
              style={styles.modalCloseButton}
              android_ripple={{ color: Colors.border }}
              onPress={() => closeModal('showFromModal')}
            >
              {({ pressed }) => (
                <View style={pressed && { opacity: 0.7 }}>
                  <X size={24} color={Colors.text} />
                </View>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {fromIslands.map((island: string) => (
              <Pressable
                key={island}
                style={[
                  styles.islandOption,
                  quickBookingState.selectedFromIsland === island &&
                    styles.islandOptionSelected,
                ]}
                android_ripple={{
                  color:
                    quickBookingState.selectedFromIsland === island
                      ? Colors.primary
                      : Colors.highlight,
                }}
                onPress={() => {
                  updateField('selectedFromIsland', island);
                  closeModal('showFromModal');
                }}
              >
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.islandText,
                      pressed &&
                        !(quickBookingState.selectedFromIsland === island) && {
                          opacity: 0.7,
                        },
                    ]}
                  >
                    {island}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* To Island Selection Modal */}
      <Modal
        visible={modalStates.showToModal}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => closeModal('showToModal')}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Destination Island</Text>
            <Pressable
              style={styles.modalCloseButton}
              android_ripple={{ color: Colors.border }}
              onPress={() => closeModal('showToModal')}
            >
              {({ pressed }) => (
                <View style={pressed && { opacity: 0.7 }}>
                  <X size={24} color={Colors.text} />
                </View>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {toIslands.map((island: string) => (
              <Pressable
                key={island}
                style={[
                  styles.islandOption,
                  quickBookingState.selectedToIsland === island &&
                    styles.islandOptionSelected,
                ]}
                android_ripple={{
                  color:
                    quickBookingState.selectedToIsland === island
                      ? Colors.primary
                      : Colors.highlight,
                }}
                onPress={() => {
                  updateField('selectedToIsland', island);
                  closeModal('showToModal');
                }}
              >
                {({ pressed }) => (
                  <Text
                    style={[
                      styles.islandText,
                      pressed &&
                        !(quickBookingState.selectedToIsland === island) && {
                          opacity: 0.7,
                        },
                    ]}
                  >
                    {island}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Selection Calendar */}
      <CalendarDatePicker
        hideInput={true}
        visible={modalStates.showDateModal}
        value={quickBookingState.selectedDate || ''}
        onChange={date => {
          updateField('selectedDate', date);
          closeModal('showDateModal');
        }}
        onClose={() => closeModal('showDateModal')}
        minDate={new Date().toISOString().split('T')[0]}
        placeholder='Select travel date'
      />

      {/* Upcoming Trips Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Trips</Text>
        <Pressable onPress={navigateToBookings}>
          {({ pressed }) => (
            <Text style={[styles.sectionLink, pressed && { opacity: 0.7 }]}>
              View All
            </Text>
          )}
        </Pressable>
      </View>

      {upcomingBookings.length > 0 ? (
        upcomingBookings.map(booking => (
          <Pressable
            key={booking.id}
            android_ripple={{ color: Colors.highlight }}
            onPress={() => handleViewBooking(booking.id)}
          >
            {({ pressed }) => (
              <View style={pressed && { opacity: 0.8 }}>
                <Card variant='elevated' style={styles.tripCard}>
                  <View style={styles.tripHeader}>
                    <View style={styles.tripRoute}>
                      <Text style={styles.tripLocation}>
                        {booking.route.fromIsland.name}
                      </Text>
                      <View style={styles.tripArrow}>
                        <View style={styles.tripLine} />
                        <ArrowRight size={16} color={Colors.primary} />
                        <View style={styles.tripLine} />
                      </View>
                      <Text style={styles.tripLocation}>
                        {booking.route.toIsland.name}
                      </Text>
                    </View>
                    <View style={styles.tripBadge}>
                      <Text style={styles.tripBadgeText}>
                        #{booking.bookingNumber}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripDetails}>
                    <View style={styles.tripDetail}>
                      <Calendar
                        size={16}
                        color={Colors.textSecondary}
                        style={styles.tripIcon}
                      />
                      <Text style={styles.tripText}>
                        {formatBookingDate(booking.departureDate)}
                      </Text>
                    </View>

                    <View style={styles.tripDetail}>
                      <Clock
                        size={16}
                        color={Colors.textSecondary}
                        style={styles.tripIcon}
                      />
                      <Text style={styles.tripText}>
                        {formatTimeAMPM(booking.departureTime)}
                      </Text>
                    </View>

                    <View style={styles.tripDetail}>
                      <Ticket
                        size={16}
                        color={Colors.textSecondary}
                        style={styles.tripIcon}
                      />
                      <Text style={styles.tripText}>
                        {booking.passengers.length} passenger(s)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tripFooter}>
                    <Button
                      title='View Ticket'
                      variant='outline'
                      size='small'
                      onPress={() => handleViewBooking(booking.id)}
                    />
                  </View>
                </Card>
              </View>
            )}
          </Pressable>
        ))
      ) : (
        <>
          <Card variant='outlined' style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming trips</Text>
            <Button
              title='Book Now'
              variant='primary'
              size='small'
              onPress={handleBookNowClick}
              style={styles.emptyButton}
            />
          </Card>

          {isGuestMode && (
            <View style={styles.guestPrompt}>
              <Text style={styles.guestPromptText}>
                Sign in or create an account to make bookings.
              </Text>
              <Button title='Sign In' onPress={() => router.push('/(auth)')} />
            </View>
          )}
        </>
      )}

      {/* Quick Actions Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.quickActionsGrid}>
        <Pressable
          style={styles.quickActionCard}
          android_ripple={{ color: Colors.highlight }}
          onPress={() => router.push('/validate-ticket')}
        >
          {({ pressed }) => (
            <>
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#e3f2fd' }]}
              >
                <Ticket size={24} color={Colors.primary} />
              </View>
              <Text
                style={[styles.quickActionText, pressed && { opacity: 0.7 }]}
              >
                Validate Ticket
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.quickActionCard}
          android_ripple={{ color: Colors.highlight }}
          onPress={navigateToBookings}
        >
          {({ pressed }) => (
            <>
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#e8f5e9' }]}
              >
                <Clock size={24} color='#2ecc71' />
              </View>
              <Text
                style={[styles.quickActionText, pressed && { opacity: 0.7 }]}
              >
                My Bookings
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.quickActionCard}
          android_ripple={{ color: Colors.highlight }}
          onPress={handleVesselTracking}
        >
          {({ pressed }) => (
            <>
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#f3e5f5' }]}
              >
                <Ship size={24} color='#9c27b0' />
              </View>
              <Text
                style={[styles.quickActionText, pressed && { opacity: 0.7 }]}
              >
                Track Vessel
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.quickActionCard}
          android_ripple={{ color: Colors.highlight }}
          onPress={() => router.push('/support')}
        >
          {({ pressed }) => (
            <>
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#fff3e0' }]}
              >
                <LifeBuoy size={24} color='#f39c12' />
              </View>
              <Text
                style={[styles.quickActionText, pressed && { opacity: 0.7 }]}
              >
                Support
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Featured Image */}
      <Card variant='elevated' style={styles.featuredCard}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?q=80&w=1000&auto=format&fit=crop',
          }}
          style={styles.featuredImage}
          resizeMode='cover'
        />
        <View style={styles.featuredContent}>
          <Text style={styles.featuredTitle}>Explore the Islands</Text>
          <Text style={styles.featuredText}>
            Discover the beauty of Maldivian islands with our ferry services
          </Text>
          <Button
            title='Book Now'
            size='small'
            onPress={handleBookNowClick}
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
    width: '48%',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
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
  errorContainer: {
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
  },
  guestPrompt: {
    marginTop: 20,
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  guestPromptText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
});
