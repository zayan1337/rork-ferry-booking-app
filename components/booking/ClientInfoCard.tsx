import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, Mail, Phone } from 'lucide-react-native';
import Card from '@/components/Card';
import { getClientDisplayName } from '@/utils/clientUtils';
import { Client } from '@/types/agent';
import Colors from '@/constants/colors';

interface ClientInfoCardProps {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientHasAccount?: boolean;
  clients?: Client[];
}

const ClientInfoCard: React.FC<ClientInfoCardProps> = ({
  clientName,
  clientEmail,
  clientPhone,
  clientHasAccount,
  clients = [],
}) => {
  return (
    <Card variant='elevated' style={styles.clientCard}>
      <Text style={styles.cardTitle}>Client Information</Text>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <User size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Name</Text>
          <Text style={styles.detailValue}>
            {getClientDisplayName(clientName, clients)}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Mail size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{clientEmail || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <Phone size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{clientPhone || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailIcon}>
          <User size={20} color={Colors.primary} />
        </View>
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Account Status</Text>
          <Text style={styles.detailValue}>
            {clientHasAccount ? 'Has Account' : 'No Account'}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  clientCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.text,
  },
});

export default ClientInfoCard;
