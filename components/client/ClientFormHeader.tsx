import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ClientFormHeaderProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

const ClientFormHeader: React.FC<ClientFormHeaderProps> = ({
  title,
  subtitle,
  icon = <UserPlus size={32} color={Colors.primary} />,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ClientFormHeader; 