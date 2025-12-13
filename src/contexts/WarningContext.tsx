import { WarningTextDocument } from '@/types/firestore';
import React, { ReactNode, createContext, useContext, useState } from 'react';

interface WarningContextType {
  pendingWarning: WarningTextDocument | null;
  setPendingWarning: (warning: WarningTextDocument | null) => void;
  clearPendingWarning: () => void;
}

const WarningContext = createContext<WarningContextType | undefined>(undefined);

export function WarningProvider({ children }: { children: ReactNode }) {
  const [pendingWarning, setPendingWarning] = useState<WarningTextDocument | null>(null);

  const clearPendingWarning = () => {
    setPendingWarning(null);
  };

  const value = {
    pendingWarning,
    setPendingWarning,
    clearPendingWarning,
  };

  return <WarningContext.Provider value={value}>{children}</WarningContext.Provider>;
}

export function useWarning() {
  const context = useContext(WarningContext);
  if (context === undefined) {
    throw new Error('useWarning must be used within a WarningProvider');
  }
  return context;
}
