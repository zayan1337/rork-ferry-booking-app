import { useState, useEffect, useCallback } from 'react';
import type { AgentClient } from '@/types/agent';
import { prefillClientFormFromQuery } from '@/utils/bookingFormUtils';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
}

interface UseBookingClientSearchProps {
  onClientSelect: (client: AgentClient) => void;
  onClientCreate: (formData: ClientFormData) => void;
  searchClients: (query: string) => Promise<void>;
  clearClientSearch: () => void;
  clientSearchResults: AgentClient[];
  isSearching: boolean;
}

export const useBookingClientSearch = ({
  onClientSelect,
  onClientCreate,
  searchClients,
  clearClientSearch,
  clientSearchResults,
  isSearching,
}: UseBookingClientSearchProps) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [showAddNewClientForm, setShowAddNewClientForm] = useState(false);
  const [clientForm, setClientForm] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
  });

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localSearchQuery.length >= 3) {
        searchClients(localSearchQuery);
      } else if (localSearchQuery.length === 0) {
        clearClientSearch();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [localSearchQuery, searchClients, clearClientSearch]);

  const handleSearchInputChange = useCallback((text: string) => {
    setLocalSearchQuery(text);
  }, []);

  const handleSelectExistingClient = useCallback(
    (client: AgentClient) => {
      onClientSelect(client);
      clearClientSearch();
      setLocalSearchQuery('');
      setShowAddNewClientForm(false);
    },
    [onClientSelect, clearClientSearch]
  );

  const handleShowAddNewClient = useCallback(() => {
    setShowAddNewClientForm(true);
    clearClientSearch();

    // Pre-fill with search query if it looks like an email or phone
    const prefilledForm = prefillClientFormFromQuery(localSearchQuery);
    setClientForm(prev => ({ ...prev, ...prefilledForm }));
  }, [localSearchQuery, clearClientSearch]);

  const handleClientFormChange = useCallback(
    (field: keyof ClientFormData, value: string) => {
      setClientForm(prev => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleSaveClient = useCallback(() => {
    if (!clientForm.name || !clientForm.email || !clientForm.phone) {
      return false;
    }

    onClientCreate(clientForm);
    return true;
  }, [clientForm, onClientCreate]);

  const handleBackToSearch = useCallback(() => {
    setShowAddNewClientForm(false);
    setClientForm({ name: '', email: '', phone: '', idNumber: '' });
  }, []);

  const clearSearch = useCallback(() => {
    setLocalSearchQuery('');
    setShowAddNewClientForm(false);
    setClientForm({ name: '', email: '', phone: '', idNumber: '' });
    clearClientSearch();
  }, [clearClientSearch]);

  return {
    // Search state
    localSearchQuery,
    showAddNewClientForm,
    clientForm,

    // Search results
    clientSearchResults,
    isSearching,

    // Actions
    handleSearchInputChange,
    handleSelectExistingClient,
    handleShowAddNewClient,
    handleClientFormChange,
    handleSaveClient,
    handleBackToSearch,
    clearSearch,

    // State setters (for external control)
    setShowAddNewClientForm,
    setClientForm,
  };
};
