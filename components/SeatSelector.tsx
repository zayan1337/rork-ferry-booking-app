import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Dimensions
} from 'react-native';
import { Seat } from '@/types';
import Colors from '@/constants/colors';

type SeatSelectorProps = {
  seats: Seat[];
  selectedSeats: Seat[];
  onSeatToggle: (seat: Seat) => void;
  maxSeats?: number;
};

const SeatSelector: React.FC<SeatSelectorProps> = ({
  seats,
  selectedSeats,
  onSeatToggle,
  maxSeats = 10,
}) => {
  // Group seats by row (assuming seat numbers like A1, A2, B1, B2, etc.)
  const groupedSeats: Record<string, Seat[]> = {};
  
  seats.forEach(seat => {
    const row = seat.number.charAt(0);
    if (!groupedSeats[row]) {
      groupedSeats[row] = [];
    }
    groupedSeats[row].push(seat);
  });
  
  // Sort rows alphabetically
  const sortedRows = Object.keys(groupedSeats).sort();
  
  // Check if a seat is selected
  const isSeatSelected = (seatId: string) => {
    return selectedSeats.some(seat => seat.id === seatId);
  };
  
  // Check if max seats are selected
  const isMaxSeatsSelected = selectedSeats.length >= maxSeats;
  
  // Handle seat selection
  const handleSeatPress = (seat: Seat) => {
    if (!seat.isAvailable) return;
    
    const isSelected = isSeatSelected(seat.id);
    
    // If not selected and max seats are already selected, don't allow selection
    if (!isSelected && isMaxSeatsSelected) return;
    
    onSeatToggle(seat);
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.availableSeat]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.selectedSeat]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.unavailableSeat]} />
          <Text style={styles.legendText}>Unavailable</Text>
        </View>
      </View>
      
      <View style={styles.cabinContainer}>
        <View style={styles.frontLabel}>
          <Text style={styles.frontLabelText}>FRONT</Text>
        </View>
        
        <ScrollView style={styles.seatMapContainer}>
          {sortedRows.map(row => (
            <View key={row} style={styles.row}>
              <Text style={styles.rowLabel}>{row}</Text>
              <View style={styles.seats}>
                {groupedSeats[row].map(seat => {
                  const isSelected = isSeatSelected(seat.id);
                  return (
                    <TouchableOpacity
                      key={seat.id}
                      style={[
                        styles.seat,
                        seat.isAvailable ? styles.availableSeat : styles.unavailableSeat,
                        isSelected && styles.selectedSeat,
                        !seat.isAvailable && styles.unavailableSeat,
                      ]}
                      onPress={() => handleSeatPress(seat)}
                      disabled={!seat.isAvailable}
                    >
                      <Text 
                        style={[
                          styles.seatNumber,
                          isSelected && styles.selectedSeatNumber,
                          !seat.isAvailable && styles.unavailableSeatNumber,
                        ]}
                      >
                        {seat.number}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        
        <View style={styles.rearLabel}>
          <Text style={styles.rearLabelText}>REAR</Text>
        </View>
      </View>
      
      <View style={styles.selectionInfo}>
        <Text style={styles.selectionText}>
          Selected: {selectedSeats.length}/{maxSeats} seats
        </Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const seatSize = Math.min(40, (width - 80) / 8); // Adjust based on screen width

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: Colors.text,
  },
  cabinContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    backgroundColor: Colors.card,
  },
  frontLabel: {
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  frontLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  seatMapContainer: {
    maxHeight: 300,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rowLabel: {
    width: 20,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  seats: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  seat: {
    width: seatSize,
    height: seatSize,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  availableSeat: {
    backgroundColor: Colors.card,
    borderColor: Colors.primary,
  },
  selectedSeat: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unavailableSeat: {
    backgroundColor: Colors.inactive,
    borderColor: Colors.inactive,
  },
  seatNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedSeatNumber: {
    color: Colors.card,
  },
  unavailableSeatNumber: {
    color: Colors.textSecondary,
  },
  rearLabel: {
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  rearLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  selectionInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
});

export default SeatSelector;