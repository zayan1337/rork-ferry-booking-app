import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  Search,
  Ticket,
  Clock,
  LifeBuoy
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useBookingStore } from '@/store/bookingStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { 
    bookings, 
    fetchUserBookings, 
    isLoading, 
    resetCurrentBooking 
  } = useBookingStore();
  
  useEffect(() => {
    // Fetch user bookings when component mounts
    fetchUserBookings();
  }, []);
  
  const handleRefresh = () => {
    fetchUserBookings();
  };
  
  const handleStartBooking = () => {
    // Reset current booking state before starting a new booking
    resetCurrentBooking();
    router.push('/book');
  };
  
  const handleViewBooking = (bookingId: string) => {
    router.push(`/booking-details/${bookingId}`);
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
          <Text style={styles.userName}>{user?.fullName}</Text>
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
          <View style={styles.formRow}>
            <View style={styles.formIcon}>
              <MapPin size={20} color={Colors.primary} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>From</Text>
              <Text style={styles.formPlaceholder}>Select departure island</Text>
            </View>
          </View>
          
          <View style={styles.formDivider}>
            <ArrowRight size={16} color={Colors.textSecondary} />
          </View>
          
          <View style={styles.formRow}>
            <View style={styles.formIcon}>
              <MapPin size={20} color={Colors.secondary} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>To</Text>
              <Text style={styles.formPlaceholder}>Select destination island</Text>
            </View>
          </View>
          
          <View style={styles.formDivider} />
          
          <View style={styles.formRow}>
            <View style={styles.formIcon}>
              <Calendar size={20} color={Colors.primary} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Date</Text>
              <Text style={styles.formPlaceholder}>Select travel date</Text>
            </View>
          </View>
        </View>
        
        <Button
          title="Start Booking"
          onPress={handleStartBooking}
          fullWidth
          style={styles.bookButton}
        />
      </Card>
      
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
    color: Colors.text,
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
});