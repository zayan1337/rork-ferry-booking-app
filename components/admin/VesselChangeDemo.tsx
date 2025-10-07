import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { colors } from '@/constants/adminColors';
import { Button } from '@/components/admin/Button';
import { Ship, Users, RefreshCw, AlertCircle } from 'lucide-react-native';

/**
 * Demo component to showcase the vessel change and seat rearrangement feature
 * This component demonstrates the flow without modifying the database
 */
export default function VesselChangeDemo() {
  const [demoState, setDemoState] = useState({
    currentVessel: 'Ferry Alpha',
    newVessel: null,
    existingBookings: 0,
    passengers: [],
    rearrangementPreview: [],
    status: 'idle' as 'idle' | 'analyzing' | 'completed' | 'error',
  });

  // Mock data for demonstration
  const mockPassengers = [
    { id: 1, name: 'John Smith', oldSeat: 'A1', newSeat: 'B2', isWindow: true },
    { id: 2, name: 'Sarah Johnson', oldSeat: 'A2', newSeat: 'B3', isWindow: false },
    { id: 3, name: 'Mike Wilson', oldSeat: 'B1', newSeat: 'C1', isWindow: true },
    { id: 4, name: 'Lisa Brown', oldSeat: 'B2', newSeat: 'C2', isWindow: false },
  ];

  const simulateVesselChange = () => {
    setDemoState(prev => ({
      ...prev,
      newVessel: 'Ferry Beta',
      existingBookings: 2,
      passengers: mockPassengers,
      status: 'analyzing',
    }));

    // Simulate analysis delay
    setTimeout(() => {
      setDemoState(prev => ({
        ...prev,
        status: 'completed',
        rearrangementPreview: mockPassengers.map(p => ({
          ...p,
          status: 'pending',
        })),
      }));
    }, 2000);
  };

  const applyRearrangement = () => {
    Alert.alert(
      'Confirm Seat Rearrangement',
      `This will automatically reassign ${mockPassengers.length} passengers to new vessel seats. This action cannot be undone. Do you want to continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply Rearrangement', 
          style: 'destructive',
          onPress: () => {
            setDemoState(prev => ({
              ...prev,
              status: 'completed',
              currentVessel: prev.newVessel || prev.currentVessel,
              newVessel: null,
              existingBookings: 0,
              passengers: [],
              rearrangementPreview: [],
            }));
            Alert.alert(
              'Seat Rearrangement Complete',
              `Successfully rearranged ${mockPassengers.length} passengers to new vessel seats.`
            );
          }
        }
      ]
    );
  };

  const resetDemo = () => {
    setDemoState({
      currentVessel: 'Ferry Alpha',
      newVessel: null,
      existingBookings: 0,
      passengers: [],
      rearrangementPreview: [],
      status: 'idle',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ship size={24} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Vessel Change Demo</Text>
          <Text style={styles.subtitle}>
            Demonstration of automatic seat rearrangement when changing vessels
          </Text>
        </View>
      </View>

      {/* Current State */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Vessel</Text>
        <View style={styles.vesselInfo}>
          <Text style={styles.vesselName}>{demoState.currentVessel}</Text>
          <Text style={styles.vesselDetails}>Capacity: 50 seats</Text>
        </View>
      </View>

      {/* Vessel Change Simulation */}
      {!demoState.newVessel && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simulate Vessel Change</Text>
          <Text style={styles.sectionDescription}>
            Click the button below to simulate changing to a different vessel with existing bookings.
          </Text>
          <Button
            title="Change to Ferry Beta"
            onPress={simulateVesselChange}
            variant="primary"
            icon={<Ship size={16} color={colors.white} />}
          />
        </View>
      )}

      {/* Vessel Change Detection */}
      {demoState.newVessel && (
        <View style={styles.vesselChangeContainer}>
          <View style={styles.vesselChangeHeader}>
            <View style={styles.vesselChangeIcon}>
              <RefreshCw size={20} color={colors.warning} />
            </View>
            <View style={styles.vesselChangeContent}>
              <Text style={styles.vesselChangeTitle}>
                Vessel Change Detected
              </Text>
              <Text style={styles.vesselChangeSubtitle}>
                {demoState.existingBookings} existing booking(s) found. 
                Automatic seat rearrangement is available.
              </Text>
            </View>
          </View>

          {/* Analysis Status */}
          {demoState.status === 'analyzing' && (
            <View style={styles.rearrangementStatus}>
              <View style={styles.rearrangementStatusIcon}>
                <RefreshCw size={16} color={colors.info} />
              </View>
              <Text style={styles.rearrangementStatusText}>
                Analyzing existing bookings and generating seat mapping...
              </Text>
            </View>
          )}

          {/* Rearrangement Preview */}
          {demoState.status === 'completed' && demoState.rearrangementPreview.length > 0 && (
            <View style={styles.rearrangementPreview}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIcon}>
                  <Users size={16} color={colors.primary} />
                </View>
                <Text style={styles.previewTitle}>
                  Seat Rearrangement Preview
                </Text>
              </View>
              
              <Text style={styles.previewSubtitle}>
                {demoState.rearrangementPreview.length} passengers will be automatically reassigned to new vessel seats.
              </Text>

              {/* Show rearrangements */}
              {demoState.rearrangementPreview.map((passenger, index) => (
                <View key={index} style={styles.rearrangementItem}>
                  <Text style={styles.passengerName}>{passenger.name}</Text>
                  <View style={styles.seatChange}>
                    <Text style={styles.seatChangeText}>
                      Seat {passenger.oldSeat} → Seat {passenger.newSeat}
                    </Text>
                    <Text style={styles.seatChangeDetails}>
                      {passenger.isWindow ? 'Window' : 'Aisle'} seat
                    </Text>
                  </View>
                </View>
              ))}

              <View style={styles.rearrangementActions}>
                <Button
                  title="Apply Seat Rearrangement"
                  onPress={applyRearrangement}
                  variant="primary"
                  icon={<RefreshCw size={16} color={colors.white} />}
                />
                <Button
                  title="Reset Demo"
                  onPress={resetDemo}
                  variant="outline"
                />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  vesselInfo: {
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 8,
  },
  vesselName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  vesselDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Vessel change detection styles
  vesselChangeContainer: {
    backgroundColor: colors.warningLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  vesselChangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vesselChangeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.warning}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vesselChangeContent: {
    flex: 1,
  },
  vesselChangeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
  },
  vesselChangeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Rearrangement status styles
  rearrangementStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.info}10`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  rearrangementStatusIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.info}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rearrangementStatusText: {
    fontSize: 14,
    color: colors.info,
    fontWeight: '600',
    flex: 1,
  },
  // Rearrangement preview styles
  rearrangementPreview: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  previewSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  rearrangementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  seatChange: {
    alignItems: 'flex-end',
  },
  seatChangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  seatChangeDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rearrangementActions: {
    marginTop: 16,
    gap: 12,
  },
});
