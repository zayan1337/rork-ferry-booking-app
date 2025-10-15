import React, { useState } from 'react';
import { Alert, Pressable, Text, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { supabase } from '@/utils/supabase';
import Colors from '@/constants/colors';

interface GenerateTripsButtonProps {
  routeId: string;
  date: string;
  onTripsGenerated?: () => void;
}

export default function GenerateTripsButton({
  routeId,
  date,
  onTripsGenerated,
}: GenerateTripsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTripsForDate = async () => {
    if (isGenerating) return;

    Alert.alert(
      'Generate Trips',
      `Generate trips for this route on ${new Date(date).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsGenerating(true);
            try {
              // Get all active vessels
              const { data: vessels, error: vesselError } = await supabase
                .from('vessels')
                .select('id, seating_capacity')
                .eq('is_active', true);

              if (vesselError) throw vesselError;

              if (!vessels || vessels.length === 0) {
                Alert.alert(
                  'No Vessels',
                  'No active vessels found to create trips.'
                );
                return;
              }

              // Define common departure times
              const departureTimes = [
                '06:00:00',
                '08:30:00',
                '11:00:00',
                '14:00:00',
                '16:30:00',
                '19:00:00',
              ];

              // Generate trips for each vessel and time slot
              const tripsToInsert = [];
              for (const vessel of vessels) {
                for (const time of departureTimes) {
                  tripsToInsert.push({
                    route_id: routeId,
                    travel_date: date,
                    departure_time: time,
                    vessel_id: vessel.id,
                    available_seats: vessel.seating_capacity,
                    is_active: true,
                  });
                }
              }

              // Insert trips
              const { error: insertError } = await supabase
                .from('trips')
                .insert(tripsToInsert);

              if (insertError) {
                // If error is due to unique constraint, some trips already exist
                if (insertError.code === '23505') {
                  Alert.alert(
                    'Partial Success',
                    'Some trips already existed, but new ones were added where possible.'
                  );
                } else {
                  throw insertError;
                }
              } else {
                Alert.alert(
                  'Success',
                  `Generated ${tripsToInsert.length} trips for this route.`
                );
              }

              // Notify parent component to refresh
              onTripsGenerated?.();
            } catch (error) {
              console.error('Error generating trips:', error);
              Alert.alert(
                'Error',
                'Failed to generate trips. Please try again or contact support.'
              );
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Pressable
      style={[styles.button, isGenerating && styles.buttonDisabled]}
      onPress={generateTripsForDate}
      disabled={isGenerating}
    >
      <Plus
        size={16}
        color={isGenerating ? Colors.textSecondary : Colors.primary}
      />
      <Text
        style={[styles.buttonText, isGenerating && styles.buttonTextDisabled]}
      >
        {isGenerating ? 'Generating...' : 'Generate Trips'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    marginTop: 8,
  },
  buttonDisabled: {
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  buttonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonTextDisabled: {
    color: Colors.textSecondary,
  },
});
