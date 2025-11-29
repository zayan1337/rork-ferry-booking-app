import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  BackHandler,
  Modal,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import LogoImage from '@/assets/images/logo.jpg';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { credentialStorage, SavedCredential } from '@/utils/credentialStorage';
import { X, User } from 'lucide-react-native';

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    username: '',
    password: '',
  });

  const {
    login,
    isAuthenticated,
    error,
    clearError,
    isAuthenticating,
    enableGuestMode,
  } = useAuthStore();
  const [isNavigating, setIsNavigating] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>(
    []
  );
  const [saveCredential, setSaveCredential] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [showViewAllModal, setShowViewAllModal] = useState(false);

  // Reset navigation state when component mounts
  useEffect(() => {
    setIsNavigating(false);
    setSuggestionsDismissed(false); // Reset dismissed state when component mounts
    loadSavedCredentials();
  }, []);

  // Load saved credentials on mount
  const loadSavedCredentials = async () => {
    try {
      const credentials = await credentialStorage.getSavedCredentials();
      setSavedCredentials(credentials);
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  // Don't auto-clear errors on focus - let them persist until user interaction
  // This ensures login errors remain visible after failed attempts

  useEffect(() => {
    // If user is authenticated, set navigating state to show loading
    // The root layout will handle navigation automatically
    if (isAuthenticated && !isNavigating) {
      setIsNavigating(true);
      // Don't manually navigate - let the root layout handle it
      // This prevents navigation conflicts and app crashes
    }
  }, [isAuthenticated, isNavigating]);

  // Prevent going back if authenticated
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isAuthenticated || isNavigating) {
          return true; // Prevent going back
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [isAuthenticated, isNavigating]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear auth store error when user starts typing
    if (error) {
      clearError();
    }

    // Show suggestions when typing in email field (only if not dismissed)
    if (field === 'username') {
      if (value && savedCredentials.length > 0 && !suggestionsDismissed) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    // Validate username (email or phone)
    if (!formData.username.trim()) {
      newErrors.username = 'Email is required';
      isValid = false;
    } else {
      const isEmail = /\S+@\S+\.\S+/.test(formData.username);
      const isPhone = /^\+?[0-9]{7,15}$/.test(formData.username);
      if (!isEmail && !isPhone) {
        newErrors.username = 'Enter a valid email';
        isValid = false;
      }
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    // Prevent multiple attempts while authenticating or navigating
    if (isAuthenticating || isNavigating) {
      return;
    }

    // Clear any previous errors
    clearError();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Attempt login
    try {
      await login(formData.username, formData.password);
      // If login succeeds, save credential if user opted in
      if (saveCredential) {
        try {
          await credentialStorage.saveCredential(
            formData.username,
            formData.password
          );
          // Reload saved credentials to update the list
          await loadSavedCredentials();
        } catch (saveError) {
          console.error('Error saving credential:', saveError);
          // Don't fail login if saving credential fails
        }
      } else {
        // Update last used timestamp even if not saving
        await credentialStorage.updateLastUsed(formData.username);
      }
      // If login succeeds, isAuthenticated will be true and navigation will happen
      // Set navigating state to show loading during redirect
      setIsNavigating(true);
    } catch (err) {
      // Reset navigation state if login fails
      setIsNavigating(false);
    }
  };

  // Filter suggestions based on typed text
  const getSuggestions = () => {
    if (!formData.username || savedCredentials.length === 0) {
      return [];
    }
    const query = formData.username.toLowerCase();
    return savedCredentials
      .filter(
        cred =>
          cred.username.toLowerCase().includes(query) ||
          cred.displayName?.toLowerCase().includes(query)
      )
      .slice(0, 5); // Limit to 5 suggestions
  };

  const suggestions = getSuggestions();

  const handleSelectSuggestion = (credential: SavedCredential) => {
    setFormData({
      username: credential.username,
      password: credential.password,
    });
    setShowSuggestions(false);
    setEmailFocused(false);
    // Clear errors when selecting a saved account
    setErrors({ username: '', password: '' });
    clearError();
  };

  const handleCloseSuggestions = () => {
    setShowSuggestions(false);
    setSuggestionsDismissed(true);
  };

  // Helper to close modal with keyboard dismissal
  const handleCloseViewAllModal = () => {
    Keyboard.dismiss();
    setShowViewAllModal(false);
  };

  const handleDeleteCredential = async (id: string) => {
    try {
      await credentialStorage.deleteCredential(id);
      await loadSavedCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
    }
  };

  const handleClearAllCredentials = async () => {
    try {
      await credentialStorage.clearAllCredentials();
      await loadSavedCredentials();
      handleCloseViewAllModal();
    } catch (error) {
      console.error('Error clearing all credentials:', error);
    }
  };

  const handleNavigation = (path: 'register' | 'forgotPassword') => {
    if (!isAuthenticating && !isNavigating) {
      router.push(path as any);
    }
  };

  const handleContinueAsGuest = () => {
    if (isAuthenticating || isNavigating) {
      return;
    }

    enableGuestMode();
    router.replace('/(app)/(customer)/(tabs)' as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.logoContainer}>
          <Image source={LogoImage} style={styles.logo} />
          <Text style={styles.appName}>Crystal Transfer Vaavu</Text>
          <Text style={styles.tagline}>
            Seamless comfort and convenience in travelling
          </Text>
        </View>

        <Card variant='elevated' style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.emailInputContainer}>
            <Input
              label='Email'
              placeholder='Enter your email'
              value={formData.username}
              onChangeText={text => updateFormData('username', text)}
              onFocus={() => {
                setEmailFocused(true);
                if (
                  formData.username &&
                  savedCredentials.length > 0 &&
                  !suggestionsDismissed
                ) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => {
                // Delay hiding suggestions to allow clicking on them
                setTimeout(() => {
                  setEmailFocused(false);
                  if (!suggestionsDismissed) {
                    setShowSuggestions(false);
                  }
                }, 200);
              }}
              error={errors.username}
              autoCapitalize='none'
              keyboardType='email-address'
              disabled={isAuthenticating || isNavigating}
              required
            />
            {/* Autocomplete Suggestions */}
            {showSuggestions &&
              suggestions.length > 0 &&
              emailFocused &&
              !isAuthenticating &&
              !isNavigating &&
              !suggestionsDismissed && (
                <View style={styles.suggestionsContainer}>
                  {/* Close button at top right - compact */}
                  <Pressable
                    style={styles.suggestionsCloseButton}
                    onPress={handleCloseSuggestions}
                    hitSlop={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <X size={16} color={Colors.textSecondary} />
                  </Pressable>

                  {suggestions.map((credential, index) => (
                    <Pressable
                      key={credential.id}
                      style={[
                        styles.suggestionItem,
                        index === suggestions.length - 1 &&
                          styles.suggestionItemLast,
                      ]}
                      onPress={() => handleSelectSuggestion(credential)}
                    >
                      <View style={styles.suggestionContent}>
                        <User size={16} color={Colors.primary} />
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionDisplayName}>
                            {credential.displayName || credential.username}
                          </Text>
                          <Text
                            style={styles.suggestionEmail}
                            numberOfLines={1}
                          >
                            {credential.username}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}

                  {/* View All button at bottom right - compact */}
                  {savedCredentials.length > suggestions.length && (
                    <Pressable
                      style={styles.viewAllButton}
                      onPress={() => setShowViewAllModal(true)}
                      hitSlop={{ top: 5, right: 5, bottom: 5, left: 5 }}
                    >
                      <Text style={styles.viewAllButtonText}>View All</Text>
                    </Pressable>
                  )}
                </View>
              )}
          </View>

          <Input
            label='Password'
            placeholder='Enter your password'
            value={formData.password}
            onChangeText={text => updateFormData('password', text)}
            secureTextEntry
            error={errors.password}
            disabled={isAuthenticating || isNavigating}
            required
          />

          <View style={styles.optionsRow}>
            <Pressable
              style={styles.saveCredentialContainer}
              disabled={isAuthenticating || isNavigating}
              onPress={() => setSaveCredential(!saveCredential)}
            >
              <View
                style={[
                  styles.checkbox,
                  saveCredential && styles.checkboxChecked,
                ]}
              >
                {saveCredential && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.saveCredentialText}>Remember me?</Text>
            </Pressable>

            <Pressable
              style={styles.forgotPasswordContainer}
              disabled={isAuthenticating || isNavigating}
              onPress={() => handleNavigation('forgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>
          </View>

          <Button
            title='Login'
            onPress={handleLogin}
            loading={isAuthenticating || isNavigating}
            disabled={isAuthenticating || isNavigating}
            fullWidth
            style={styles.loginButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title='Continue as Guest'
            onPress={handleContinueAsGuest}
            disabled={isAuthenticating || isNavigating}
            fullWidth
            variant='outline'
          />

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Pressable
              disabled={isAuthenticating || isNavigating}
              onPress={() => handleNavigation('register')}
            >
              <Text style={styles.registerLink}>Sign Up</Text>
            </Pressable>
          </View>
        </Card>
      </ScrollView>

      {/* View All Credentials Modal */}
      <Modal
        visible={showViewAllModal}
        transparent={true}
        animationType='slide'
        {...(Platform.OS === 'ios' && { presentationStyle: 'pageSheet' })}
        onRequestClose={handleCloseViewAllModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCloseViewAllModal}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Accounts</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={handleCloseViewAllModal}
              >
                <X size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {savedCredentials.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No saved accounts</Text>
                </View>
              ) : (
                savedCredentials.map((credential, index) => (
                  <View
                    key={credential.id}
                    style={[
                      styles.modalAccountItem,
                      index === savedCredentials.length - 1 &&
                        styles.modalAccountItemLast,
                    ]}
                  >
                    <View style={styles.modalAccountContent}>
                      <View style={styles.modalAccountIcon}>
                        <User size={20} color={Colors.primary} />
                      </View>
                      <View style={styles.modalAccountTextContainer}>
                        <Text style={styles.modalAccountDisplayName}>
                          {credential.displayName || credential.username}
                        </Text>
                        <Text
                          style={styles.modalAccountEmail}
                          numberOfLines={1}
                        >
                          {credential.username}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.modalDeleteButton}
                      onPress={() => handleDeleteCredential(credential.id)}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <X size={18} color={Colors.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            {savedCredentials.length > 0 && (
              <View style={styles.modalFooter}>
                <Button
                  title='Clear All'
                  onPress={handleClearAllCredentials}
                  variant='outline'
                  style={styles.clearAllButton}
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  emailInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    paddingRight: 28, // Add space for close button
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  suggestionDisplayName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  suggestionEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  suggestionsCloseButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    zIndex: 10,
  },
  viewAllButton: {
    alignSelf: 'flex-end',
    padding: 2,
    paddingHorizontal: 8,
    marginRight: 4,
    marginTop: -4,
    marginBottom: 2,
  },
  viewAllButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalAccountItemLast: {
    borderBottomWidth: 0,
  },
  modalAccountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalAccountIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalAccountTextContainer: {
    flex: 1,
  },
  modalAccountDisplayName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  modalAccountEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearAllButton: {
    width: '100%',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  saveCredentialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.card,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  saveCredentialText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
});
