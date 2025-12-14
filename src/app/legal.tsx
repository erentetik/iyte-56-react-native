/**
 * Legal Documents Route
 * 
 * Route handler for displaying Privacy Policy and Terms of Use
 * Supports both embedded content and webview URLs
 */

import { DocumentViewerScreen } from '@/screens/legal/document-viewer';
import { useLocalSearchParams } from 'expo-router';

export default function LegalScreen() {
  const { type, url } = useLocalSearchParams<{ type: 'privacy' | 'terms'; url?: string }>();
  
  return <DocumentViewerScreen documentType={type || 'privacy'} webUrl={url} />;
}

