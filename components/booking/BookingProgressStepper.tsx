import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface BookingProgressStepperProps {
  steps: Step[];
  currentStep: number;
}

const BookingProgressStepper: React.FC<BookingProgressStepperProps> = ({
  steps,
  currentStep,
}) => {
  return (
    <View style={styles.container}>
      {steps.map(step => (
        <View key={step.id} style={styles.step}>
          <View
            style={[styles.dot, currentStep >= step.id && styles.dotActive]}
          >
            {currentStep > step.id && <Check size={12} color='#fff' />}
          </View>
          <Text
            style={[styles.text, currentStep >= step.id && styles.textActive]}
          >
            {step.label}
          </Text>
        </View>
      ))}
      <View style={styles.line} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    position: 'relative',
  },
  line: {
    position: 'absolute',
    top: 12,
    left: 25,
    right: 25,
    height: 2,
    backgroundColor: Colors.border,
    zIndex: -1,
  },
  step: {
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  textActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default BookingProgressStepper;
