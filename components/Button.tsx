import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import Colors from '@/constants/colors';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
};

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = () => {
    const baseStyle: ViewStyle[] = [styles.button];
    
    // Add size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLarge);
        break;
      default:
        baseStyle.push(styles.buttonMedium);
    }
    
    // Add variant styles
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.buttonSecondary);
        break;
      case 'outline':
        baseStyle.push(styles.buttonOutline);
        break;
      case 'text':
        baseStyle.push(styles.buttonText);
        break;
      default:
        baseStyle.push(styles.buttonPrimary);
    }
    
    // Add full width style
    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }
    
    // Add disabled style
    if (disabled || loading) {
      baseStyle.push(styles.buttonDisabled);
    }
    
    return baseStyle;
  };
  
  const getTextStyle = () => {
    const baseStyle: TextStyle[] = [styles.buttonLabel];
    
    // Add size styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonLabelSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLabelLarge);
        break;
      default:
        baseStyle.push(styles.buttonLabelMedium);
    }
    
    // Add variant styles
    switch (variant) {
      case 'outline':
        baseStyle.push(styles.buttonLabelOutline);
        break;
      case 'text':
        baseStyle.push(styles.buttonLabelText);
        break;
      case 'secondary':
        baseStyle.push(styles.buttonLabelSecondary);
        break;
      default:
        baseStyle.push(styles.buttonLabelPrimary);
    }
    
    // Add disabled style
    if (disabled || loading) {
      baseStyle.push(styles.buttonLabelDisabled);
    }
    
    return baseStyle;
  };
  
  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' ? '#fff' : Colors.primary} 
        />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  buttonMedium: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: Colors.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonLabel: {
    fontWeight: '600',
  },
  buttonLabelSmall: {
    fontSize: 14,
  },
  buttonLabelMedium: {
    fontSize: 16,
  },
  buttonLabelLarge: {
    fontSize: 18,
  },
  buttonLabelPrimary: {
    color: '#fff',
  },
  buttonLabelSecondary: {
    color: '#fff',
  },
  buttonLabelOutline: {
    color: Colors.primary,
  },
  buttonLabelText: {
    color: Colors.primary,
  },
  buttonLabelDisabled: {
    color: '#999',
  },
});

export default Button;