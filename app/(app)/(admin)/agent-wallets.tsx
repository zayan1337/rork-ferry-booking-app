import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { WalletsListPage } from '@/components/admin/finance';

export default function AgentWalletsPage() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Agent Wallets',
          headerShown: true,
        }}
      />
      <WalletsListPage agentOnly={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
});
