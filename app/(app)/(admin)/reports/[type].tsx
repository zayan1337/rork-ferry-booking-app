import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { BarChart, FileText, TrendingUp } from 'lucide-react-native';
import Button from '@/components/admin/Button';

export default function ReportDetailsScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();

  const getReportInfo = () => {
    switch (type) {
      case 'revenue':
        return {
          title: 'Revenue Report',
          icon: <TrendingUp size={64} color={colors.success} />,
          description: 'Detailed revenue analysis and financial insights.',
        };
      case 'bookings':
        return {
          title: 'Bookings Report',
          icon: <BarChart size={64} color={colors.primary} />,
          description: 'Comprehensive booking statistics and trends.',
        };
      case 'vessels':
        return {
          title: 'Vessel Performance Report',
          icon: <FileText size={64} color={colors.secondary} />,
          description: 'Vessel utilization and performance metrics.',
        };
      default:
        return {
          title: 'Report',
          icon: <FileText size={64} color={colors.textSecondary} />,
          description: 'Report details and analytics.',
        };
    }
  };

  const reportInfo = getReportInfo();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: reportInfo.title,
        }}
      />

      <View style={styles.content}>
        {reportInfo.icon}
        <Text style={styles.title}>{reportInfo.title}</Text>
        <Text style={styles.description}>{reportInfo.description}</Text>

        <Text style={styles.comingSoon}>
          Detailed reporting features are coming soon!
        </Text>

        <Button
          title='Back to Reports'
          variant='primary'
          onPress={() => router.push('/(admin)/(tabs)/reports' as any)}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  comingSoon: {
    fontSize: 14,
    color: colors.warning,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 32,
  },
});
