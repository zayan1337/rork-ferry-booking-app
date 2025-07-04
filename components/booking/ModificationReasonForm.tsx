import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import Colors from '@/constants/colors';

interface ModificationReasonFormProps {
  modificationReason: string;
  onReasonChange: (reason: string) => void;
  agentNotes: string;
  onNotesChange: (notes: string) => void;
  reasonError?: string;
  onReasonFocus?: () => void;
  onNotesFocus?: () => void;
  ticketLabel: string;
  inputRefs?: React.MutableRefObject<any>;
}

const ModificationReasonForm: React.FC<ModificationReasonFormProps> = ({
  modificationReason,
  onReasonChange,
  agentNotes,
  onNotesChange,
  reasonError,
  onReasonFocus,
  onNotesFocus,
  ticketLabel,
  inputRefs,
}) => {
  return (
    <>
      {/* Modification Reason */}
      <View
        ref={(el) => {
          if (inputRefs) inputRefs.current.reason = el;
        }}
        style={styles.reasonContainer}
      >
        <Text style={styles.reasonLabel}>Reason for Modification *</Text>
        <View style={styles.reasonInput}>
          <TextInput
            style={styles.reasonTextInput}
            placeholder={`Please provide a reason for modifying this ${ticketLabel.toLowerCase()} ticket`}
            value={modificationReason}
            onChangeText={onReasonChange}
            onFocus={onReasonFocus}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        {reasonError ? (
          <Text style={styles.errorText}>{reasonError}</Text>
        ) : null}
      </View>

      {/* Agent Notes */}
      <View
        ref={(el) => {
          if (inputRefs) inputRefs.current.agentNotes = el;
        }}
        style={styles.reasonContainer}
      >
        <Text style={styles.reasonLabel}>Agent Notes (Optional)</Text>
        <View style={styles.reasonInput}>
          <TextInput
            style={styles.reasonTextInput}
            placeholder="Add any internal notes about this modification"
            value={agentNotes}
            onChangeText={onNotesChange}
            onFocus={onNotesFocus}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  reasonContainer: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  reasonTextInput: {
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 80,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: 4,
  },
});

export default ModificationReasonForm; 