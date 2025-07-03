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
import type { PaymentMethod, BankDetails } from '@/types/pages/booking';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DatePicker from '@/components/DatePicker';
import SeatSelector from '@/components/SeatSelector';
import Input from '@/components/Input';
import { calculateFareDifference } from '@/utils/paymentUtils';
import { calculateDiscountedFare } from '@/utils/bookingUtils';

export default function AgentModifyBookingScreen() {
    const { id, ticketType } = useLocalSearchParams();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // Enhanced keyboard handling
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const inputRefs = useRef({
        reason: null as any,
        agentNotes: null as any,
        accountNumber: null as any,
        accountName: null as any,
        bankName: null as any,
    });

    // Store management
    const {
        bookings,
        modifyBooking,
        isLoading: agentLoading,
        getTranslation,
        agent
    } = useAgentStore();

    const {
        availableRoutes,
        isLoading: routeLoading
    } = useRouteStore();

    const {
        trips,
        fetchTrips,
        isLoading: tripLoading
    } = useTripStore();

    const {
        availableSeats,
        fetchAvailableSeats,
        isLoading: seatLoading
    } = useSeatStore();

    // Separate loading states for better control
    const isDataLoading = agentLoading && bookings.length === 0;
    const isTripsLoading = tripLoading;
    const isSeatsLoading = seatLoading;

    // Determine which ticket is being modified
    const isModifyingReturn = ticketType === 'return';
    const ticketLabel = isModifyingReturn ? 'Return' : 'Departure';

    // State management (simplified to handle one ticket at a time)
    const [tripSeatCounts, setTripSeatCounts] = useState<Record<string, number>>({});
    const [newDate, setNewDate] = useState<string | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [modificationReason, setModificationReason] = useState('');
    const [agentNotes, setAgentNotes] = useState('');
    const [fareDifference, setFareDifference] = useState(0);
    const [selectedTrip, setSelectedTrip] = useState<any>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | 'agent_credit'>('wallet');
    const [bankAccountDetails, setBankAccountDetails] = useState<BankDetails>({
        accountNumber: '',
        accountName: '',
        bankName: '',
    });
    const [isModifying, setIsModifying] = useState(false);
    const [agentDiscountRate, setAgentDiscountRate] = useState(0);
    const [discountedFare, setDiscountedFare] = useState(0);
    const [errors, setErrors] = useState({
        date: '',
        seats: '',
        reason: '',
        trip: '',
        accountNumber: '',
        accountName: '',
        bankName: '',
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
                        });
                    },
                    () => { }
                );
            }
        }, 100);
    };

    // Find the booking by id
    const booking = bookings.find((b: any) => b.id === id);

    // Ensure bookings are loaded when component mounts
    useEffect(() => {
        if (!booking && !agentLoading) {
            // If booking not found and not loading, it might need to be fetched
            // This depends on your store implementation
        }
    }, [booking, agentLoading]);

    useEffect(() => {
        if (booking) {
            // Initialize form data based on which ticket is being modified
            const currentDate = isModifyingReturn ? booking.returnDate : booking.departureDate;
            const currentSeats = booking.seats; // Use booking.seats for both departure and return

            setNewDate(currentDate || null);
            setSelectedSeats(currentSeats?.map((seat: any) => ({
                ...seat,
                isAvailable: true
            })) || []);

            // Set default payment method to agent credit for agents
            setSelectedPaymentMethod('agent_credit');
        }
    }, [booking, isModifyingReturn]);

    // Initialize agent discount rate
    useEffect(() => {
        if (agent?.discountRate) {
            setAgentDiscountRate(Number(agent.discountRate) || 0);
        }
    }, [agent]);

    // Calculate fare difference when trip changes
    useEffect(() => {
        if (selectedTrip && booking && booking.route) {
            // Get current paid amount (use discounted amount if available, otherwise total amount)
            const currentPaidFare = Number(booking.discountedAmount) || Number(booking.totalAmount) || 0;

            // Calculate new fare based on selected trip and route
            const passengerCount = booking.passengers?.length || booking.passengerCount || 1;
            const newFarePerPassenger = booking.route.baseFare || 0;
            const newTotalFare = newFarePerPassenger * passengerCount;

            // Apply agent discount to new fare
            const discountCalculation = calculateDiscountedFare(newTotalFare, agentDiscountRate);
            const newDiscountedFare = discountCalculation.discountedFare;
            setDiscountedFare(newDiscountedFare);

            // Calculate difference between current paid fare and new discounted fare
            const difference = calculateFareDifference(currentPaidFare, newDiscountedFare);
            setFareDifference(difference);
        } else {
            setFareDifference(0);
            setDiscountedFare(0);
        }
    }, [selectedTrip, booking, agentDiscountRate]);

    // Function to fetch actual seat availability for a trip
    const fetchTripSeatAvailability = async (tripId: string) => {
        try {
            const { data: seatReservations, error } = await supabase
                .from('seat_reservations')
                .select('is_available, booking_id')
                .eq('trip_id', tripId);

            if (error) {
                return 0;
            }

            const availableCount = seatReservations?.filter(
                reservation => reservation.is_available && !reservation.booking_id
            ).length || 0;

            return availableCount;
        } catch (error) {
            return 0;
        }
    };

    // Fetch trips when date or route changes
    useEffect(() => {
        if (booking?.route && newDate) {
            fetchTrips(booking.route.id, newDate);
        }
    }, [booking?.route, newDate, fetchTrips]);

    // Fetch seats when trip is selected
    useEffect(() => {
        if (selectedTrip?.id) {
            fetchAvailableSeats(selectedTrip.id, false);
        }
    }, [selectedTrip?.id, fetchAvailableSeats]);

    // Fetch seat availability for all trips when trips are loaded
    useEffect(() => {
        const updateTripSeatCounts = async () => {
            if (trips.length > 0) {
                // Clear existing counts first
                setTripSeatCounts({});

                const newCounts: Record<string, number> = {};

                // Fetch counts for all trips in parallel
                const countPromises = trips.map(async (trip) => {
                    const count = await fetchTripSeatAvailability(trip.id);
                    return { tripId: trip.id, count };
                });

                try {
                    const results = await Promise.all(countPromises);
                    results.forEach(({ tripId, count }) => {
                        newCounts[tripId] = count;
                    });
                    setTripSeatCounts(newCounts);
                } catch (error) {
                    // Error handling - silently fail and continue
                }
            } else {
                // Clear seat counts when no trips available
                setTripSeatCounts({});
            }
        };

        updateTripSeatCounts();
    }, [trips]);

    // Additional effect to ensure seat counts are refreshed
    useEffect(() => {
        if (trips.length > 0) {
            // Immediate update
            const updateCounts = async () => {
                const updates: Record<string, number> = {};
                for (const trip of trips) {
                    const count = await fetchTripSeatAvailability(trip.id);
                    updates[trip.id] = count;
                }
                setTripSeatCounts(prev => ({ ...prev, ...updates }));
            };

            updateCounts();

            // Also set a delayed refresh to ensure accuracy
            const timer = setTimeout(updateCounts, 1000);
            return () => clearTimeout(timer);
        }
    }, [trips, newDate]);

    const toggleSeatSelection = (seat: Seat) => {
        if (!booking) return;

        const maxSeats = booking.passengers?.length || booking.passengerCount || 1;

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
    };

    const validateForm = () => {
        if (!booking) return false;

        let isValid = true;
        const newErrors = { ...errors };

        // Check if modification reason is provided
        if (!modificationReason.trim()) {
            newErrors.reason = 'Please provide a reason for modification';
            isValid = false;
        }

        // Check if date is changed and trip is selected
        const originalDate = isModifyingReturn ? booking.returnDate : booking.departureDate;
        const isDateChanged = newDate && newDate !== originalDate;
        if (isDateChanged && !selectedTrip) {
            newErrors.trip = `Please select a ${ticketLabel.toLowerCase()} trip for the new date`;
            isValid = false;
        }

        const maxSeats = booking.passengers?.length || booking.passengerCount || 1;

        // Only validate seat selection if trip is selected (date changed)
        if (selectedTrip && selectedSeats.length !== maxSeats) {
            newErrors.seats = `Please select ${maxSeats} seat(s) for ${ticketLabel.toLowerCase()}`;
            isValid = false;
        }

        // Validate payment details for bank transfers only
        if (selectedPaymentMethod === 'bank_transfer') {
            if (!bankAccountDetails.accountNumber.trim()) {
                newErrors.accountNumber = 'Account number is required for bank transfers';
                isValid = false;
            }
            if (!bankAccountDetails.accountName.trim()) {
                newErrors.accountName = 'Account name is required for bank transfers';
                isValid = false;
            }
            if (!bankAccountDetails.bankName.trim()) {
                newErrors.bankName = 'Bank name is required for bank transfers';
                isValid = false;
            }
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

        setIsModifying(true);

        try {
            // Prepare modification data for the specific ticket
            const modificationData = {
                ticketType: isModifyingReturn ? 'return' : 'departure',
                newTripId: selectedTrip?.id,
                newDate,
                selectedSeats,
                modificationReason,
                fareDifference,
                paymentMethod: selectedPaymentMethod,
                bankAccountDetails: fareDifference < 0 ? bankAccountDetails : null,
                // Additional agent-specific fields
                agentNotes,
                modifiedByAgent: true,
            };

            const result = await modifyBooking(booking.id, modificationData);

            let successMessage = `The ${ticketLabel.toLowerCase()} ticket has been modified successfully.`;

            if (fareDifference > 0) {
                // Additional charge scenario
                if (selectedPaymentMethod === 'agent_credit') {
                    successMessage += ` An additional charge of ${formatCurrency(fareDifference)} has been deducted from your agent credit balance.`;
                } else {
                    successMessage += ` An additional payment of ${formatCurrency(fareDifference)} will be processed via bank transfer.`;
                }
            } else if (fareDifference < 0) {
                // Refund scenario
                if (selectedPaymentMethod === 'agent_credit') {
                    successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} has been credited to your agent account.`;
                } else {
                    successMessage += ` A refund of ${formatCurrency(Math.abs(fareDifference))} will be processed via bank transfer within 72 hours.`;
                }
            } else {
                // No fare difference
                successMessage += " No additional payment or refund is required.";
            }

            Alert.alert(
                `${ticketLabel} Modified`,
                successMessage,
                [
                    {
                        text: "OK",
                        onPress: () => router.back()
                    }
                ]
            );
        } catch (error) {
            Alert.alert("Error", `Failed to modify ${ticketLabel.toLowerCase()} ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsModifying(false);
        }
    };

    // Loading state for initial data load
    if (isDataLoading) {
        return (
            <View style={styles.notFoundContainer}>
                <Text style={styles.notFoundText}>Loading booking details...</Text>
            </View>
        );
    }

    // Booking not found
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
    const originalDate = isModifyingReturn ? booking.returnDate : booking.departureDate;
    const originalSeats = booking.seats; // Use booking.seats for both departure and return

    return (
        <>
            <Stack.Screen
                options={{
                    title: `Modify ${ticketLabel} Ticket`,
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
                    {/* Current Ticket Details */}
                    <Card variant="elevated" style={styles.bookingCard}>
                        <Text style={styles.cardTitle}>Current {ticketLabel} Ticket Details</Text>

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
                                {originalDate ? new Date(originalDate).toLocaleDateString() : 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Current Seats:</Text>
                            <Text style={styles.detailValue}>
                                {originalSeats?.map((seat: any) => seat.number).join(', ') || 'N/A'}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Original Amount:</Text>
                            <Text style={styles.detailValue}>{formatCurrency(booking.totalAmount)}</Text>
                        </View>
                    </Card>

                    {/* Modification Form */}
                    <Card variant="elevated" style={styles.modifyCard}>
                        <Text style={styles.cardTitle}>Modify {ticketLabel} Ticket</Text>

                        <DatePicker
                            label={`New ${ticketLabel} Date`}
                            value={newDate}
                            onChange={(date) => {
                                setNewDate(date);
                                setSelectedTrip(null);
                                setSelectedSeats([]);
                                if (errors.date) setErrors({ ...errors, date: '' });
                            }}
                            minDate={new Date().toISOString().split('T')[0]}
                            error={errors.date}
                            required
                        />

                        {/* Trip Selection */}
                        {isTripsLoading && newDate ? (
                            <View style={styles.tripSelection}>
                                <Text style={styles.sectionTitle}>Select New {ticketLabel} Trip</Text>
                                <Text style={styles.loadingText}>Loading available trips...</Text>
                            </View>
                        ) : trips.length > 0 ? (
                            <View style={styles.tripSelection}>
                                <Text style={styles.sectionTitle}>Select New {ticketLabel} Trip</Text>
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
                        ) : null}

                        {/* Seat Selection */}
                        <Text style={styles.seatSectionTitle}>
                            Select New {ticketLabel} Seats ({selectedSeats.length}/{maxSeats})
                        </Text>
                        {!selectedTrip ? (
                            <Text style={styles.noSeatsText}>Please select a {ticketLabel.toLowerCase()} trip first</Text>
                        ) : isSeatsLoading ? (
                            <Text style={styles.loadingText}>Loading available seats...</Text>
                        ) : availableSeats.length > 0 ? (
                            <SeatSelector
                                seats={availableSeats}
                                selectedSeats={selectedSeats}
                                onSeatToggle={(seat) => toggleSeatSelection(seat)}
                                maxSeats={maxSeats}
                            />
                        ) : (
                            <Text style={styles.noSeatsText}>No seats available for this trip</Text>
                        )}

                        {errors.seats ? (
                            <Text style={styles.errorText}>{errors.seats}</Text>
                        ) : null}

                        {/* New Booking Fare Calculation */}
                        {selectedTrip && (
                            <Card variant="elevated" style={styles.fareCalculationCard}>
                                <View style={styles.fareHeader}>
                                    <DollarSign size={20} color={Colors.primary} />
                                    <Text style={styles.fareTitle}>Fare Calculation</Text>
                                </View>

                                {/* Current Fare */}
                                <View style={styles.discountRow}>
                                    <Text style={styles.discountLabel}>Current Paid Amount:</Text>
                                    <Text style={styles.discountValue}>
                                        {formatCurrency(Number(booking?.discountedAmount) || Number(booking?.totalAmount) || 0)}
                                    </Text>
                                </View>

                                {/* New Booking Base Fare */}
                                <View style={styles.discountRow}>
                                    <Text style={styles.discountLabel}>New Booking Fare:</Text>
                                    <Text style={styles.discountValue}>
                                        {formatCurrency((booking?.route?.baseFare || 0) * (booking?.passengers?.length || booking?.passengerCount || 1))}
                                    </Text>
                                </View>

                                {/* Agent Discount on New Fare */}
                                {agentDiscountRate > 0 && (
                                    <>
                                        <View style={styles.discountRow}>
                                            <Text style={styles.discountLabel}>Agent Discount ({agentDiscountRate}%):</Text>
                                            <Text style={styles.discountSavings}>
                                                -{formatCurrency(((booking?.route?.baseFare || 0) * (booking?.passengers?.length || booking?.passengerCount || 1)) * (agentDiscountRate / 100))}
                                            </Text>
                                        </View>

                                        <View style={styles.discountRow}>
                                            <Text style={styles.discountLabel}>New Discounted Fare:</Text>
                                            <Text style={styles.discountFinal}>
                                                {formatCurrency(discountedFare)}
                                            </Text>
                                        </View>
                                    </>
                                )}

                                {/* Payment Difference */}
                                <View style={styles.dividerLine} />
                                <View style={styles.discountRow}>
                                    <Text style={[styles.discountLabel, { fontSize: 16, fontWeight: '600' }]}>
                                        Payment Difference:
                                    </Text>
                                    <Text style={[
                                        styles.fareAmount,
                                        {
                                            fontSize: 18,
                                            color: fareDifference > 0 ? Colors.error :
                                                fareDifference < 0 ? Colors.success : Colors.textSecondary
                                        }
                                    ]}>
                                        {fareDifference > 0 ? '+' : ''}{formatCurrency(fareDifference)}
                                    </Text>
                                </View>

                                <Text style={styles.fareDescription}>
                                    {fareDifference > 0
                                        ? 'Additional payment required from client'
                                        : fareDifference < 0
                                            ? 'Refund amount to be processed'
                                            : 'No additional payment required'
                                    }
                                </Text>
                            </Card>
                        )}

                        {/* Payment Method Selection */}
                        {selectedTrip && fareDifference !== 0 && (
                            <Card variant="elevated" style={styles.paymentMethodCard}>
                                <View style={styles.paymentMethodContainer}>
                                    <Text style={styles.paymentMethodTitle}>
                                        {fareDifference > 0 ? 'Payment Method' : 'Refund Method'}
                                    </Text>

                                    <View style={styles.paymentOptions}>
                                        {/* Agent-specific payment options */}
                                        <TouchableOpacity
                                            style={[
                                                styles.paymentOption,
                                                selectedPaymentMethod === 'agent_credit' && styles.paymentOptionSelected
                                            ]}
                                            onPress={() => setSelectedPaymentMethod('agent_credit')}
                                        >
                                            <Text style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMethod === 'agent_credit' && styles.paymentOptionTextSelected
                                            ]}>
                                                💳 Agent Credit
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                styles.paymentOption,
                                                selectedPaymentMethod === 'bank_transfer' && styles.paymentOptionSelected
                                            ]}
                                            onPress={() => setSelectedPaymentMethod('bank_transfer')}
                                        >
                                            <Text style={[
                                                styles.paymentOptionText,
                                                selectedPaymentMethod === 'bank_transfer' && styles.paymentOptionTextSelected
                                            ]}>
                                                🏦 Bank Transfer
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Bank Account Details for Bank Transfers */}
                                {selectedPaymentMethod === 'bank_transfer' && (
                                    <View style={styles.bankDetailsContainer}>
                                        <Text style={styles.bankDetailsTitle}>
                                            Bank Account Details {fareDifference < 0 ? 'for Refund' : 'for Payment'}
                                        </Text>

                                        <View ref={(ref) => { inputRefs.current.accountNumber = ref; }}>
                                            <Input
                                                label="Account Number"
                                                placeholder="Enter client's bank account number"
                                                value={bankAccountDetails.accountNumber}
                                                onChangeText={(text) => {
                                                    setBankAccountDetails({ ...bankAccountDetails, accountNumber: text });
                                                    if (errors.accountNumber) setErrors({ ...errors, accountNumber: '' });
                                                }}
                                                onFocus={() => {
                                                    setActiveInput('accountNumber');
                                                    scrollToInput('accountNumber');
                                                }}
                                                error={errors.accountNumber}
                                                required
                                            />
                                        </View>

                                        <View ref={(ref) => { inputRefs.current.accountName = ref; }}>
                                            <Input
                                                label="Account Holder Name"
                                                placeholder="Enter account holder name"
                                                value={bankAccountDetails.accountName}
                                                onChangeText={(text) => {
                                                    setBankAccountDetails({ ...bankAccountDetails, accountName: text });
                                                    if (errors.accountName) setErrors({ ...errors, accountName: '' });
                                                }}
                                                onFocus={() => {
                                                    setActiveInput('accountName');
                                                    scrollToInput('accountName');
                                                }}
                                                error={errors.accountName}
                                                required
                                            />
                                        </View>

                                        <View ref={(ref) => { inputRefs.current.bankName = ref; }}>
                                            <Input
                                                label="Bank Name"
                                                placeholder="Enter bank name"
                                                value={bankAccountDetails.bankName}
                                                onChangeText={(text) => {
                                                    setBankAccountDetails({ ...bankAccountDetails, bankName: text });
                                                    if (errors.bankName) setErrors({ ...errors, bankName: '' });
                                                }}
                                                onFocus={() => {
                                                    setActiveInput('bankName');
                                                    scrollToInput('bankName');
                                                }}
                                                error={errors.bankName}
                                                required
                                            />
                                        </View>
                                    </View>
                                )}

                                <Text style={styles.fareNote}>
                                    {fareDifference > 0
                                        ? "Additional payment will be required from client"
                                        : fareDifference < 0
                                            ? "Refund will be processed within 72 hours"
                                            : "No additional payment or refund required"
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
                                    placeholder={`Please provide a reason for modifying this ${ticketLabel.toLowerCase()} ticket`}
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
                            title={`Modify Ticket`}
                            onPress={handleModify}
                            loading={isModifying || isTripsLoading || isSeatsLoading}
                            disabled={isModifying || isTripsLoading || isSeatsLoading}
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
    fareCalculationCard: {
        marginBottom: 16,
        backgroundColor: '#f0f9ff',
    },
    paymentMethodCard: {
        marginBottom: 16,
    },
    dividerLine: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 12,
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
    paymentMethodContainer: {
        marginTop: 16,
        marginBottom: 16,
    },
    paymentMethodTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    paymentOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    paymentOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.background,
    },
    paymentOptionSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    paymentOptionText: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    paymentOptionTextSelected: {
        color: '#fff',
    },
    bankDetailsContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    bankDetailsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 12,
    },
    fareNote: {
        fontSize: 14,
        color: Colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 12,
    },
    currentPaymentCard: {
        marginBottom: 16,
        backgroundColor: '#f5f5f5',
    },
    discountCard: {
        marginBottom: 16,
        backgroundColor: '#e8f5e9',
    },
    discountHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    discountTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.success,
    },
    discountRate: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.success,
    },
    discountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    discountLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    discountValue: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
    },
    discountSavings: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.success,
    },
    discountFinal: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.success,
    },
}); 