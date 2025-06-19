import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { Calendar, MapPin, User, DollarSign, CreditCard, Mail, Phone } from "lucide-react-native";

export default function NewBookingScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId?: string }>();
  const clients = useAgentStore((state) => state.clients);
  const agent = useAgentStore((state) => state.agent);

  const selectedClient = clientId ? clients.find(c => c.id === clientId) : undefined;

  // Client information
  const [clientName, setClientName] = useState(selectedClient?.name || "");
  const [clientEmail, setClientEmail] = useState(selectedClient?.email || "");
  const [clientPhone, setClientPhone] = useState(selectedClient?.phone || "");

  // Trip information
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");

  // Payment information
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "gateway" | "free">("credit");

  const [loading, setLoading] = useState(false);

  // Calculate discounted amount
  const discountRate = agent?.discountRate || 0;
  const discountedAmount = totalAmount ? parseFloat(totalAmount) * (1 - discountRate / 100) : 0;

  const validateForm = () => {
    if (!clientName || !clientEmail || !clientPhone) {
      Alert.alert("Error", "Please enter all client information");
      return false;
    }

    if (!origin || !destination || !departureDate || !passengerCount) {
      Alert.alert("Error", "Please enter all trip information");
      return false;
    }

    if (!totalAmount) {
      Alert.alert("Error", "Please enter the total amount");
      return false;
    }

    return true;
  };

  const handleCreateBooking = () => {
    if (!validateForm()) return;

    setLoading(true);

    // In a real app, this would make an API call to create the booking
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        "Booking Created",
        "The booking has been successfully created.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    }, 1000);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <Stack.Screen options={{ title: "New Booking" }} />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.content}>
        <Card variant="elevated" style={styles.card}>
          <View style={styles.sectionHeader}>
            <User size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Client Information</Text>
          </View>

          <Input
            value={clientName}
            onChangeText={setClientName}
            placeholder="Enter client name"
            label="Client Name"
            autoCapitalize="words"
            leftIcon={<User size={16} color={Colors.subtext} />}
            disabled={!!selectedClient}
          />

          <Input
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="Enter client email"
            label="Client Email"
            keyboardType="email-address"
            leftIcon={<Mail size={16} color={Colors.subtext} />}
            disabled={!!selectedClient}
          />

          <Input
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="Enter client phone"
            label="Client Phone"
            keyboardType="phone-pad"
            leftIcon={<Phone size={16} color={Colors.subtext} />}
            disabled={!!selectedClient}
          />
        </Card>

        <Card variant="elevated" style={styles.card}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Trip Information</Text>
          </View>

          <Input
            value={origin}
            onChangeText={setOrigin}
            placeholder="Enter origin city"
            label="Origin"
            leftIcon={<MapPin size={16} color={Colors.subtext} />}
          />

          <Input
            value={destination}
            onChangeText={setDestination}
            placeholder="Enter destination city"
            label="Destination"
            leftIcon={<MapPin size={16} color={Colors.subtext} />}
          />

          <Input
            value={departureDate}
            onChangeText={setDepartureDate}
            placeholder="YYYY-MM-DD"
            label="Departure Date"
            leftIcon={<Calendar size={16} color={Colors.subtext} />}
          />

          <Input
            value={returnDate}
            onChangeText={setReturnDate}
            placeholder="YYYY-MM-DD (Optional)"
            label="Return Date (Optional)"
            leftIcon={<Calendar size={16} color={Colors.subtext} />}
          />

          <Input
            value={passengerCount}
            onChangeText={setPassengerCount}
            placeholder="Enter number of passengers"
            label="Passenger Count"
            keyboardType="numeric"
            leftIcon={<User size={16} color={Colors.subtext} />}
          />
        </Card>

        <Card variant="elevated" style={styles.card}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Payment Information</Text>
          </View>

          <Input
            value={totalAmount}
            onChangeText={setTotalAmount}
            placeholder="Enter total amount"
            label="Total Amount"
            keyboardType="numeric"
            leftIcon={<DollarSign size={16} color={Colors.subtext} />}
          />

          {totalAmount && (
            <View style={styles.discountContainer}>
              <Text style={styles.discountLabel}>
                Discounted Amount ({discountRate}% discount):
              </Text>
              <Text style={styles.discountValue}>
                {formatCurrency(discountedAmount)}
              </Text>
            </View>
          )}

          <View style={styles.paymentMethodSection}>
            <CreditCard size={16} color={Colors.subtext} />
            <Text style={styles.paymentMethodLabel}>Payment Method</Text>
          </View>
          <View style={styles.paymentMethodsContainer}>
            <Button
              title="💳 Agent Credit"
              onPress={() => setPaymentMethod("credit")}
              variant={paymentMethod === "credit" ? "primary" : "outline"}
              style={styles.paymentMethodButton}
            />
            <Button
              title="🌐 Payment Gateway"
              onPress={() => setPaymentMethod("gateway")}
              variant={paymentMethod === "gateway" ? "primary" : "outline"}
              style={styles.paymentMethodButton}
            />
            <Button
              title="🎫 Free Ticket"
              onPress={() => setPaymentMethod("free")}
              variant={paymentMethod === "free" ? "primary" : "outline"}
              style={styles.paymentMethodButton}
              disabled={!agent?.freeTicketsRemaining}
            />
          </View>

          {paymentMethod === "free" && agent?.freeTicketsRemaining ? (
            <Text style={styles.freeTicketsText}>
              Free tickets remaining: {agent.freeTicketsRemaining}
            </Text>
          ) : null}

          {paymentMethod === "credit" && (
            <Text style={styles.creditBalanceText}>
              Credit balance: {formatCurrency(agent?.creditBalance || 0)}
            </Text>
          )}
        </Card>

        <Button
          title="Create Booking"
          onPress={handleCreateBooking}
          loading={loading}
          style={styles.createButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 8,
  },
  discountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.subtext,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  paymentMethodSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.text,
    marginLeft: 8,
  },
  paymentMethodsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  paymentMethodButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  freeTicketsText: {
    fontSize: 14,
    color: Colors.success,
    marginBottom: 16,
  },
  creditBalanceText: {
    fontSize: 14,
    color: Colors.primary,
    marginBottom: 16,
  },
  createButton: {
    marginBottom: 24,
  },
});