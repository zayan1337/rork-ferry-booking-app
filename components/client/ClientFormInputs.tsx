import React from 'react';
import { View, StyleSheet } from 'react-native';
import { User, Mail, Phone, CreditCard } from 'lucide-react-native';
import Input from '@/components/Input';
import Colors from '@/constants/colors';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  idNumber: string;
}

interface ClientFormErrors {
  name?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
}

interface ClientFormInputsProps {
  formData: ClientFormData;
  errors: ClientFormErrors;
  onInputChange: (field: keyof ClientFormData, value: string) => void;
}

const ClientFormInputs: React.FC<ClientFormInputsProps> = ({
  formData,
  errors,
  onInputChange,
}) => {
  return (
    <View style={styles.formSection}>
      <Input
        label="Client Name"
        placeholder="Enter full name"
        value={formData.name}
        onChangeText={(text) => onInputChange('name', text)}
        error={errors.name}
        leftIcon={<User size={20} color={Colors.textSecondary} />}
        required
      />

      <Input
        label="Email Address"
        placeholder="Enter email address"
        value={formData.email}
        onChangeText={(text) => onInputChange('email', text)}
        error={errors.email}
        leftIcon={<Mail size={20} color={Colors.textSecondary} />}
        keyboardType="email-address"
        autoCapitalize="none"
        required
      />

      <Input
        label="Phone Number"
        placeholder="Enter phone number"
        value={formData.phone}
        onChangeText={(text) => onInputChange('phone', text)}
        error={errors.phone}
        leftIcon={<Phone size={20} color={Colors.textSecondary} />}
        keyboardType="phone-pad"
        required
      />

      <Input
        label="ID Number (Optional)"
        placeholder="Enter ID number"
        value={formData.idNumber}
        onChangeText={(text) => onInputChange('idNumber', text)}
        error={errors.idNumber}
        leftIcon={<CreditCard size={20} color={Colors.textSecondary} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  formSection: {
    marginBottom: 24,
  },
});

export default ClientFormInputs; 