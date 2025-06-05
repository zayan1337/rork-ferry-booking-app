import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import { Booking } from '@/types';
import Colors from '@/constants/colors';
import Card from './Card';

type BookingCardProps = {
  booking: Booking;
  onPress: (booking: Booking) => void;
};

const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };
  
  return (
    <TouchableOpacity onPress={() => onPress(booking)} activeOpacity={0.7}>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: getStatusColor(booking.status) }
                ]} 
              />
              <Text style={styles.statusText}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>
            {booking.route.fromIsland.name} → {booking.route.toIsland.name}
          </Text>
          {booking.tripType === 'round_trip' && booking.returnRoute && (
            <Text style={styles.returnRouteText}>
              Return: {booking.returnRoute.fromIsland.name} → {booking.returnRoute.toIsland.name}
            </Text>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Calendar size={16} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{formatDate(booking.departureDate)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Clock size={16} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{booking.departureTime}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Users size={16} color={Colors.textSecondary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{booking.passengers.length} passenger(s)</Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.priceLabel}>Total:</Text>
          <Text style={styles.priceValue}>MVR {booking.totalFare.toFixed(2)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  returnRouteText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  infoContainer: {
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default BookingCard;