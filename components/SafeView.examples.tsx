import React from 'react';
import { Text, View, ScrollView } from 'react-native';
import SafeView from './SafeView';

/**
 * Example usage of SafeView component in different scenarios
 * This file demonstrates various configurations for different screen types
 */

// Example 1: Full safe area (default) - good for main screens
export const FullSafeAreaExample = () => (
  <SafeView>
    <Text>This content has safe area on top and bottom</Text>
    <Text>Perfect for main screens with navigation</Text>
  </SafeView>
);

// Example 2: Only bottom safe area - good for screens with custom headers
export const BottomOnlySafeAreaExample = () => (
  <SafeView edges={['bottom']}>
    <Text>Custom header area (no top safe area)</Text>
    <Text>Content with bottom safe area only</Text>
  </SafeView>
);

// Example 3: Only top safe area - good for screens with custom bottom navigation
export const TopOnlySafeAreaExample = () => (
  <SafeView edges={['top']}>
    <Text>Content with top safe area only</Text>
    <Text>Custom bottom navigation area (no bottom safe area)</Text>
  </SafeView>
);

// Example 4: No safe area - when you need full control
export const NoSafeAreaExample = () => (
  <SafeView edges={[]}>
    <Text>Full screen content with no safe areas</Text>
    <Text>You handle all spacing manually</Text>
  </SafeView>
);

// Example 5: Custom background color
export const CustomBackgroundExample = () => (
  <SafeView backgroundColor='#f0f0f0' edges={['top']}>
    <Text>Custom background color with top safe area</Text>
  </SafeView>
);

// Example 6: With ScrollView content
export const ScrollViewExample = () => (
  <SafeView edges={['top', 'bottom']}>
    <ScrollView>
      <Text>Scrollable content</Text>
      <Text>Safe areas are preserved</Text>
      {/* Add more content here */}
    </ScrollView>
  </SafeView>
);

// Example 7: Modal or overlay screens
export const ModalExample = () => (
  <SafeView edges={['top']} backgroundColor='rgba(0,0,0,0.5)'>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
        <Text>Modal content</Text>
      </View>
    </View>
  </SafeView>
);

// Example 8: Auth screens (login, register)
export const AuthScreenExample = () => (
  <SafeView edges={['bottom']} backgroundColor='white'>
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Login Form</Text>
      {/* Form inputs here */}
    </View>
  </SafeView>
);

// Example 9: Tab screen content
export const TabScreenExample = () => (
  <SafeView edges={['top']} backgroundColor='white'>
    <Text>Tab content with top safe area</Text>
    <Text>Bottom handled by tab navigator</Text>
  </SafeView>
);

// Example 10: Settings or profile screens
export const SettingsScreenExample = () => (
  <SafeView backgroundColor='#f8f9fa'>
    <ScrollView style={{ flex: 1 }}>
      <Text>Settings content</Text>
      {/* Settings options here */}
    </ScrollView>
  </SafeView>
);


