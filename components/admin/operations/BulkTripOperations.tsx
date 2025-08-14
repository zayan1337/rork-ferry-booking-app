import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { colors } from '@/constants/adminColors';
import { Trip } from '@/types/operations';
import Button from '@/components/admin/Button';
import Input from '@/components/Input';
import Dropdown from '@/components/Dropdown';
import {
  X,
  Calendar,
  Clock,
  CheckCircle,
  RefreshCw,
  DollarSign,
} from 'lucide-react-native';

interface BulkTripOperationsProps {
  selectedTrips: Trip[];
  onClose: () => void;
  onOperationComplete: () => void;
  visible: boolean;
}

interface BulkOperation {
  type: 'cancel' | 'delay' | 'reschedule' | 'updateFare' | 'updateStatus';
  label: string;
  icon: React.ReactNode;
  description: string;
  requiresInput: boolean;
}

export default function BulkTripOperations({
  selectedTrips,
  onClose,
  onOperationComplete,
  visible,
}: BulkTripOperationsProps) {
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationData, setOperationData] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const operations: BulkOperation[] = [
    {
      type: 'cancel',
      label: 'Cancel Trips',
      icon: <X size={20} color={colors.danger} />,
      description: 'Cancel all selected trips',
      requiresInput: true,
    },
    {
      type: 'delay',
      label: 'Delay Trips',
      icon: <Clock size={20} color={colors.warning} />,
      description: 'Add delay to selected trips',
      requiresInput: true,
    },
    {
      type: 'reschedule',
      label: 'Reschedule Trips',
      icon: <Calendar size={20} color={colors.primary} />,
      description: 'Change departure times for selected trips',
      requiresInput: true,
    },
    {
      type: 'updateFare',
      label: 'Update Fare Multiplier',
      icon: <DollarSign size={20} color={colors.success} />,
      description: 'Change fare multiplier for selected trips',
      requiresInput: true,
    },
    {
      type: 'updateStatus',
      label: 'Update Status',
      icon: <RefreshCw size={20} color={colors.secondary} />,
      description: 'Change status for selected trips',
      requiresInput: true,
    },
  ];

  const statusOptions = [
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Boarding', value: 'boarding' },
    { label: 'Departed', value: 'departed' },
    { label: 'Arrived', value: 'arrived' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Delayed', value: 'delayed' },
  ];

  const handleOperationSelect = (operationType: string) => {
    setSelectedOperation(operationType);
    setOperationData({});
  };

  const handleExecuteOperation = async () => {
    if (!selectedOperation) {
      Alert.alert('Error', 'Please select an operation');
      return;
    }

    const operation = operations.find(op => op.type === selectedOperation);
    if (!operation) return;

    // Validate required inputs
    if (operation.requiresInput) {
      const isValid = validateOperationData(selectedOperation, operationData);
      if (!isValid) return;
    }

    Alert.alert(
      'Confirm Bulk Operation',
      `Are you sure you want to ${operation.label.toLowerCase()} for ${selectedTrips.length} trips? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: executeOperation },
      ]
    );
  };

  const validateOperationData = (operation: string, data: any): boolean => {
    switch (operation) {
      case 'cancel':
        if (!data.reason || data.reason.trim().length === 0) {
          Alert.alert('Error', 'Please provide a cancellation reason');
          return false;
        }
        break;
      case 'delay':
        if (!data.delayMinutes || isNaN(parseInt(data.delayMinutes))) {
          Alert.alert(
            'Error',
            'Please provide valid delay duration in minutes'
          );
          return false;
        }
        if (!data.delayReason || data.delayReason.trim().length === 0) {
          Alert.alert('Error', 'Please provide a delay reason');
          return false;
        }
        break;
      case 'reschedule':
        if (!data.newTime || data.newTime.trim().length === 0) {
          Alert.alert('Error', 'Please provide new departure time');
          return false;
        }
        break;
      case 'updateFare':
        if (!data.fareMultiplier || isNaN(parseFloat(data.fareMultiplier))) {
          Alert.alert('Error', 'Please provide valid fare multiplier');
          return false;
        }
        break;
      case 'updateStatus':
        if (!data.status) {
          Alert.alert('Error', 'Please select a status');
          return false;
        }
        break;
    }
    return true;
  };

  const executeOperation = async () => {
    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Success',
        `Bulk operation completed successfully for ${selectedTrips.length} trips.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onOperationComplete();
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to execute bulk operation. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const renderOperationForm = () => {
    switch (selectedOperation) {
      case 'cancel':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Cancellation Reason</Text>
            <Input
              placeholder='Enter reason for cancellation...'
              value={operationData.reason || ''}
              onChangeText={text =>
                setOperationData(prev => ({ ...prev, reason: text }))
              }
              multiline
              numberOfLines={3}
            />
          </View>
        );

      case 'delay':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Delay Duration (minutes)</Text>
            <Input
              placeholder='Enter delay in minutes (e.g., 30)'
              value={operationData.delayMinutes || ''}
              onChangeText={text =>
                setOperationData(prev => ({ ...prev, delayMinutes: text }))
              }
              keyboardType='numeric'
            />
            <Text style={styles.formLabel}>Delay Reason</Text>
            <Input
              placeholder='Enter reason for delay...'
              value={operationData.delayReason || ''}
              onChangeText={text =>
                setOperationData(prev => ({ ...prev, delayReason: text }))
              }
              multiline
              numberOfLines={2}
            />
          </View>
        );

      case 'reschedule':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>New Departure Time</Text>
            <Input
              placeholder='Enter new time (HH:MM)'
              value={operationData.newTime || ''}
              onChangeText={text =>
                setOperationData(prev => ({ ...prev, newTime: text }))
              }
            />
            <Text style={styles.formLabel}>Reschedule Reason (Optional)</Text>
            <Input
              placeholder='Enter reason for reschedule...'
              value={operationData.rescheduleReason || ''}
              onChangeText={text =>
                setOperationData(prev => ({ ...prev, rescheduleReason: text }))
              }
              multiline
              numberOfLines={2}
            />
          </View>
        );

      case 'updateFare':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>Fare Multiplier</Text>
            <Input
              placeholder='Enter fare multiplier (e.g., 1.5)'
              value={operationData.fareMultiplier || ''}
              onChangeText={text =>
                setOperationData(prev => ({ ...prev, fareMultiplier: text }))
              }
              keyboardType='decimal-pad'
            />
            <Text style={styles.formHelper}>
              1.0 = Normal fare, 1.5 = 50% increase, 0.8 = 20% discount
            </Text>
          </View>
        );

      case 'updateStatus':
        return (
          <View style={styles.formContainer}>
            <Text style={styles.formLabel}>New Status</Text>
            <Dropdown
              placeholder='Select new status...'
              value={operationData.status || ''}
              onValueChange={value =>
                setOperationData(prev => ({ ...prev, status: value }))
              }
              items={statusOptions}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Bulk Trip Operations</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              Selected {selectedTrips.length} trip
              {selectedTrips.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.summarySubtext}>
              Choose an operation to apply to all selected trips
            </Text>
          </View>

          {/* Trip Summary */}
          <View style={styles.tripsContainer}>
            <Text style={styles.sectionTitle}>Selected Trips</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tripsList}>
                {selectedTrips.slice(0, 5).map((trip, index) => (
                  <View key={trip.id} style={styles.tripCard}>
                    <Text style={styles.tripRoute}>
                      {trip.routeName || 'Unknown Route'}
                    </Text>
                    <Text style={styles.tripTime}>
                      {new Date(trip.travel_date).toLocaleDateString()} at{' '}
                      {trip.departure_time}
                    </Text>
                  </View>
                ))}
                {selectedTrips.length > 5 && (
                  <View style={styles.tripCard}>
                    <Text style={styles.tripRoute}>
                      +{selectedTrips.length - 5}
                    </Text>
                    <Text style={styles.tripTime}>more trips</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Operations */}
          <View style={styles.operationsContainer}>
            <Text style={styles.sectionTitle}>Select Operation</Text>
            <View style={styles.operationsList}>
              {operations.map(operation => (
                <TouchableOpacity
                  key={operation.type}
                  style={[
                    styles.operationCard,
                    selectedOperation === operation.type &&
                      styles.operationCardSelected,
                  ]}
                  onPress={() => handleOperationSelect(operation.type)}
                >
                  <View style={styles.operationIcon}>{operation.icon}</View>
                  <View style={styles.operationContent}>
                    <Text style={styles.operationLabel}>{operation.label}</Text>
                    <Text style={styles.operationDescription}>
                      {operation.description}
                    </Text>
                  </View>
                  {selectedOperation === operation.type && (
                    <CheckCircle size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Operation Form */}
          {selectedOperation && renderOperationForm()}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            title='Cancel'
            variant='outline'
            onPress={onClose}
            style={styles.actionButton}
          />
          <Button
            title={isProcessing ? 'Processing...' : 'Execute Operation'}
            variant='primary'
            onPress={handleExecuteOperation}
            disabled={!selectedOperation || isProcessing}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: colors.primaryLight,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  tripsContainer: {
    marginBottom: 24,
  },
  tripsList: {
    flexDirection: 'row',
    gap: 12,
  },
  tripCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tripRoute: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  operationsContainer: {
    marginBottom: 24,
  },
  operationsList: {
    gap: 12,
  },
  operationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  operationCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  operationIcon: {
    marginRight: 12,
  },
  operationContent: {
    flex: 1,
  },
  operationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 2,
  },
  operationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  formContainer: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
  },
  formHelper: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
