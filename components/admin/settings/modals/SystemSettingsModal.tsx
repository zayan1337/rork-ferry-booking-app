import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  Switch,
  Keyboard,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors } from '@/constants/adminColors';
import { SystemSettings } from '@/types/settings';
import Button from '@/components/admin/Button';
import Input from '@/components/Input';
import { styles } from '../styles';

interface SystemSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  tempSettings: SystemSettings;
  setTempSettings: (settings: SystemSettings) => void;
  onSave: () => void;
}

export default function SystemSettingsModal({
  visible,
  onClose,
  tempSettings,
  setTempSettings,
  onSave,
}: SystemSettingsModalProps) {
  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType='slide'
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>System Settings</Text>
            <Pressable onPress={handleClose}>
              <X size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>General Settings</Text>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Maintenance Mode</Text>
                <Switch
                  value={tempSettings.maintenance_mode || false}
                  onValueChange={value =>
                    setTempSettings({
                      ...tempSettings,
                      maintenance_mode: value,
                    })
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Auto Backup</Text>
                <Switch
                  value={tempSettings.auto_backup || false}
                  onValueChange={value =>
                    setTempSettings({ ...tempSettings, auto_backup: value })
                  }
                />
              </View>
            </View>

            <View style={styles.settingSection}>
              <Text style={styles.settingSectionTitle}>Security Settings</Text>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>
                  Two-Factor Authentication
                </Text>
                <Switch
                  value={tempSettings.two_factor_auth || false}
                  onValueChange={value =>
                    setTempSettings({ ...tempSettings, two_factor_auth: value })
                  }
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>
                  Session Timeout (minutes)
                </Text>
                <Input
                  value={(tempSettings.session_timeout || 30).toString()}
                  onChangeText={value =>
                    setTempSettings({
                      ...tempSettings,
                      session_timeout: parseInt(value) || 30,
                    })
                  }
                  keyboardType='numeric'
                  placeholder='30'
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button title='Cancel' variant='ghost' onPress={handleClose} />
            <Button title='Save Settings' variant='primary' onPress={onSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
