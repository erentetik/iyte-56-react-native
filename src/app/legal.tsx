/**
 * Legal Documents Route
 * 
 * Route handler for displaying Privacy Policy and Terms of Use
 */

import { DocumentViewerScreen } from '@/screens/legal/document-viewer';
import { useLocalSearchParams } from 'expo-router';

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: 'privacy' | 'terms' }>();
  
  return <DocumentViewerScreen documentType={type || 'privacy'} />;
}

