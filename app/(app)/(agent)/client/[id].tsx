import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useAgentStore } from '@/store/agent/agentStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useRouter } from 'expo-router';
import {
  Mail,
  Phone,
  User,
  BookOpen,
  Calendar,
  UserX,
} from 'lucide-react-native';
import AgentBookingCard from '@/components/AgentBookingCard';
import { isBookingActive, isBookingInactive } from '@/utils/bookingUtils';

export default function ClientDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const clients = useAgentStore(state => state.clients);
  const getBookingsByClient = useAgentStore(state => state.getBookingsByClient);
  const client = clients.find(c => c.id === id);
  const clientBookings = getBookingsByClient(id || '');

  if (!client) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Client not found</Text>
        <Button
          title='Go Back'
          onPress={() => router.back()}
          variant='primary'
        />
      </View>
    );
  }

  const handleBookingPress = (bookingId: string) => {
    router.push(`../booking/${bookingId}`);
  };

  const handleNewBooking = () => {
    router.push({
      pathname: '../booking/new',
      params: { clientId: client.id },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: client.name }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {client.name
                .split(' ')
                .map(n => n[0])
                .join('')}
            </Text>
          </View>
          <Text style={styles.name}>{client.name}</Text>
        </View>

        <Card variant='elevated' style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoRow}>
            <Mail size={20} color={Colors.subtext} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{client.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Phone size={20} color={Colors.subtext} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{client.phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            {client.hasAccount ? (
              <User size={20} color={Colors.primary} />
            ) : (
              <UserX size={20} color={Colors.subtext} />
            )}
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <Text
                style={[
                  styles.infoValue,
                  !client.hasAccount && styles.infoValueWarning,
                ]}
              >
                {client.hasAccount ? 'Has User Account' : 'No User Account'}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <BookOpen size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{clientBookings.length}</Text>
            <Text style={styles.statLabel}>All Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <Calendar size={24} color={Colors.primary} />
            <Text style={styles.statValue}>
              {clientBookings.filter(isBookingActive).length}
            </Text>
            <Text style={styles.statLabel}>Active Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <Calendar size={24} color={Colors.warning} />
            <Text style={[styles.statValue, { color: Colors.warning }]}>
              {clientBookings.filter(isBookingInactive).length}
            </Text>
            <Text style={styles.statLabel}>Inactive Bookings</Text>
          </View>
        </View>

        <View style={styles.bookingsHeader}>
          <Text style={styles.sectionTitle}>Client Bookings</Text>
          <Button
            title='New Booking'
            onPress={handleNewBooking}
            variant='primary'
            size='small'
          />
        </View>

        {clientBookings.length > 0 ? (
          clientBookings.map(booking => (
            <AgentBookingCard
              key={booking.id}
              booking={booking}
              onPress={() => handleBookingPress(booking.id)}
            />
          ))
        ) : (
          <Card variant='outlined' style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No bookings found for this client
            </Text>
            <Button
              title='Create a Booking'
              onPress={handleNewBooking}
              variant='primary'
              style={styles.emptyButton}
            />
          </Card>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.subtext,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  infoCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.subtext,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  infoValueWarning: {
    color: '#856404',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.subtext,
    textAlign: 'center',
  },
  bookingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.subtext,
    marginBottom: 16,
  },
  emptyButton: {
    minWidth: 200,
  },
});
