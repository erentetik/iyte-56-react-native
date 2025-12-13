/**
 * Warnings Service
 * 
 * Handle user warning operations.
 */

import { db } from '@/config/firebase';
import { WarningTextDocument } from '@/types/firestore';
import { doc, getDoc } from 'firebase/firestore';

// ============================================================================
// WARNING QUERIES
// ============================================================================

/**
 * Get warning text for a user by warning ID
 * Path: users/{userId}/warningTexts/{warningId}
 */
export async function getWarningText(
  userId: string,
  warningId: number
): Promise<WarningTextDocument | null> {
  const warningRef = doc(db, 'users', userId, 'warningTexts', warningId.toString());
  const warningSnap = await getDoc(warningRef);
  
  if (!warningSnap.exists()) {
    return null;
  }
  
  const data = warningSnap.data();
  return {
    id: data.id || warningId,
    message: data.message || '',
  } as WarningTextDocument;
}

/**
 * Check if user has pending warnings to show
 * Returns the warning ID that needs to be shown, or null if none
 */
export function getPendingWarningId(
  warningCount: number | undefined,
  warningShowed: number | undefined
): number | null {
  // If no warning count, no warnings
  if (!warningCount || warningCount === 0) {
    return null;
  }
  
  // If warningShowed is undefined or less than warningCount, there are pending warnings
  const showed = warningShowed ?? 0;
  
  if (showed < warningCount) {
    // Return the next warning ID to show (should be showed + 1, but must match warningCount)
    // According to requirements: warning count should be same with warningId.id
    // So if warningCount is 1, we show warning with id 1
    return warningCount;
  }
  
  return null;
}
