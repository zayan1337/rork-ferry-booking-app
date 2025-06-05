import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
};

const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'medium',
}) => {
  const getCardStyle = () => {
    const baseStyle: ViewStyle[] = [styles.card];
    
    // Add variant styles
    switch (variant) {
      case 'elevated':
        baseStyle.push(styles.cardElevated);
        break;
      case 'outlined':
        baseStyle.push(styles.cardOutlined);
        break;
      default:
        baseStyle.push(styles.cardDefault);
    }
    
    // Add padding styles
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.push(styles.paddingSmall);
        break;
      case 'large':
        baseStyle.push(styles.paddingLarge);
        break;
      default:
        baseStyle.push(styles.paddingMedium);
    }
    
    return baseStyle;
  };
  
  return (
    <View style={[...getCardStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: Colors.card,
    overflow: 'hidden',
  },
  cardDefault: {
    backgroundColor: Colors.card,
  },
  cardElevated: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardOutlined: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paddingSmall: {
    padding: 8,
  },
  paddingMedium: {
    padding: 16,
  },
  paddingLarge: {
    padding: 24,
  },
});

export default Card;