import { useState, useCallback, useMemo } from 'react';
import type { Client, AgentClient } from '@/types/agent';

/**
 * Custom hook for agent client search functionality
 * Provides search filtering and query management for client lists
 */
export const useAgentClientSearch = (clients: Client[] = []) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;

    const query = searchQuery.toLowerCase();
    return clients.filter(client => {
      return (
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.includes(query)
      );
    });
  }, [clients, searchQuery]);

  // Update search query
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Get search stats
  const searchStats = useMemo(() => {
    return {
      totalClients: clients.length,
      filteredCount: filteredClients.length,
      isFiltering: searchQuery.trim().length > 0,
      hasResults: filteredClients.length > 0,
    };
  }, [clients.length, filteredClients.length, searchQuery]);

  return {
    // Search state
    searchQuery,
    filteredClients,
    searchStats,

    // Actions
    updateSearchQuery,
    clearSearch,

    // Helpers
    isSearching: searchQuery.trim().length > 0,
    hasResults: filteredClients.length > 0,
  };
};

/**
 * Custom hook for agent booking client search (for booking creation)
 * Provides search functionality specifically for agent booking workflows
 */
export const useAgentBookingClientSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AgentClient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Update search query
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Set search results (typically from external API call)
  const setResults = useCallback((results: AgentClient[]) => {
    setSearchResults(results);
    setIsSearching(false);
  }, []);

  // Start searching
  const startSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  // Check if search has query
  const hasQuery = useMemo(() => {
    return searchQuery.trim().length > 0;
  }, [searchQuery]);

  // Check if search has results
  const hasResults = useMemo(() => {
    return searchResults.length > 0;
  }, [searchResults]);

  return {
    // Search state
    searchQuery,
    searchResults,
    isSearching,
    hasQuery,
    hasResults,

    // Actions
    updateSearchQuery,
    setResults,
    startSearch,
    clearSearch,
  };
};
