import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/adminColors';
import { useAlertContext } from '@/components/AlertProvider';
import { supabase } from '@/utils/supabase';
import { useFinanceStore } from '@/store/admin/financeStore';
import {
  User,
  Search,
  Wallet as WalletIcon,
  DollarSign,
  Check,
  X,
  AlertCircle,
} from 'lucide-react-native';

interface UserOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
  existing_wallet?: boolean;
}

interface FormData {
  user_id: string;
  initial_balance: string;
  currency: string;
}

interface FormErrors {
  user_id?: string;
  initial_balance?: string;
  currency?: string;
}

export default function WalletCreationForm() {
  const { createWallet, fetchWallets } = useFinanceStore();
  const { showError, showSuccess, showInfo } = useAlertContext();

  const [formData, setFormData] = useState<FormData>({
    user_id: '',
    initial_balance: '0',
    currency: 'MVR',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // User search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const currencies = ['MVR', 'USD', 'EUR', 'GBP'];

  // Search users
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUserOptions([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Check which users already have wallets
      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        const { data: existingWallets } = await supabase
          .from('wallets')
          .select('user_id')
          .in('user_id', userIds);

        const walletUserIds = new Set(
          existingWallets?.map(w => w.user_id) || []
        );

        const usersWithWalletStatus = users.map(user => ({
          ...user,
          existing_wallet: walletUserIds.has(user.id),
        }));

        setUserOptions(usersWithWalletStatus);
      } else {
        setUserOptions([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      showError('Error', 'Failed to search users. Please try again.');
      setUserOptions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUserSearchChange = (text: string) => {
    setSearchQuery(text);
    setShowUserDropdown(true);

    // Debounce search
    const timeoutId = setTimeout(() => {
      searchUsers(text);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSelectUser = (user: UserOption) => {
    if (user.existing_wallet) {
      showInfo(
        'Wallet Exists',
        `${user.full_name} already has a wallet. Each user can only have one wallet.`
      );
      return;
    }

    setSelectedUser(user);
    setFormData({ ...formData, user_id: user.id });
    setSearchQuery(user.full_name);
    setShowUserDropdown(false);
    setErrors({ ...errors, user_id: undefined });
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setFormData({ ...formData, user_id: '' });
    setSearchQuery('');
    setUserOptions([]);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Please select a user';
    }

    const balance = parseFloat(formData.initial_balance);
    if (isNaN(balance) || balance < 0) {
      newErrors.initial_balance = 'Please enter a valid balance (0 or greater)';
    }

    if (!formData.currency) {
      newErrors.currency = 'Please select a currency';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedBalance = parseFloat(formData.initial_balance);

      const walletData = {
        user_id: formData.user_id,
        initial_balance: parsedBalance,
        currency: formData.currency,
      };

      await createWallet(walletData);

      // Refresh the wallets list to ensure the new wallet appears
      await fetchWallets(true);

      showSuccess(
        'Success!',
        `Wallet created successfully for ${selectedUser?.full_name}!`,
        () => router.back()
      );
    } catch (error) {
      console.error('❌ [WalletCreationForm] Error creating wallet:', error);
      showError(
        'Error',
        error instanceof Error
          ? error.message
          : 'Failed to create wallet. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const renderUserOption = ({ item }: { item: UserOption }) => (
    <Pressable
      style={[
        styles.userOption,
        item.existing_wallet && styles.userOptionDisabled,
      ]}
      onPress={() => handleSelectUser(item)}
      disabled={item.existing_wallet}
    >
      <View style={styles.userOptionIcon}>
        <User
          size={20}
          color={item.existing_wallet ? colors.textSecondary : colors.primary}
        />
      </View>
      <View style={styles.userOptionInfo}>
        <Text
          style={[
            styles.userOptionName,
            item.existing_wallet && styles.userOptionNameDisabled,
          ]}
        >
          {item.full_name}
        </Text>
        <Text style={styles.userOptionEmail}>{item.email}</Text>
        <View style={styles.userOptionBadge}>
          <Text style={styles.userOptionRole}>{item.role.toUpperCase()}</Text>
          {item.existing_wallet && (
            <Text style={styles.walletExistsText}>• Wallet Exists</Text>
          )}
        </View>
      </View>
      {!item.existing_wallet && <Check size={20} color={colors.success} />}
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps='handled'>
      <View style={styles.formContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <WalletIcon size={32} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Create New Wallet</Text>
          <Text style={styles.headerSubtitle}>
            Set up a wallet for a user to manage their balance
          </Text>
        </View>

        {/* User Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Select User <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder='Search by name or email...'
                value={searchQuery}
                onChangeText={handleUserSearchChange}
                onFocus={() => setShowUserDropdown(true)}
                editable={!selectedUser}
              />
              {isSearching && (
                <ActivityIndicator size='small' color={colors.primary} />
              )}
              {selectedUser && (
                <Pressable onPress={handleClearUser}>
                  <X size={20} color={colors.danger} />
                </Pressable>
              )}
            </View>
            {errors.user_id && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.errorText}>{errors.user_id}</Text>
              </View>
            )}
          </View>

          {/* Selected User Display */}
          {selectedUser && (
            <View style={styles.selectedUserCard}>
              <User size={24} color={colors.primary} />
              <View style={styles.selectedUserInfo}>
                <Text style={styles.selectedUserName}>
                  {selectedUser.full_name}
                </Text>
                <Text style={styles.selectedUserEmail}>
                  {selectedUser.email}
                </Text>
              </View>
              <View style={styles.selectedUserBadge}>
                <Text style={styles.selectedUserRole}>
                  {selectedUser.role.toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {/* User Dropdown */}
          {showUserDropdown && userOptions.length > 0 && !selectedUser && (
            <View style={styles.dropdown}>
              <FlatList
                data={userOptions}
                renderItem={renderUserOption}
                keyExtractor={item => item.id}
                scrollEnabled={false}
                style={styles.dropdownList}
              />
            </View>
          )}
        </View>

        {/* Initial Balance */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Initial Balance</Text>
          <View style={styles.inputContainer}>
            <DollarSign size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder='0.00'
              value={formData.initial_balance}
              onChangeText={text =>
                setFormData({ ...formData, initial_balance: text })
              }
              keyboardType='decimal-pad'
            />
          </View>
          {errors.initial_balance && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errors.initial_balance}</Text>
            </View>
          )}
          <Text style={styles.helperText}>
            Starting balance for the wallet (can be 0)
          </Text>
        </View>

        {/* Currency */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Currency <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.currencyContainer}>
            {currencies.map(currency => (
              <Pressable
                key={currency}
                style={[
                  styles.currencyButton,
                  formData.currency === currency && styles.currencyButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, currency })}
              >
                <Text
                  style={[
                    styles.currencyButtonText,
                    formData.currency === currency &&
                      styles.currencyButtonTextActive,
                  ]}
                >
                  {currency}
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.currency && (
            <View style={styles.errorContainer}>
              <AlertCircle size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errors.currency}</Text>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <AlertCircle size={20} color={colors.info} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Notes:</Text>
            <Text style={styles.infoText}>
              • Each user can only have one wallet{'\n'}• Users with existing
              wallets will be marked{'\n'}• Initial balance can be adjusted
              later{'\n'}• Wallet will be immediately active
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isSubmitting}
          >
            <X size={20} color={colors.textSecondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <>
                <Check size={20} color={colors.white} />
                <Text style={styles.submitButtonText}>Create Wallet</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  formContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.danger,
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  selectedUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 12,
  },
  selectedUserInfo: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  selectedUserEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectedUserBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedUserRole: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 300,
  },
  dropdownList: {
    maxHeight: 300,
  },
  userOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  userOptionDisabled: {
    opacity: 0.5,
  },
  userOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userOptionInfo: {
    flex: 1,
  },
  userOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  userOptionNameDisabled: {
    color: colors.textSecondary,
  },
  userOptionEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userOptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userOptionRole: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  walletExistsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
  currencyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  currencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  currencyButtonTextActive: {
    color: colors.white,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.info + '30',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
} as any);
