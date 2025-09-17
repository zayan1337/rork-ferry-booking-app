import React from 'react';
import { View } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { SafeViewProps } from '@/types/components';

/**
 * A reusable SafeView component that provides flexible safe area handling
 *
 * @param children - The content to render inside the safe area
 * @param style - Additional styles to apply to the container
 * @param backgroundColor - Background color for the safe area (defaults to 'white')
 * @param edges - Array of edges to apply safe area to. Options: 'top', 'bottom', 'left', 'right'
 *                Defaults to ['top', 'bottom'] for full safe area
 * @param mode - Whether to use 'padding' or 'margin' for safe area (defaults to 'padding')
 *
 * @example
 * // Full safe area (top and bottom)
 * <SafeView>
 *   <YourContent />
 * </SafeView>
 *
 * @example
 * // Only bottom safe area
 * <SafeView edges={['bottom']}>
 *   <YourContent />
 * </SafeView>
 *
 * @example
 * // Only top safe area
 * <SafeView edges={['top']}>
 *   <YourContent />
 * </SafeView>
 *
 * @example
 * // No safe area (regular View)
 * <SafeView edges={[]}>
 *   <YourContent />
 * </SafeView>
 *
 * @example
 * // Custom background color
 * <SafeView backgroundColor="#f0f0f0" edges={['top']}>
 *   <YourContent />
 * </SafeView>
 */
const SafeView: React.FC<SafeViewProps> = ({
  children,
  style,
  backgroundColor = 'white',
  edges = ['top', 'bottom'],
  mode = 'padding',
}) => {
  // If no edges are specified, use a regular View
  if (!edges || edges.length === 0) {
    return (
      <View style={[{ flex: 1, backgroundColor }, style]}>{children}</View>
    );
  }

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor }, style]}
      edges={edges as Edge[]}
      mode={mode}
    >
      {children}
    </SafeAreaView>
  );
};

export default SafeView;
