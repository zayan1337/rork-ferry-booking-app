import React, { useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useAgentStore } from "@/store/agentStore";
import Colors from "@/constants/colors";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function NewBookingScreen() {
  const router = useRouter();
  const { createBooking, clients } = useAgentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    origin: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    passengerCount: '1',
    paymentMethod: 'credit' as 'credit' | 'gateway' | 'free',
  });

  const handleCreateBooking = async () => {
    try {
      setIsLoading(true);
      const bookingId = await createBooking({
        ...formData,
        passengerCount: parseInt(formData.passengerCount),
      });
      router.back();
      console.log('Booking created:', bookingId);
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card variant="elevated" style={styles.formCard}>
        <Text style={styles.title}>Create New Booking</Text>

        <Input
          label="Origin"
          value={formData.origin}
          onChangeText={(value) => setFormData(prev => ({ ...prev, origin: value }))}
          placeholder="Departure location"
        />

        <Input
          label="Destination"
          value={formData.destination}
          onChangeText={(value) => setFormData(prev => ({ ...prev, destination: value }))}
          placeholder="Arrival location"
        />

        <Input
          label="Departure Date"
          value={formData.departureDate}
          onChangeText={(value) => setFormData(prev => ({ ...prev, departureDate: value }))}
          placeholder="YYYY-MM-DD"
        />

        <Input
          label="Return Date (Optional)"
          value={formData.returnDate}
          onChangeText={(value) => setFormData(prev => ({ ...prev, returnDate: value }))}
          placeholder="YYYY-MM-DD"
        />

        <Input
          label="Number of Passengers"
          value={formData.passengerCount}
          onChangeText={(value) => setFormData(prev => ({ ...prev, passengerCount: value }))}
          placeholder="1"
          keyboardType="numeric"
        />

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.button}
          />
          <Button
            title="Create Booking"
            onPress={handleCreateBooking}
            variant="primary"
            style={styles.button}
            loading={isLoading}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  formCard: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 20,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});