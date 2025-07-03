import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    TextInput as RNTextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Calendar, ArrowRight, User, DollarSign } from 'lucide-react-native';
import { useAgentStore } from '@/store/agent/agentStore';
import { useRouteStore, useTripStore } from '@/store/routeStore';
import { useSeatStore } from '@/store/seatStore';
import { supabase } from '@/utils/supabase';
import { Seat } from '@/types';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';

export default function AgentModifyBookingScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // Enhanced keyboard handling
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const inputRefs = useRef({
        reason: null as any,
        agentNotes: null as any,
    });

    // Store management
    const {
        bookings,
        modifyBooking,
        isLoading: agentLoading,
        getTranslation
    } = useAgentStore();

    const {
        availableRoutes,
        isLoading: routeLoading
    } = useRouteStore();

    const {
        trips,
        returnTrips,
        fetchTrips,
        isLoading: tripLoading
    } = useTripStore();

    const {
        availableSeats,
        availableReturnSeats,
        fetchAvailableSeats,
        isLoading: seatLoading
    } = useSeatStore();

    // Combined loading state
    const isLoading = agentLoading || routeLoading || tripLoading || seatLoading;

    // State management
    const [tripSeatCounts, setTripSeatCounts] = useState<Record<string, number>>({});
    const [newDepartureDate, setNewDepartureDate] = useState<string | null>(null);
    const [newReturnDate, setNewReturnDate] = useState<string | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [returnSelectedSeats, setReturnSelectedSeats] = useState<Seat[]>([]);
    const [modificationReason, setModificationReason] = useState('');
    const [agentNotes, setAgentNotes] = useState('');
    const [fareDifference, setFareDifference] = useState(0);
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const [selectedReturnTrip, setSelectedReturnTrip] = useState<any>(null);
    const [errors, setErrors] = useState({
        departureDate: '',
        returnDate: '',
        seats: '',
        reason: '',
        trip: '',
    });

    // Enhanced keyboard event listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                if (activeInput) {
                    scrollToInput(activeInput);
                }
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
                setActiveInput(null);
            }
        );

        return () => {
            keyboardDidShowListener?.remove();
            keyboardDidHideListener?.remove();
        };
    }, [activeInput]);

    const scrollToInput = (inputKey: string) => {
        setTimeout(() => {
            const inputRef = inputRefs.current[inputKey as keyof typeof inputRefs.current];
            if (inputRef && scrollViewRef.current) {
                inputRef.measureLayout(
                    scrollViewRef.current,
                    (x: number, y: number) => {
                        const scrollOffset = y - 100;
                        scrollViewRef.current?.scrollTo({
                            x: 0,
                            y: Math.max(0, scrollOffset),
                            animated: true,
                        });
                    },
                    () => { }
                );
            }
        }, 100);
    };

    // Find the booking by id
    const booking = bookings.find((b: any) => b.id === id);

    useEffect(() => {
        if (booking) {
            setNewDepartureDate(booking.departureDate);
            setNewReturnDate(booking.returnDate || null);
            setSelectedSeats(booking.seats?.map((seat: any) => ({
                ...seat,
                isAvailable: true
            })) || []);
            setReturnSelectedSeats([]);

            // Calculate fare difference (simplified for demo)
            const randomDiff = Math.floor(Math.random() * 100) - 50;
            setFareDifference(randomDiff);
        }
    }, [booking]);

    // Function to fetch actual seat availability for a trip
    const fetchTripSeatAvailability = async (tripId: string) => {
        try {
            const { data: seatReservations, error } = await supabase
                .from('seat_reservations')
                .select('is_available, booking_id')
                .eq('trip_id', tripId);

            if (error) {
                console.error('Error fetching seat availability:', error);
                return 0;
            }

            const availableCount = seatReservations?.filter(
                reservation => reservation.is_available && !reservation.booking_id
            ).length || 0;

            return availableCount;
        } catch (error) {
            console.error('Error in fetchTripSeatAvailability:', error);
            return 0;
        }
    };

    // Fetch trips when date or route changes
    useEffect(() => {
        if (booking?.route && newDepartureDate) {
            fetchTrips(booking.route.id, newDepartureDate, false);
        }
    }, [booking?.route, newDepartureDate, fetchTrips]);

    // Fetch return trips when return date changes
    useEffect(() => {
        if (booking?.tripType === 'round_trip' && booking?.route && newReturnDate) {
            fetchTrips(booking.route.id, newReturnDate, true);
        }
    }, [booking?.route, booking?.tripType, newReturnDate, fetchTrips]);

    // Fetch seats when departure trip is selected
    useEffect(() => {
        if (selectedTrip) {
            fetchAvailableSeats(selectedTrip.id, false);
        }
    }, [selectedTrip, fetchAvailableSeats]);

    // Fetch return seats when return trip is selected
    useEffect(() => {
        if (selectedReturnTrip) {
            fetchAvailableSeats(selectedReturnTrip.id, true);
        }
    }, [selectedReturnTrip, fetchAvailableSeats]);

    // Fetch seat availability for all trips when trips are loaded
    useEffect(() => {
        const updateTripSeatCounts = async () => {
            if (trips.length > 0) {
                const newCounts: Record<string, number> = {};

                for (const trip of trips) {
                    const count = await fetchTripSeatAvailability(trip.id);
                    newCounts[trip.id] = count;
                }

                setTripSeatCounts(newCounts);
            }
        };

        updateTripSeatCounts();
    }, [trips]);

    const toggleSeatSelection = (seat: Seat, isReturn = false) => {
        if (!booking) return;

        const maxSeats = booking.passengers?.length || booking.passengerCount || 1;

        if (isReturn) {
            setReturnSelectedSeats(prev => {
                const isSelected = prev.some(s => s.id === seat.id);
                if (isSelected) {
                    return prev.filter(s => s.id !== seat.id);
                } else {
                    if (prev.length < maxSeats) {
                        return [...prev, seat];
                    }
                    return prev;
                }
            });
        } else {
            setSelectedSeats(prev => {
                const isSelected = prev.some(s => s.id === seat.id);
                if (isSelected) {
                    return prev.filter(s => s.id !== seat.id);
                } else {
                    if (prev.length < maxSeats) {
                        return [...prev, seat];
                    }
                    return prev;
                }
            });
        }
    };

    const validateForm = () => {
        if (!booking) return false;

        let isValid = true;
        const newErrors = { ...errors };

        // Check if at least modification reason is provided
        if (!modificationReason.trim()) {
            newErrors.reason = 'Please provide a reason for modification';
            isValid = false;
        }

        // If date is changed, we need a trip selected
        const isDateChanged = newDepartureDate && newDepartureDate !== booking.departureDate;
        if (isDateChanged && !selectedTrip) {
            newErrors.trip = 'Please select a departure trip for the new date';
            isValid = false;
        }

        // If return date is changed for round trip, we need return trip selected
        const isReturnDateChanged = booking.tripType === 'round_trip' && newReturnDate && newReturnDate !== booking.returnDate;
        if (isReturnDateChanged && !selectedReturnTrip) {
            newErrors.trip = 'Please select a return trip for the new date';
            isValid = false;
        }

        const maxSeats = booking.passengers?.length || booking.passengerCount || 1;

        // Only validate seat selection if trip is selected (date changed)
        if (selectedTrip && selectedSeats.length !== maxSeats) {
            newErrors.seats = `Please select ${maxSeats} seat(s) for departure`;
            isValid = false;
        }

        if (selectedReturnTrip && returnSelectedSeats.length !== maxSeats) {
            newErrors.seats = `Please select ${maxSeats} seat(s) for return trip`;
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const formatCurrency = (amount: number) => {
        return `MVR ${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const handleModify = async () => {
        if (!validateForm() || !booking) {
            return;
        }

        try {
            // Use the same data structure as customer modification
            const modificationData = {
                newTripId: selectedTrip?.id,
                newReturnTripId: selectedReturnTrip?.id,
                newDepartureDate,
                newReturnDate,
                selectedSeats,
                returnSelectedSeats,
                modificationReason,
                fareDifference,
                // Additional agent-specific fields
                agentNotes,
                modifiedByAgent: true,
            };

            const result = await modifyBooking(booking.id, modificationData);

            console.log('Booking modification result:', result);

            let successMessage = `Booking has been modified successfully with QR codes generated.`;
            
            if (result && typeof result === 'object') {
                successMessage += `\n\nNew Booking ID: ${result.bookingId}`;
                if (result.returnBookingId) {
                    successMessage += `\nReturn Booking ID: ${result.returnBookingId}`;
                }
            }

            if (fareDifference > 0) {
                successMessage += `\n\nAdditional charge: ${formatCurrency(fareDifference)}`;
            } else if (fareDifference < 0) {
                successMessage += `\n\nRefund amount: ${formatCurrency(Math.abs(fareDifference))}`;
            } else {
                successMessage += `\n\nNo fare difference.`;
            }

            Alert.alert(
                "Booking Modified",
                successMessage,
                [
                    {
                        text: "OK",
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            Alert.alert("Error", `Failed to modify booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

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

    const maxSeats = booking.passengers?.length || booking.passengerCount || 1;

    return (
        <>
            <Stack.Screen
                options={{
                    title: "Modify Booking",
                    headerTitleStyle: { fontSize: 18 },
                }}
            />
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
                enabled
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.container}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Current Booking Details */}
                    <Card variant="elevated" style={styles.bookingCard}>
                        <Text style={styles.cardTitle}>Current Booking Details</Text>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Booking Number:</Text>
                            <Text style={styles.detailValue}>{booking.bookingNumber}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Client:</Text>
                            <Text style={styles.detailValue}>{booking.clientName}</Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Route:</Text>
                            <Text style={styles.detailValue}>
                                {booking.route?.fromIsland?.name || booking.origin} → {booking.route?.toIsland?.name || booking.destination}
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
                                {booking.seats?.map((seat: any) => seat.number).join(', ') || 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Original Amount:</Text>
                            <Text style={styles.detailValue}>{formatCurrency(booking.totalAmount)}</Text>
                        </View>
                    </Card>

                    {/* Modification Form */}
                    <Card variant="elevated" style={styles.modifyCard}>
                        <Text style={styles.cardTitle}>Modify Booking Details</Text>

                        <DatePicker
                            label="New Departure Date"
                            value={newDepartureDate}
                            onChange={(date) => {
                                setNewDepartureDate(date);
                                setSelectedTrip(null);
                                setSelectedSeats([]);
                                if (errors.departureDate) setErrors({ ...errors, departureDate: '' });
                            }}
                            minDate={new Date().toISOString().split('T')[0]}
                            error={errors.departureDate}
                            required
                        />

                        {/* Departure Trip Selection */}
                        {trips.length > 0 && (
                            <View style={styles.tripSelection}>
                                <Text style={styles.sectionTitle}>Select New Departure Trip</Text>
                                {trips.map((trip) => (
                                    <TouchableOpacity
                                        key={trip.id}
                                        style={[
                                            styles.tripOption,
                                            selectedTrip?.id === trip.id && styles.tripOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedTrip(trip);
                                            setSelectedSeats([]);
                                            if (errors.trip) setErrors({ ...errors, trip: '' });
                                        }}
                                    >
                                        <Text style={styles.tripTime}>{trip.departure_time}</Text>
                                        <Text style={styles.tripVessel}>{trip.vessel_name}</Text>
                                        <Text style={styles.tripSeats}>
                                            {tripSeatCounts[trip.id] !== undefined ? tripSeatCounts[trip.id] : '...'} seats available
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {errors.trip ? (
                                    <Text style={styles.errorText}>{errors.trip}</Text>
                                ) : null}
                            </View>
                        )}

                        {/* Departure Seat Selection */}
                        <Text style={styles.seatSectionTitle}>
                            Select New Departure Seats ({selectedSeats.length}/{maxSeats})
                        </Text>
                        {!selectedTrip ? (
                            <Text style={styles.noSeatsText}>Please select a departure trip first</Text>
                        ) : isLoading ? (
                            <Text style={styles.loadingText}>Loading available seats...</Text>
                        ) : availableSeats.length > 0 ? (
                            <SeatSelector
                                seats={availableSeats}
                                selectedSeats={selectedSeats}
                                onSeatToggle={(seat) => toggleSeatSelection(seat, false)}
                                maxSeats={maxSeats}
                            />
                        ) : (
                            <Text style={styles.noSeatsText}>No seats available for this trip</Text>
                        )}

                        {/* Return Trip Date Selection */}
                        {booking.tripType === 'round_trip' && (
                            <DatePicker
                                label="New Return Date"
                                value={newReturnDate}
                                onChange={(date) => {
                                    setNewReturnDate(date);
                                    setSelectedReturnTrip(null);
                                    setReturnSelectedSeats([]);
                                    if (errors.returnDate) setErrors({ ...errors, returnDate: '' });
                                }}
                                minDate={newDepartureDate || new Date().toISOString().split('T')[0]}
                                error={errors.returnDate}
                                required
                            />
                        )}

                        {/* Return Trip Selection */}
                        {booking.tripType === 'round_trip' && returnTrips.length > 0 && (
                            <View style={styles.tripSelection}>
                                <Text style={styles.sectionTitle}>Select New Return Trip</Text>
                                {returnTrips.map((trip) => (
                                    <TouchableOpacity
                                        key={trip.id}
                                        style={[
                                            styles.tripOption,
                                            selectedReturnTrip?.id === trip.id && styles.tripOptionSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedReturnTrip(trip);
                                            setReturnSelectedSeats([]);
                                        }}
                                    >
                                        <Text style={styles.tripTime}>{trip.departure_time}</Text>
                                        <Text style={styles.tripVessel}>{trip.vessel_name}</Text>
                                        <Text style={styles.tripSeats}>
                                            {tripSeatCounts[trip.id] !== undefined ? tripSeatCounts[trip.id] : '...'} seats available
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Return Seat Selection */}
                        {booking.tripType === 'round_trip' && (
                            <>
                                <Text style={styles.seatSectionTitle}>
                                    Select New Return Seats ({returnSelectedSeats.length}/{maxSeats})
                                </Text>
                                {!selectedReturnTrip ? (
                                    <Text style={styles.noSeatsText}>Please select a return trip first</Text>
                                ) : isLoading ? (
                                    <Text style={styles.loadingText}>Loading available return seats...</Text>
                                ) : availableReturnSeats.length > 0 ? (
                                    <SeatSelector
                                        seats={availableReturnSeats}
                                        selectedSeats={returnSelectedSeats}
                                        onSeatToggle={(seat) => toggleSeatSelection(seat, true)}
                                        maxSeats={maxSeats}
                                    />
                                ) : (
                                    <Text style={styles.noSeatsText}>No return seats available for this trip</Text>
                                )}
                            </>
                        )}

                        {errors.seats ? (
                            <Text style={styles.errorText}>{errors.seats}</Text>
                        ) : null}

                        {/* Fare Difference Display */}
                        {fareDifference !== 0 && (
                            <Card variant="elevated" style={styles.fareCard}>
                                <View style={styles.fareHeader}>
                                    <DollarSign size={20} color={fareDifference > 0 ? Colors.error : Colors.success} />
                                    <Text style={styles.fareTitle}>Fare Adjustment</Text>
                                </View>
                                <Text style={[
                                    styles.fareAmount,
                                    { color: fareDifference > 0 ? Colors.error : Colors.success }
                                ]}>
                                    {fareDifference > 0 ? '+' : ''}{formatCurrency(fareDifference)}
                                </Text>
                                <Text style={styles.fareDescription}>
                                    {fareDifference > 0
                                        ? 'Additional payment required from client'
                                        : 'Refund amount to be processed'
                                    }
                                </Text>
                            </Card>
                        )}

                        {/* Modification Reason */}
                        <View
                            ref={(el) => {
                                inputRefs.current.reason = el;
                            }}
                            style={styles.reasonContainer}
                        >
                            <Text style={styles.reasonLabel}>Reason for Modification *</Text>
                            <View style={styles.reasonInput}>
                                <RNTextInput
                                    style={styles.reasonTextInput}
                                    placeholder="Please provide a reason for modifying this booking"
                                    value={modificationReason}
                                    onChangeText={(text: string) => {
                                        setModificationReason(text);
                                        if (errors.reason) setErrors({ ...errors, reason: '' });
                                    }}
                                    onFocus={() => {
                                        setActiveInput('reason');
                                        scrollToInput('reason');
                                    }}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />
                            </View>
                            {errors.reason ? (
                                <Text style={styles.errorText}>{errors.reason}</Text>
                            ) : null}
                        </View>

                        {/* Agent Notes */}
                        <View
                            ref={(el) => {
                                inputRefs.current.agentNotes = el;
                            }}
                            style={styles.reasonContainer}
                        >
                            <Text style={styles.reasonLabel}>Agent Notes (Optional)</Text>
                            <View style={styles.reasonInput}>
                                <RNTextInput
                                    style={styles.reasonTextInput}
                                    placeholder="Add any internal notes about this modification"
                                    value={agentNotes}
                                    onChangeText={setAgentNotes}
                                    onFocus={() => {
                                        setActiveInput('agentNotes');
                                        scrollToInput('agentNotes');
                                    }}
                                    multiline
                                    numberOfLines={2}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </Card>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <Button
                            title="Cancel"
                            onPress={() => router.back()}
                            variant="outline"
                            style={styles.backButton}
                        />

                        <Button
                            title="Modify Booking"
                            onPress={handleModify}
                            loading={isLoading}
                            disabled={isLoading}
                            style={styles.modifyButton}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32,
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
    bookingCard: {
        marginBottom: 16,
    },
    modifyCard: {
        marginBottom: 24,
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
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        flex: 1,
        textAlign: 'right',
    },
    tripSelection: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    tripOption: {
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: Colors.background,
    },
    tripOptionSelected: {
        borderColor: Colors.primary,
        backgroundColor: '#f0f8ff',
    },
    tripTime: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    tripVessel: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    tripSeats: {
        fontSize: 12,
        color: Colors.primary,
        marginTop: 2,
    },
    seatSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
        marginTop: 16,
    },
    noSeatsText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        padding: 20,
        fontStyle: 'italic',
    },
    loadingText: {
        fontSize: 14,
        color: Colors.primary,
        textAlign: 'center',
        padding: 20,
    },
    fareCard: {
        marginVertical: 16,
        padding: 16,
    },
    fareHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    fareTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 8,
    },
    fareAmount: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    fareDescription: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    reasonContainer: {
        marginBottom: 16,
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
        backgroundColor: Colors.background,
    },
    reasonTextInput: {
        padding: 12,
        fontSize: 16,
        color: Colors.text,
        minHeight: 80,
    },
    errorText: {
        fontSize: 14,
        color: Colors.error,
        marginTop: 4,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    backButton: {
        flex: 1,
        marginRight: 8,
    },
    modifyButton: {
        flex: 1,
        marginLeft: 8,
    },
}); 