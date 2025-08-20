import { useState } from 'react';

export function useSettingsModals() {
  const [showSystemModal, setShowSystemModal] = useState(false);

  return {
    showSystemModal,
    setShowSystemModal,
  };
}
