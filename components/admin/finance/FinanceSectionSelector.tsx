import React, { memo } from 'react';
import { CreditCard, Wallet } from 'lucide-react-native';
import { TabSelector } from '@/components/admin/common';

type FinanceSection = 'payments' | 'wallets';

interface FinanceSectionSelectorProps {
  activeSection: FinanceSection;
  onSectionChange: (section: FinanceSection) => void;
  canViewPayments: boolean;
  canViewWallets: boolean;
}

function FinanceSectionSelector({
  activeSection,
  onSectionChange,
  canViewPayments,
  canViewWallets,
}: FinanceSectionSelectorProps) {
  const sections = [
    {
      key: 'payments',
      label: 'Payments',
      icon: CreditCard,
      permission: canViewPayments,
    },
    {
      key: 'wallets',
      label: 'Wallets',
      icon: Wallet,
      permission: canViewWallets,
    },
  ].filter(section => section.permission);

  const tabOptions = sections.map(section => ({
    key: section.key,
    label: section.label,
    icon: section.icon,
  }));

  const handleSectionChange = (tab: string) => {
    onSectionChange(tab as FinanceSection);
  };

  return (
    <TabSelector
      options={tabOptions}
      activeTab={activeSection}
      onTabChange={handleSectionChange}
      variant='cards'
      showIcons={true}
    />
  );
}

export default memo(FinanceSectionSelector);
