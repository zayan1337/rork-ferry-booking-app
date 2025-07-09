import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Card from '@/components/Card';
import Input from '@/components/Input';
import Colors from '@/constants/colors';

interface CancellationDetailsFormProps {
  reason: string;
  onReasonChange: (reason: string) => void;
  agentNotes: string;
  onAgentNotesChange: (notes: string) => void;
  clientNotification: string;
  onClientNotificationChange: (notification: string) => void;
  reasonError?: string;
  onReasonFocus?: () => void;
  onAgentNotesFocus?: () => void;
  onClientNotificationFocus?: () => void;
  inputRefs?: React.MutableRefObject<any>;
}

const CancellationDetailsForm: React.FC<CancellationDetailsFormProps> = ({
  reason,
  onReasonChange,
  agentNotes,
  onAgentNotesChange,
  clientNotification,
  onClientNotificationChange,
  reasonError,
  onReasonFocus,
  onAgentNotesFocus,
  onClientNotificationFocus,
  inputRefs,
}) => {
  return (
    <Card variant="elevated" style={styles.formCard}>
      <Text style={styles.cardTitle}>Cancellation Details</Text>

      <View
        ref={(ref) => { if (inputRefs) inputRefs.current.reason = ref; }}
      >
        <Input
          label="Reason for Cancellation"
          placeholder="Please provide a detailed reason for cancellation"
          value={reason}
          onChangeText={onReasonChange}
          onFocus={onReasonFocus}
          multiline
          numberOfLines={3}
          error={reasonError}
          required
        />
      </View>

      <View
        ref={(ref) => { if (inputRefs) inputRefs.current.agentNotes = ref; }}
      >
        <Input
          label="Agent Notes (Internal)"
          placeholder="Add any internal notes or special circumstances"
          value={agentNotes}
          onChangeText={onAgentNotesChange}
          onFocus={onAgentNotesFocus}
          multiline
          numberOfLines={2}
        />
      </View>

      <View
        ref={(ref) => { if (inputRefs) inputRefs.current.clientNotification = ref; }}
      >
        <Input
          label="Client Notification Message"
          placeholder="Optional custom message to send to client"
          value={clientNotification}
          onChangeText={onClientNotificationChange}
          onFocus={onClientNotificationFocus}
          multiline
          numberOfLines={2}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  formCard: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
});

export default CancellationDetailsForm; 