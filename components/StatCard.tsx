import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  color = Colors.primary,
}: StatCardProps) {
  return (
    <Card variant='outlined' style={styles.card}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={[styles.value, { color }]}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Text>
      <Text style={styles.title}>{title}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    padding: 16,
    marginRight: 12,
    minWidth: 120,
  },
  iconContainer: {
    marginBottom: 8,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: Colors.subtext,
    textAlign: 'center',
  },
});
