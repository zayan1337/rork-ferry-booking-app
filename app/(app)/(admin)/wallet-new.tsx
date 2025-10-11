import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import WalletCreationForm from '@/components/admin/finance/WalletCreationForm';
import { ArrowLeft } from 'lucide-react-native';

export default function WalletNewPage() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Create Wallet',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <WalletCreationForm />
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
});

