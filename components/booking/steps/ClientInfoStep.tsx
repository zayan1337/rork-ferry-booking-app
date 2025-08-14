import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Colors from '@/constants/colors';
import type { AgentClient } from '@/types/agent';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
}

interface ClientInfoStepProps {
  // Selected client
  selectedClient: AgentClient | null;
  onClientChange: (client: AgentClient | null) => void;

  // Client search
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: AgentClient[];
  isSearching: boolean;
  onSelectClient: (client: AgentClient) => void;

  // Add new client form
  showAddForm: boolean;
  onToggleAddForm: (show: boolean) => void;
  clientForm: ClientFormData;
  onClientFormChange: (field: keyof ClientFormData, value: string) => void;
  onSaveNewClient: () => void;

  // Validation
  errors: {
    client?: string;
  };
  clearError: (field: string) => void;
}

const ClientInfoStep: React.FC<ClientInfoStepProps> = ({
  selectedClient,
  onClientChange,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  isSearching,
  onSelectClient,
  showAddForm,
  onToggleAddForm,
  clientForm,
  onClientFormChange,
  onSaveNewClient,
  errors,
  clearError,
}) => {
  const handleSelectClient = (client: AgentClient) => {
    onSelectClient(client);
    if (errors.client) clearError('client');
  };

  const handleChangeClient = () => {
    onClientChange(null);
    onToggleAddForm(false);
    onSearchQueryChange('');
    if (errors.client) clearError('client');
  };

  const handleShowAddForm = () => {
    onToggleAddForm(true);
    // Pre-fill form with search query if it looks like email/phone
    if (searchQuery.includes('@')) {
      onClientFormChange('email', searchQuery);
    } else if (searchQuery.match(/^\d+$/)) {
      onClientFormChange('phone', searchQuery);
    }
  };

  const handleFormChange = (field: keyof ClientFormData, value: string) => {
    onClientFormChange(field, value);
    if (errors.client) clearError('client');
  };

  return (
    <View>
      <Text style={styles.stepTitle}>Client Information</Text>

      {!selectedClient && !showAddForm && (
        <View>
          <Text style={styles.searchLabel}>
            Search for existing client by email or phone:
          </Text>
          <Input
            label=''
            placeholder='Enter client email or phone number'
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            keyboardType='email-address'
          />

          {isSearching && (
            <View style={styles.searchingContainer}>
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}

          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              <Text style={styles.searchResultsTitle}>Found clients:</Text>
              {searchResults.map((client, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.clientResultItem}
                  onPress={() => handleSelectClient(client)}
                >
                  <View style={styles.clientResultInfo}>
                    <Text style={styles.clientResultName}>{client.name}</Text>
                    <Text style={styles.clientResultDetails}>
                      {client.email} • {client.phone}
                    </Text>
                    {client.hasAccount && (
                      <Text style={styles.clientResultBadge}>Has Account</Text>
                    )}
                  </View>
                  <ArrowRight size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchQuery.length >= 3 &&
            searchResults.length === 0 &&
            !isSearching && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  No existing clients found
                </Text>
              </View>
            )}

          <Button
            title='Add New Client'
            onPress={handleShowAddForm}
            variant='outline'
            style={styles.addNewClientButton}
          />
        </View>
      )}

      {selectedClient && !showAddForm && (
        <View style={styles.selectedClientContainer}>
          <Text style={styles.selectedClientTitle}>Selected Client:</Text>
          <View style={styles.selectedClientInfo}>
            <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
            <Text style={styles.selectedClientDetails}>
              {selectedClient.email} • {selectedClient.phone}
            </Text>
            {selectedClient.hasAccount && (
              <Text style={styles.selectedClientBadge}>Has Account</Text>
            )}
          </View>
          <Button
            title='Change Client'
            onPress={handleChangeClient}
            variant='outline'
            style={styles.changeClientButton}
          />
        </View>
      )}

      {showAddForm && (
        <View style={styles.newClientFormContainer}>
          <Text style={styles.newClientFormTitle}>Add New Client</Text>

          <Input
            label='Client Name'
            placeholder='Enter client name'
            value={clientForm.name}
            onChangeText={text => handleFormChange('name', text)}
            required
          />

          <Input
            label='Client Email'
            placeholder='Enter client email'
            value={clientForm.email}
            onChangeText={text => handleFormChange('email', text)}
            keyboardType='email-address'
            required
          />

          <Input
            label='Client Phone'
            placeholder='Enter client phone'
            value={clientForm.phone}
            onChangeText={text => handleFormChange('phone', text)}
            keyboardType='phone-pad'
            required
          />

          <Input
            label='ID Number (Optional)'
            placeholder='Enter ID number (optional)'
            value={clientForm.idNumber}
            onChangeText={text => handleFormChange('idNumber', text)}
          />

          <View style={styles.formButtons}>
            <Button
              title='Cancel'
              onPress={() => onToggleAddForm(false)}
              variant='outline'
              style={styles.formButton}
            />
            <Button
              title='Save Client'
              onPress={onSaveNewClient}
              variant='primary'
              style={styles.formButton}
            />
          </View>
        </View>
      )}

      {errors.client && <Text style={styles.errorText}>{errors.client}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  searchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  searchingContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  searchingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  searchResultsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  clientResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.card,
  },
  clientResultInfo: {
    flex: 1,
  },
  clientResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  clientResultDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  clientResultBadge: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  noResultsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addNewClientButton: {
    marginTop: 16,
  },
  selectedClientContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: Colors.highlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  selectedClientTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  selectedClientInfo: {
    marginBottom: 12,
  },
  selectedClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedClientDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  selectedClientBadge: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  changeClientButton: {
    marginTop: 8,
  },
  newClientFormContainer: {
    marginTop: 16,
  },
  newClientFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  formButton: {
    flex: 1,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 8,
  },
});

export default ClientInfoStep;
