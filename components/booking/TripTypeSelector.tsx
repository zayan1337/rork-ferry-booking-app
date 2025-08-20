import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

type TripType = 'one_way' | 'round_trip';

interface TripTypeSelectorProps {
  value: TripType | null;
  onChange: (tripType: TripType) => void;
  options?: { value: TripType; label: string }[];
  error?: string;
}

const DEFAULT_OPTIONS = [
  { value: 'one_way' as TripType, label: 'One Way' },
  { value: 'round_trip' as TripType, label: 'Round Trip' },
];

const TripTypeSelector: React.FC<TripTypeSelectorProps> = ({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  error,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.buttonContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.button,
              value === option.value && styles.buttonActive,
              error && styles.buttonError,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.buttonText,
                value === option.value && styles.buttonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  buttonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  buttonError: {
    borderColor: Colors.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonTextActive: {
    color: Colors.card,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 8,
  },
});

export default TripTypeSelector;
