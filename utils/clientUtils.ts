import { Client } from '@/types/agent';

/**
 * Gets the display name for a client, handling cases where clientName might be an email
 * for clients with accounts.
 *
 * @param clientName - The client name from booking (might be name or email)
 * @param clients - Array of clients to search through
 * @returns The actual client name or falls back to the original clientName
 */
export const getClientDisplayName = (
  clientName: string | undefined,
  clients: Client[] | undefined
): string => {
  if (!clientName) return 'N/A';
  if (!clients || clients.length === 0) return clientName;

  // First, try to find client by exact name match
  let client = clients.find(c => c.name === clientName);

  // If not found and clientName looks like an email, try to find by email
  if (!client && clientName.includes('@')) {
    client = clients.find(c => c.email === clientName);
  }

  // Return the client's name if found, otherwise fall back to original clientName
  return client?.name || clientName;
};

/**
 * Gets the actual client object from clients array based on clientName (which might be email)
 *
 * @param clientName - The client name from booking (might be name or email)
 * @param clients - Array of clients to search through
 * @returns The client object if found, undefined otherwise
 */
export const getClientByNameOrEmail = (
  clientName: string | undefined,
  clients: Client[] | undefined
): Client | undefined => {
  if (!clientName || !clients || clients.length === 0) return undefined;

  // First, try to find client by exact name match
  let client = clients.find(c => c.name === clientName);

  // If not found and clientName looks like an email, try to find by email
  if (!client && clientName.includes('@')) {
    client = clients.find(c => c.email === clientName);
  }

  return client;
};
