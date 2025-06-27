import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Bell,
  LogOut,
  ChevronRight
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import Colors from '@/constants/colors';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function ProfileScreen() {
  const { user, signOut, isLoading, error } = useAuthStore();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }

  }, [error]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please log in to view your profile</Text>
      </View>
    );
  }

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)');
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleExportCSV = () => {
    Alert.alert(
      "Export Data",
      "Your data will be exported as CSV and sent to your email address.",
      [{ text: "OK" }]
    );
  };

  const handleExportPDF = () => {
    Alert.alert(
      "Export Data",
      "Your data will be exported as PDF and sent to your email address.",
      [{ text: "OK" }]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileInitials}>
            {user?.profile?.full_name
              ? user?.profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
              : '?'}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.profile?.full_name || 'Guest User'}</Text>
        <Text style={styles.profileUsername}>{user?.email || 'guest@example.com'}</Text>
      </View>

      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <User size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user?.profile?.full_name}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Mail size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Phone size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Mobile Number</Text>
            <Text style={styles.infoValue}>{user?.profile?.mobile_number}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </View>

        <View style={styles.infoItem}>
          <View style={styles.infoIcon}>
            <Calendar size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>{formatDate(user?.profile?.date_of_birth || '')}</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </View>
      </Card>

      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Lock size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Change Password</Text>
          </View>
          <ChevronRight size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
          </View>
          <Switch
            value={emailNotifications}
            onValueChange={setEmailNotifications}
            trackColor={{ false: Colors.inactive, true: Colors.primary }}
            thumbColor={Colors.card}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingIcon}>
            <Bell size={20} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>SMS Notifications</Text>
          </View>
          <Switch
            value={smsNotifications}
            onValueChange={setSmsNotifications}
            trackColor={{ false: Colors.inactive, true: Colors.primary }}
            thumbColor={Colors.card}
          />
        </View>
      </Card>

      <Card variant="elevated" style={styles.section}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <Text style={styles.exportText}>
          Download your booking history and personal information
        </Text>
        <View style={styles.exportButtons}>
          <Button
            title="Export as CSV"
            variant="outline"
            size="small"
            style={styles.exportButton}
            onPress={handleExportCSV}
          />
          <Button
            title="Export as PDF"
            variant="outline"
            size="small"
            style={styles.exportButton}
            onPress={handleExportPDF}
          />
        </View>
      </Card>

      <Button
        title="Logout"
        variant="outline"
        onPress={handleLogout}
        style={styles.logoutButton}
        textStyle={styles.logoutButtonText}
        fullWidth
      />
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.card,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIcon: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: Colors.text,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingIcon: {
    width: 40,
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  exportText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  exportButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  logoutButton: {
    marginTop: 8,
    borderColor: Colors.error,
  },
  logoutButtonText: {
    color: Colors.error,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
  },
});