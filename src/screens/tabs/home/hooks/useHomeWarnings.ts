import { useWarning } from '@/contexts/WarningContext';
import { getPendingWarningId, getWarningText } from '@/services/warnings';
import { useEffect, useState } from 'react';

export function useHomeWarnings(userId: string | undefined, userProfile: any) {
  const { pendingWarning, setPendingWarning } = useWarning();
  const [warningModalVisible, setWarningModalVisible] = useState(false);
  const [warningJustClosed, setWarningJustClosed] = useState(false);

  // Check for warnings if not already set (fallback check in home screen)
  useEffect(() => {
    const checkWarnings = async () => {
      // Don't check if warning was just closed or if there's already a pending warning
      if (!userProfile || !userId || pendingWarning || warningJustClosed) {
        return;
      }
      
      try {
        const pendingWarningId = getPendingWarningId(
          userProfile.warningCount,
          userProfile.warningShowed
        );
        
        if (pendingWarningId) {
          const warningText = await getWarningText(userId, pendingWarningId);
          if (warningText) {
            setPendingWarning(warningText);
          }
        }
      } catch (error) {
        console.error('Error checking warnings:', error);
      }
    };
    
    if (userProfile) {
      checkWarnings();
    }
  }, [userProfile, userId, pendingWarning, warningJustClosed, setPendingWarning]);

  // Show warning modal if there's a pending warning
  useEffect(() => {
    if (pendingWarning && userId) {
      setWarningModalVisible(true);
    }
  }, [pendingWarning, userId]);

  return {
    warningModalVisible,
    setWarningModalVisible,
    warningJustClosed,
    setWarningJustClosed,
  };
}

