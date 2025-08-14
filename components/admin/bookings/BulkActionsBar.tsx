import React from 'react';
import { ActionBar, ActionBarAction } from '@/components/admin/common';

interface BulkActionsBarProps {
  selectedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  onClear: () => void;
  canUpdateBookings: boolean;
}

export default function BulkActionsBar({
  selectedCount,
  onConfirm,
  onCancel,
  onClear,
  canUpdateBookings,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const actions: ActionBarAction[] = [];

  if (canUpdateBookings) {
    actions.push(
      {
        title: 'Confirm',
        variant: 'primary',
        onPress: onConfirm,
      },
      {
        title: 'Cancel',
        variant: 'danger',
        onPress: onCancel,
      }
    );
  }

  actions.push({
    title: 'Clear',
    variant: 'ghost',
    onPress: onClear,
  });

  const message = `${selectedCount} booking${selectedCount !== 1 ? 's' : ''} selected`;

  return <ActionBar message={message} actions={actions} variant='primary' />;
}
