import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  children?: React.ReactNode;
  delay?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  children,
  delay = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const startFade = () => {
      const fadeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.7,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      if (delay > 0) {
        setTimeout(() => fadeAnimation.start(), delay);
      } else {
        fadeAnimation.start();
      }

      return fadeAnimation;
    };

    const animation = startFade();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, delay]);

  if (children) {
    return (
      <Animated.View
        style={[
          {
            backgroundColor: Colors.skeleton,
            borderRadius,
            opacity: fadeAnim,
          },
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.skeleton,
          opacity: fadeAnim,
        },
        style,
      ]}
    />
  );
};

// Base skeleton components that can be reused
export const SkeletonText: React.FC<{
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  lastLineWidth?: string;
  delay?: number;
}> = ({
  lines = 1,
  lineHeight = 16,
  spacing = 8,
  lastLineWidth = '70%',
  delay = 0,
}) => (
  <View>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        height={lineHeight}
        width={index === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
        style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        delay={delay + index * 100}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC<{
  height?: number;
  padding?: number;
  children?: React.ReactNode;
  style?: any;
}> = ({ height = 120, padding = 16, children, style }) => (
  <View style={[styles.card, { height, padding }, style]}>{children}</View>
);

export const SkeletonContainer: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => (
  <View style={[styles.container, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  container: {
    borderRadius: 12,
    padding: 16,
  },
});

export default Skeleton;
