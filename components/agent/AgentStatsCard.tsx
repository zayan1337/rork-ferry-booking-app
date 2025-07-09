import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClientSearchStats } from '@/types/agent';
import Colors from '@/constants/colors';

interface AgentStatsCardProps {
  stats: ClientSearchStats;
  style?: any;
}

export default function AgentStatsCard({ stats, style }: AgentStatsCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalClients}</Text>
        <Text style={styles.statLabel}>Total Clients</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.filteredClients}</Text>
        <Text style={styles.statLabel}>Showing</Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={styles.statValue}>
          {stats.averageBookings.toFixed(1)}
        </Text>
        <Text style={styles.statLabel}>Avg. Bookings</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.subtext,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
  },
}); 