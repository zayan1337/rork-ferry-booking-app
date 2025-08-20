import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAgentStore } from '@/store/agent/agentStore';
import { useClientForm } from '@/hooks/useClientForm';
import { useExistingUserSearch } from '@/hooks/useExistingUserSearch';
import { ClientFormHeader, ExistingUserCard } from '@/components/client';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { User, Mail, Phone, CreditCard } from 'lucide-react-native';

export default function AddClientScreen() {
  const router = useRouter();
  const {
    agent,
    createAgentClient,
    addExistingUserAsClient,
    isLoadingClients,
  } = useAgentStore();

  const {
    formData,
    errors,
    handleInputChange,
    validateForm,
    clearForm,
    setGeneralError,
    clearGeneralError,
    isFormValid,
  } = useClientForm();

  const { existingUser, isSearching, clearSearch } = useExistingUserSearch(
    formData.email
  );

  const [isProcessing, setIsProcessing] = useState(false);

  const combinedLoading = isLoadingClients || isProcessing;

  const handleAddExistingUser = async () => {
    if (!existingUser || !agent) {
      return;
    }

    setIsProcessing(true);
    clearGeneralError();

    try {
      await addExistingUserAsClient(existingUser.id);

      Alert.alert(
        'Client Added Successfully',
        `${existingUser.full_name || existingUser.email} has been added to your client list.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error adding existing user as client:', error);
      setGeneralError(
        error.message || 'Failed to add client. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNewClient = async () => {
    if (!validateForm() || !agent) {
      return;
    }

    setIsProcessing(true);
    clearGeneralError();

    try {
      const newClientId = await createAgentClient({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        idNumber: formData.idNumber,
      });

      Alert.alert(
        'Client Created Successfully',
        `${formData.name} has been added to your client list.`,
        [
          {
            text: 'Create Booking',
            onPress: () => {
              router.replace({
                pathname: '../booking/new',
                params: { clientId: newClientId },
              });
            },
          },
          {
            text: 'Back to Clients',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating client:', error);
      setGeneralError(
        error.message || 'Failed to create client. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearForm = () => {
    clearForm();
    clearSearch();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Stack.Screen options={{ title: 'Add New Client' }} />

      <Card variant='elevated' style={styles.formCard}>
        <ClientFormHeader
          title='Add New Client'
          subtitle='Create a new client profile for booking management'
        />

        {errors.general && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errors.general}</Text>
          </View>
        )}

        <View style={styles.formSection}>
          <Input
            label='Client Name'
            placeholder='Enter full name'
            value={formData.name}
            onChangeText={text => handleInputChange('name', text)}
            error={errors.name}
            leftIcon={<User size={20} color={Colors.textSecondary} />}
            required
          />

          <Input
            label='Email Address'
            placeholder='Enter email address'
            value={formData.email}
            onChangeText={text => handleInputChange('email', text)}
            error={errors.email}
            leftIcon={<Mail size={20} color={Colors.textSecondary} />}
            keyboardType='email-address'
            autoCapitalize='none'
            required
          />

          {isSearching && (
            <View style={styles.checkingContainer}>
              <Text style={styles.checkingText}>
                Checking for existing user...
              </Text>
            </View>
          )}

          {existingUser && (
            <ExistingUserCard
              user={existingUser}
              onAddUser={handleAddExistingUser}
              loading={combinedLoading}
            />
          )}

          <Input
            label='Phone Number'
            placeholder='Enter phone number'
            value={formData.phone}
            onChangeText={text => handleInputChange('phone', text)}
            error={errors.phone}
            leftIcon={<Phone size={20} color={Colors.textSecondary} />}
            keyboardType='phone-pad'
            required
          />

          <Input
            label='ID Number (Optional)'
            placeholder='Enter ID number'
            value={formData.idNumber}
            onChangeText={text => handleInputChange('idNumber', text)}
            error={errors.idNumber}
            leftIcon={<CreditCard size={20} color={Colors.textSecondary} />}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Client Information</Text>
          <Text style={styles.infoText}>
            • Clients without user accounts can only book through agents
          </Text>
          <Text style={styles.infoText}>
            • If an existing user account is found, they will be linked to your
            client list
          </Text>
          <Text style={styles.infoText}>
            • All client data is securely stored and can be used for future
            bookings
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title='Clear Form'
            onPress={handleClearForm}
            variant='outline'
            style={styles.secondaryButton}
            disabled={combinedLoading}
          />

          <Button
            title='Create Client'
            onPress={handleCreateNewClient}
            variant='primary'
            style={styles.primaryButton}
            loading={combinedLoading}
            disabled={combinedLoading || !isFormValid}
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
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 24,
  },
  checkingContainer: {
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    marginBottom: 16,
  },
  checkingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
});
