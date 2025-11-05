import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { ArrowLeft, Users } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { supabase } from '@/utils/supabase';
import EmptyState from '@/components/admin/EmptyState';

interface AgentClient {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  created_at: string;
}

export default function AgentClientsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [clients, setClients] = useState<AgentClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadClients();
  }, [id]);

  const loadClients = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Fetch agent clients
      const { data, error } = await supabase
        .from('agent_clients')
        .select(
          `
          id,
          full_name,
          email,
          mobile_number,
          created_at,
          client:client_id(
            id,
            full_name,
            email,
            mobile_number
          )
        `
        )
        .eq('agent_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data
      const transformedClients: AgentClient[] = (data || []).map(
        (item: any) => {
          const client = item.client
            ? Array.isArray(item.client)
              ? item.client[0]
              : item.client
            : null;

          return {
            id: client?.id || item.id,
            full_name: client?.full_name || item.full_name || 'Unknown',
            email: client?.email || item.email || '',
            mobile_number: client?.mobile_number || item.mobile_number || '',
            created_at: item.created_at,
          };
        }
      );

      setClients(transformedClients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClients();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Agent Clients',
          headerShown: true,
          headerLeft: () => (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {clients.length === 0 ? (
            <EmptyState
              icon={<Users size={48} color={colors.textSecondary} />}
              title='No Clients'
              message='This agent has no clients yet.'
            />
          ) : (
            <View style={styles.listContainer}>
              <Text style={styles.sectionTitle}>
                {clients.length} Client{clients.length !== 1 ? 's' : ''}
              </Text>
              {clients.map(client => (
                <View key={client.id} style={styles.clientCard}>
                  <View style={styles.clientHeader}>
                    <View style={styles.clientAvatar}>
                      <Text style={styles.clientInitials}>
                        {client.full_name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.full_name}</Text>
                      {client.email && (
                        <Text style={styles.clientEmail}>{client.email}</Text>
                      )}
                      {client.mobile_number && (
                        <Text style={styles.clientPhone}>
                          {client.mobile_number}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  listContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  clientCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  clientInfo: {
    flex: 1,
    gap: 4,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  clientEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  clientPhone: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
