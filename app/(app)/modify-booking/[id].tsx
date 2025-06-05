import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TextInputProps,
  ViewStyle,
  TextStyle
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Calendar, ArrowRight } from 'lucide-react-native';
import { useBookingStore } from '@/store/bookingStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';

// Define interface for seat object
interface Seat {
  id: string;
  number: string;
  isAvailable: boolean;
  isSelected?: boolean;
}

// Define interface for custom TextInput props
interface CustomTextInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle | TextStyle;
}

// Mock seat data
const generateMockSeats = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seatsPerRow = 6;
  const seats: Seat[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    for (let j = 1; j <= seatsPerRow; j++) {
      const seatNumber = `${rows[i]}${j}`;
      seats.push({
        id: seatNumber,
        number: seatNumber,
        isAvailable: Math.random() > 0.3, // 70% of seats are available
      });
    }
  }
  
  return seats;
};

export default function ModifyBookingScreen() {
  const { id } = useLocalSearchParams();
  const { bookings, isLoading } = useBookingStore();
  
  const [mockSeats] = useState<Seat[]>(generateMockSeats());
  const [newDepartureDate, setNewDepartureDate] = useState<string | null>(null);
  const [newReturnDate, setNewReturnDate] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [returnSelectedSeats, setReturnSelectedSeats] = useState<Seat[]>([]);
  const [modificationReason, setModificationReason] = useState('');
  const [fareDifference, setFareDifference] = useState(0);
  const [errors, setErrors] = useState({
    departureDate: '',
    returnDate: '',
    seats: '',
    reason: '',
  });
  
  // Find the booking by id
  const booking = bookings.find(b => b.id === id);
  
  useEffect(() => {
    if (booking) {
      setNewDepartureDate(booking.departureDate);
      setNewReturnDate(booking.returnDate || null);
      setSelectedSeats(booking.seats);
      setReturnSelectedSeats(booking.returnSeats || []);
      
      // Calculate a random fare difference for demo purposes
      const randomDiff = Math.floor(Math.random() * 40) - 20; // Between -20 and 20
      setFareDifference(randomDiff);
    }
  }, [booking]);
  
  if (!booking) {
    return (
      <View style={styles.notFoundContainer}>
        <Text style={styles.notFoundText}>Booking not found</Text>
        <Button 
          title="Go Back" 
          onPress={() => router.back()} 
          style={styles.notFoundButton}
        />
      </View>
    );
  }
  
  const toggleSeatSelection = (seat: Seat, isReturn = false) => {
    if (isReturn) {
      const isSelected = returnSelectedSeats.some(s => s.id === seat.id);
      if (isSelected) {
        setReturnSelectedSeats(returnSelectedSeats.filter(s => s.id !== seat.id));
      } else {
        setReturnSelectedSeats([...returnSelectedSeats, { ...seat, isSelected: true }]);
      }
    } else {
      const isSelected = selectedSeats.some(s => s.id === seat.id);
      if (isSelected) {
        setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
      } else {
        setSelectedSeats([...selectedSeats, { ...seat, isSelected: true }]);
      }
    }
    
    if (errors.seats) {
      setErrors({ ...errors, seats: '' });
    }
  };
  
  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };
    
    if (!newDepartureDate) {
      newErrors.departureDate = 'Please select a departure date';
      isValid = false;
    }
    
    if (booking.tripType === 'round_trip' && !newReturnDate) {
      newErrors.returnDate = 'Please select a return date';
      isValid = false;
    }
    
    if (selectedSeats.length === 0) {
      newErrors.seats = 'Please select at least one seat';
      isValid = false;
    }
    
    if (booking.tripType === 'round_trip' && returnSelectedSeats.length === 0) {
      newErrors.seats = 'Please select at least one return seat';
      isValid = false;
    }
    
    if (booking.tripType === 'round_trip' && 
        selectedSeats.length !== returnSelectedSeats.length) {
      newErrors.seats = 'Number of departure and return seats must match';
      isValid = false;
    }
    
    if (!modificationReason.trim()) {
      newErrors.reason = 'Please provide a reason for modification';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleModify = () => {
    if (!validateForm()) {
      return;
    }
    
    // In a real app, this would call an API to modify the booking
    Alert.alert(
      "Booking Modified",
      `Your booking has been modified successfully. ${
        fareDifference > 0 
          ? `An additional payment of MVR ${fareDifference.toFixed(2)} is required.` 
          : fareDifference < 0 
            ? `A refund of MVR ${Math.abs(fareDifference).toFixed(2)} will be processed.` 
            : "No fare difference to process."
      }`,
      [
        { 
          text: "OK", 
          onPress: () => router.replace('/bookings') 
        }
      ]
    );
  };
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Card variant="elevated" style={styles.bookingCard}>
        <Text style={styles.cardTitle}>Current Booking</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Booking Number:</Text>
          <Text style={styles.detailValue}>{booking.bookingNumber}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Route:</Text>
          <Text style={styles.detailValue}>
            {booking.route.fromIsland.name} → {booking.route.toIsland.name}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Date:</Text>
          <Text style={styles.detailValue}>
            {new Date(booking.departureDate).toLocaleDateString()}
          </Text>
        </View>
        
        {booking.tripType === 'round_trip' && booking.returnDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Return Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.returnDate).toLocaleDateString()}
            </Text>
          </View>
        )}
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current Seats:</Text>
          <Text style={styles.detailValue}>
            {booking.seats.map(seat => seat.number).join(', ')}
          </Text>
        </View>
        
        {booking.tripType === 'round_trip' && booking.returnSeats && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Return Seats:</Text>
            <Text style={styles.detailValue}>
              {booking.returnSeats.map(seat => seat.number).join(', ')}
            </Text>
          </View>
        )}
      </Card>
      
      <Card variant="elevated" style={styles.modifyCard}>
        <Text style={styles.cardTitle}>Modify Booking</Text>
        
        <DatePicker
          label="New Departure Date"
          value={newDepartureDate}
          onChange={(date) => {
            setNewDepartureDate(date);
            if (errors.departureDate) setErrors({ ...errors, departureDate: '' });
          }}
          minDate={new Date().toISOString().split('T')[0]}
          error={errors.departureDate}
          required
        />
        
        {booking.tripType === 'round_trip' && (
          <DatePicker
            label="New Return Date"
            value={newReturnDate}
            onChange={(date) => {
              setNewReturnDate(date);
              if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
            }}
            minDate={newDepartureDate || new Date().toISOString().split('T')[0]}
            error={errors.returnDate}
            required
          />
        )}
        
        <Text style={styles.seatSectionTitle}>Select New Departure Seats</Text>
        <SeatSelector
          seats={mockSeats}
          selectedSeats={selectedSeats}
          onSeatToggle={(seat) => toggleSeatSelection(seat)}
          maxSeats={booking.passengers.length}
        />
        
        {booking.tripType === 'round_trip' && (
          <>
            <Text style={styles.seatSectionTitle}>Select New Return Seats</Text>
            <SeatSelector
              seats={mockSeats}
              selectedSeats={returnSelectedSeats}
              onSeatToggle={(seat) => toggleSeatSelection(seat, true)}
              maxSeats={booking.passengers.length}
            />
          </>
        )}
        
        {errors.seats ? (
          <Text style={styles.errorText}>{errors.seats}</Text>
        ) : null}
        
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Reason for Modification</Text>
          <View style={styles.reasonInput}>
            <TextInput
              placeholder="Please provide a reason for modifying your booking"
              value={modificationReason}
              onChangeText={(text: string) => {
                setModificationReason(text);
                if (errors.reason) setErrors({ ...errors, reason: '' });
              }}
              multiline
              numberOfLines={3}
              style={styles.reasonTextInput}
            />
          </View>
          {errors.reason ? (
            <Text style={styles.errorText}>{errors.reason}</Text>
          ) : null}
        </View>
        
        <View style={styles.fareDifferenceContainer}>
          <Text style={styles.fareDifferenceTitle}>Fare Difference</Text>
          
          <View style={styles.fareRow}>
            <View style={styles.fareColumn}>
              <Text style={styles.fareLabel}>Original Fare</Text>
              <Text style={styles.fareValue}>MVR {booking.totalFare.toFixed(2)}</Text>
            </View>
            
            <ArrowRight size={20} color={Colors.textSecondary} />
            
            <View style={styles.fareColumn}>
              <Text style={styles.fareLabel}>New Fare</Text>
              <Text style={styles.fareValue}>
                MVR {(booking.totalFare + fareDifference).toFixed(2)}
              </Text>
            </View>
          </View>
          
          <View style={styles.differenceRow}>
            <Text style={styles.differenceLabel}>Difference:</Text>
            <Text 
              style={[
                styles.differenceValue,
                fareDifference > 0 ? styles.additionalPayment : styles.refundAmount
              ]}
            >
              {fareDifference > 0 ? '+' : ''}{fareDifference.toFixed(2)} MVR
            </Text>
          </View>
          
          <Text style={styles.differenceNote}>
            {fareDifference > 0 
              ? "Additional payment required" 
              : fareDifference < 0 
                ? "Refund will be processed to your original payment method" 
                : "No additional payment or refund required"}
          </Text>
        </View>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="outline"
          style={styles.cancelButton}
        />
        
        <Button
          title="Confirm Changes"
          onPress={handleModify}
          loading={isLoading}
          disabled={isLoading}
          style={styles.confirmButton}
        />
      </View>
    </ScrollView>
  );
}

// TextInput component for the reason field
const TextInput = ({ 
  placeholder, 
  value, 
  onChangeText, 
  multiline, 
  numberOfLines,
  style
}: CustomTextInputProps) => {
  return (
    <View style={[styles.textInputContainer, style]}>
      <Text
        style={[
          styles.textInput,
          multiline && { height: numberOfLines ? numberOfLines * 20 : 60 },
          !value && styles.placeholder
        ]}
        onPress={() => {}}
      >
        {value || placeholder}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  bookingCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  modifyCard: {
    marginBottom: 24,
  },
  seatSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  reasonContainer: {
    marginTop: 16,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  reasonTextInput: {
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  textInputContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
  },
  textInput: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textSecondary,
  },
  fareDifferenceContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  fareDifferenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fareColumn: {
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fareValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  differenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: 8,
  },
  differenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  differenceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  additionalPayment: {
    color: Colors.error,
  },
  refundAmount: {
    color: Colors.success,
  },
  differenceNote: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 4,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.text,
    marginBottom: 20,
  },
  notFoundButton: {
    minWidth: 120,
  },
});