import { useState } from 'react';

export function useSettingsModals() {
  const [showTwoFactorSetupModal, setShowTwoFactorSetupModal] = useState(false);
  const [showTwoFactorDisableModal, setShowTwoFactorDisableModal] = useState(false);

  const openTwoFactorSetup = () => setShowTwoFactorSetupModal(true);
  const closeTwoFactorSetup = () => setShowTwoFactorSetupModal(false);
  
  const openTwoFactorDisable = () => setShowTwoFactorDisableModal(true);
  const closeTwoFactorDisable = () => setShowTwoFactorDisableModal(false);

  return {
    // Two-Factor Authentication Modals
    showTwoFactorSetupModal,
    showTwoFactorDisableModal,
    openTwoFactorSetup,
    closeTwoFactorSetup,
    openTwoFactorDisable,
    closeTwoFactorDisable
  };
} 