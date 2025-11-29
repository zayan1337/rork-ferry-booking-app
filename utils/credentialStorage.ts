import AsyncStorage from '@react-native-async-storage/async-storage';

const CREDENTIALS_STORAGE_KEY = 'saved_login_credentials';

export interface SavedCredential {
  id: string;
  username: string;
  password: string;
  lastUsed: string; // ISO timestamp
  displayName?: string; // Optional display name (e.g., email prefix)
}

/**
 * Credential Storage Utility
 * 
 * NOTE: Storing passwords in plain text is not recommended for production.
 * Consider using expo-secure-store or encryption for better security.
 * This implementation is for convenience and should be used with caution.
 */
class CredentialStorage {
  /**
   * Get all saved credentials, sorted by last used (most recent first)
   */
  async getSavedCredentials(): Promise<SavedCredential[]> {
    try {
      const data = await AsyncStorage.getItem(CREDENTIALS_STORAGE_KEY);
      if (!data) return [];
      
      const credentials: SavedCredential[] = JSON.parse(data);
      // Sort by lastUsed, most recent first
      return credentials.sort((a, b) => 
        new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
      );
    } catch (error) {
      console.error('Error loading saved credentials:', error);
      return [];
    }
  }

  /**
   * Save or update a credential
   */
  async saveCredential(username: string, password: string): Promise<void> {
    try {
      const credentials = await this.getSavedCredentials();
      
      // Check if credential already exists
      const existingIndex = credentials.findIndex(
        cred => cred.username.toLowerCase() === username.toLowerCase()
      );

      const newCredential: SavedCredential = {
        id: existingIndex >= 0 ? credentials[existingIndex].id : this.generateId(),
        username,
        password,
        lastUsed: new Date().toISOString(),
        displayName: this.getDisplayName(username),
      };

      if (existingIndex >= 0) {
        // Update existing credential
        credentials[existingIndex] = newCredential;
      } else {
        // Add new credential
        credentials.push(newCredential);
      }

      // Limit to 10 saved credentials
      const limitedCredentials = credentials.slice(0, 10);
      
      await AsyncStorage.setItem(
        CREDENTIALS_STORAGE_KEY,
        JSON.stringify(limitedCredentials)
      );
    } catch (error) {
      console.error('Error saving credential:', error);
      throw error;
    }
  }

  /**
   * Delete a saved credential
   */
  async deleteCredential(id: string): Promise<void> {
    try {
      const credentials = await this.getSavedCredentials();
      const filtered = credentials.filter(cred => cred.id !== id);
      
      await AsyncStorage.setItem(
        CREDENTIALS_STORAGE_KEY,
        JSON.stringify(filtered)
      );
    } catch (error) {
      console.error('Error deleting credential:', error);
      throw error;
    }
  }

  /**
   * Update last used timestamp for a credential
   */
  async updateLastUsed(username: string): Promise<void> {
    try {
      const credentials = await this.getSavedCredentials();
      const index = credentials.findIndex(
        cred => cred.username.toLowerCase() === username.toLowerCase()
      );

      if (index >= 0) {
        credentials[index].lastUsed = new Date().toISOString();
        await AsyncStorage.setItem(
          CREDENTIALS_STORAGE_KEY,
          JSON.stringify(credentials)
        );
      }
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  }

  /**
   * Clear all saved credentials
   */
  async clearAllCredentials(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing credentials:', error);
      throw error;
    }
  }

  /**
   * Generate a unique ID for a credential
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get a display name from username (email prefix or phone number)
   */
  private getDisplayName(username: string): string {
    if (username.includes('@')) {
      // Email: return the part before @
      return username.split('@')[0];
    }
    // Phone or other: return first 4 chars + ...
    return username.length > 4 
      ? `${username.substring(0, 4)}...` 
      : username;
  }
}

export const credentialStorage = new CredentialStorage();

