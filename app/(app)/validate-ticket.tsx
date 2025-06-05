import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { Search, CheckCircle, XCircle } from 'lucide-react-native';
import { useBookingStore } from '@/store/bookingStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import TicketCard from '@/components/TicketCard';

// Define interface for booking
interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  departureDate: string;
  departureTime: string;
  route: {
    fromIsland: {
      name: string;
    };
    toIsland: {
      name: string;
    };
  };
  passengers: any[];
  seats: {
    number: string;
  }[];
}

// Define interface for validation result
interface ValidationResult {
  isValid: boolean;
  booking: Booking | null;
  message: string;
}

export default function ValidateTicketScreen() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  
  const { bookings } = useBookingStore();
  
  const handleValidate = () => {
    if (!bookingNumber.trim()) {
      return;
    }
    
    setIsValidating(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const booking = bookings.find(b => b.bookingNumber === bookingNumber);
      
      if (booking) {
        // Check if booking is valid (confirmed status and future/current date)
        const isValid = booking.status === 'confirmed' && 
                        new Date(booking.departureDate) >= new Date(new Date().setHours(0, 0, 0, 0));
        
        setValidationResult({
          isValid,
          booking,
          message: isValid 
            ? "Ticket is valid for travel today" 
            : "Ticket is not valid for travel"
        });
      } else {
        setValidationResult({
          isValid: false,
          booking: null,
          message: "Booking not found"
        });
      }
      
      setIsValidating(false);
    }, 1500);
  };
  
  const handleScanQR = () => {
    // In a real app, this would open the camera for QR scanning
    // For this demo, we'll just set a mock booking number
    setBookingNumber('1234567');
  };
  
  const handleViewBooking = () => {
    if (validationResult?.booking) {
      router.push(`/booking-details/${validationResult.booking.id}`);
    }
  };
  
  const handleClear = () => {
    setBookingNumber('');
    setValidationResult(null);
  };
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Validate Ticket</Text>
      <Text style={styles.subtitle}>
        Enter booking number or scan QR code to validate a ticket
      </Text>
      
      <Card variant="elevated" style={styles.inputCard}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter booking number"
            value={bookingNumber}
            onChangeText={setBookingNumber}
            keyboardType="numeric"
            maxLength={7}
            autoCapitalize="none"
          />
          {bookingNumber ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClear}
            >
              <XCircle size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Validate"
            onPress={handleValidate}
            loading={isValidating}
            disabled={!bookingNumber.trim() || isValidating}
            style={styles.validateButton}
          />
          
          <Button
            title="Scan QR"
            onPress={handleScanQR}
            variant="outline"
            style={styles.scanButton}
          />
        </View>
      </Card>
      
      {validationResult && (
        <Card 
          variant="elevated" 
          style={[
            styles.resultCard,
            validationResult.isValid ? styles.validCard : styles.invalidCard
          ]}
        >
          <View style={styles.resultHeader}>
            {validationResult.isValid ? (
              <CheckCircle size={24} color={Colors.success} style={styles.resultIcon} />
            ) : (
              <XCircle size={24} color={Colors.error} style={styles.resultIcon} />
            )}
            <Text 
              style={[
                styles.resultMessage,
                validationResult.isValid ? styles.validMessage : styles.invalidMessage
              ]}
            >
              {validationResult.message}
            </Text>
          </View>
          
          {validationResult.booking && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.bookingSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Booking #:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.bookingNumber}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Route:</Text>
                  <Text style={styles.summaryValue}>
                    {validationResult.booking.route.fromIsland.name} → {validationResult.booking.route.toIsland.name}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date:</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(validationResult.booking.departureDate).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Time:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.departureTime}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Passengers:</Text>
                  <Text style={styles.summaryValue}>{validationResult.booking.passengers.length}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Seats:</Text>
                  <Text style={styles.summaryValue}>
                    {validationResult.booking.seats.map(seat => seat.number).join(', ')}
                  </Text>
                </View>
              </View>
              
              <Button
                title="View Full Ticket"
                onPress={handleViewBooking}
                variant="outline"
                style={styles.viewButton}
              />
            </>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputCard: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: Colors.text,
  },
  clearButton: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  validateButton: {
    flex: 1,
    marginRight: 8,
  },
  scanButton: {
    flex: 1,
    marginLeft: 8,
  },
  resultCard: {
    marginBottom: 16,
  },
  validCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  invalidCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultMessage: {
    fontSize: 16,
    fontWeight: '600',
  },
  validMessage: {
    color: Colors.success,
  },
  invalidMessage: {
    color: Colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
  },
  bookingSummary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  summaryLabel: {
    width: 100,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  viewButton: {
    alignSelf: 'flex-start',
  },
});