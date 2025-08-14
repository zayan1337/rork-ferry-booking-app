import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock, MapPin, Users } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { TicketCardProps } from '@/types/components';
import Colors from '@/constants/colors';
import Card from './Card';

const TicketCard: React.FC<TicketCardProps> = ({ booking }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Card variant='elevated' style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Ferry Ticket</Text>
        <Text style={styles.bookingNumber}>#{booking.bookingNumber}</Text>
      </View>

      <View style={styles.qrContainer}>
        {booking.qrCodeUrl ? (
          <QRCode
            value={booking.qrCodeUrl}
            size={150}
            color={Colors.text}
            backgroundColor={Colors.card}
          />
        ) : (
          <View style={styles.qrPlaceholder}>
            <Text style={styles.qrPlaceholderText}>QR Code</Text>
            <Text style={styles.qrPlaceholderText}>
              #{booking.bookingNumber}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.routeContainer}>
        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.startDot]} />
            <Text style={styles.routeLocation}>
              {booking.route.fromIsland.name}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.endDot]} />
            <Text style={styles.routeLocation}>
              {booking.route.toIsland.name}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Calendar
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {formatDate(booking.departureDate)}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Clock
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{booking.departureTime}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MapPin
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoLabel}>Zone</Text>
            <Text style={styles.infoValue}>
              {booking.route.fromIsland.zone}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Users
              size={16}
              color={Colors.textSecondary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoLabel}>Passengers</Text>
            <Text style={styles.infoValue}>{booking.passengers.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.seatsContainer}>
        <Text style={styles.seatsLabel}>Seats:</Text>
        <Text style={styles.seatsValue}>
          {booking.seats.map(seat => seat.number).join(', ')}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Please present this ticket when boarding
        </Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  bookingNumber: {
    fontSize: 16,
    color: Colors.text,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  qrCode: {
    width: 150,
    height: 150,
    backgroundColor: '#fff',
  },
  qrPlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 16,
  },
  routeContainer: {
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routePoint: {
    alignItems: 'center',
    width: 100,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  startDot: {
    backgroundColor: Colors.primary,
  },
  endDot: {
    backgroundColor: Colors.secondary,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
  routeLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoIcon: {
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  seatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  seatsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  seatsValue: {
    fontSize: 14,
    color: Colors.text,
  },
  footer: {
    backgroundColor: Colors.highlight,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: -16,
    marginBottom: -16,
  },
  footerText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default TicketCard;
