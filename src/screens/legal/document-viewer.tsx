/**
 * Document Viewer Screen
 * 
 * Displays legal documents (Privacy Policy, Terms of Use) in a WebView
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { applyFont } from '@/utils/apply-fonts';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface DocumentViewerProps {
  documentType: 'privacy' | 'terms';
  webUrl?: string;
}

/**
 * Get embedded Privacy Policy content
 */
function getPrivacyPolicyContent(): string {
  return `# Privacy Policy

**Last Updated: December 2024**

## 1. Introduction

Welcome to IYTE56 ("we," "our," or "us"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web platform (collectively, the "Service"). Please read this Privacy Policy carefully. By using our Service, you agree to the collection and use of information in accordance with this policy.

## 2. Information We Collect

### 2.1 Information You Provide

- **Account Information**: When you create an account, we collect your email address, username, display name, profile picture, and bio.
- **Content**: We collect the posts, comments, images, and other content you create and share on the Service.
- **Profile Data**: Information you choose to provide in your profile, including your bio and other personal information.

### 2.2 Automatically Collected Information

- **Usage Data**: We collect information about how you interact with the Service, including posts you view, like, comment on, or save.
- **Device Information**: We may collect device-specific information such as your device type, operating system, and unique device identifiers.
- **Log Data**: We collect log information when you use the Service, including your IP address, access times, and pages viewed.
- **Push Notification Tokens**: We collect Firebase Cloud Messaging (FCM) tokens to send you push notifications.

### 2.3 Third-Party Authentication

We use Firebase Authentication to manage user accounts. When you sign in, Firebase may collect authentication information in accordance with their privacy policy.

## 3. How We Use Your Information

We use the information we collect to:

- **Provide and Maintain the Service**: Create and manage your account, deliver content, and enable social features.
- **Content Moderation**: Review reported content, enforce community guidelines, and maintain a safe environment.
- **Notifications**: Send you push notifications about likes, comments, follows, and other activities.
- **Improve the Service**: Analyze usage patterns to enhance user experience and develop new features.
- **Safety and Security**: Detect, prevent, and address technical issues, fraud, and abuse.
- **Compliance**: Comply with legal obligations and enforce our Terms of Use.

## 4. Anonymous Posting

When you choose to post anonymously:

- Your identity is hidden from other users in the public interface.
- Your account information is still stored and associated with the post for moderation and safety purposes.
- We may disclose your identity to law enforcement or in response to legal requests if required by law.
- Anonymous posts are subject to the same content moderation and community guidelines as regular posts.

## 5. Information Sharing and Disclosure

We do not sell your personal information. We may share your information in the following circumstances:

### 5.1 Public Information

- Your username, display name, profile picture, bio, and posts are publicly visible to all users of the Service.
- Your follower count, following count, and post count are publicly displayed.

### 5.2 Service Providers

We may share information with third-party service providers who perform services on our behalf, including:

- **Firebase (Google)**: For authentication, database, storage, and push notifications.
- **Cloud Hosting Services**: For hosting and infrastructure.

### 5.3 Legal Requirements

We may disclose your information if required by law or in response to:

- Legal processes, such as subpoenas or court orders.
- Government requests.
- Enforcement of our Terms of Use.
- Protection of our rights, privacy, safety, or property.

### 5.4 Safety and Moderation

We may share information with moderators and administrators to:

- Review reported content.
- Investigate violations of our Terms of Use.
- Enforce community guidelines and warnings.

## 6. Data Storage and Security

- **Storage Location**: Your data is stored on Firebase servers, which may be located in various geographic regions.
- **Security Measures**: We implement technical and organizational measures to protect your information, including encryption, secure authentication, and access controls.
- **Data Retention**: We retain your information for as long as your account is active or as needed to provide the Service. You may delete your account at any time, which will remove your personal information, though some information may remain in backups for a limited period.

## 7. Your Rights and Choices

You have the following rights regarding your information:

- **Access**: You can access and update your profile information through the Service.
- **Deletion**: You can delete your account and associated content at any time through the settings.
- **Content Control**: You can edit or delete your posts and comments.
- **Notifications**: You can manage push notification preferences through your device settings.
- **Language and Theme**: You can customize your language and theme preferences.

## 8. Children's Privacy

Our Service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.

## 9. International Users

If you are using the Service from outside the country where our servers are located, your information may be transferred across international borders. By using the Service, you consent to the transfer of your information to countries that may have different data protection laws than your country of residence.

## 10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes.

## 11. Contact Us

If you have any questions about this Privacy Policy, please contact us at:

- **Email**: [Your Contact Email]
- **App**: IYTE56 Settings > Contact Support

---

**By using IYTE56, you acknowledge that you have read and understood this Privacy Policy and agree to be bound by its terms.**`;
}

/**
 * Get embedded Terms of Use content
 */
function getTermsOfUseContent(): string {
  return `# Terms of Use

**Last Updated: December 2024**

## 1. Acceptance of Terms

By accessing or using IYTE56 ("the Service"), you agree to be bound by these Terms of Use ("Terms"). If you do not agree to these Terms, you may not use the Service. We reserve the right to modify these Terms at any time, and such modifications shall be effective immediately upon posting.

## 2. Description of Service

IYTE56 is a social media platform that allows users to:

- Create and share posts (up to 280 characters)
- Upload and share images
- Comment on and reply to posts
- Like and save posts
- Follow other users
- Post anonymously (with identity hidden from other users)
- Receive notifications about interactions

## 3. User Accounts

### 3.1 Account Creation

- You must be at least 13 years old to create an account.
- You must provide accurate, current, and complete information during registration.
- You are responsible for maintaining the confidentiality of your account credentials.
- You are responsible for all activities that occur under your account.

### 3.2 Account Security

- You must immediately notify us of any unauthorized use of your account.
- We are not liable for any loss or damage arising from your failure to protect your account.

## 4. User Conduct and Content

### 4.1 Acceptable Use

You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:

- Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable.
- Post content that infringes on intellectual property rights, privacy rights, or other rights of others.
- Post spam, unsolicited advertising, or promotional content.
- Impersonate any person or entity or falsely state or misrepresent your affiliation with any person or entity.
- Post content that contains viruses, malware, or other harmful code.
- Engage in any activity that disrupts or interferes with the Service or servers.
- Collect or harvest information about other users without their consent.
- Use automated systems (bots, scrapers) to access the Service without permission.

### 4.2 Content Ownership

- You retain ownership of the content you post on the Service.
- By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute your content on the Service.
- You represent and warrant that you have the right to post the content and grant us the license described above.

### 4.3 Anonymous Posting

- When posting anonymously, your identity is hidden from other users but remains associated with your account for moderation purposes.
- Anonymous posts are subject to the same content guidelines and moderation as regular posts.
- You are still responsible for anonymous content posted from your account.

## 5. Content Moderation

### 5.1 Moderation System

- All content is subject to review and moderation.
- We reserve the right to remove, edit, or hide any content that violates these Terms.
- We use automated systems and human moderators to review content.

### 5.2 Reporting Content

- Users can report content that violates these Terms.
- Reports are reviewed by moderators, who may take action including content removal, warnings, or account suspension.

### 5.3 Warning System

- Users who violate these Terms may receive warnings.
- After 3 warnings, an account may be permanently banned.
- Warnings are issued for violations including but not limited to:
  - Harassment or hate speech
  - Spam or misleading content
  - Impersonation
  - Copyright infringement
  - Other violations of these Terms

### 5.4 Account Suspension and Termination

We reserve the right to suspend or terminate your account at any time, with or without notice, for:

- Violation of these Terms
- Receiving 3 or more warnings
- Engaging in illegal activity
- Any other reason we deem necessary to protect the Service or its users

## 6. Intellectual Property

### 6.1 Our Intellectual Property

- The Service, including its design, features, and functionality, is owned by us and protected by copyright, trademark, and other intellectual property laws.
- You may not copy, modify, distribute, or create derivative works based on the Service without our permission.

### 6.2 User Content

- You retain ownership of content you post.
- You grant us a license to use your content as described in Section 4.2.

## 7. Privacy

Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect, use, and protect your information.

## 8. Disclaimers and Limitations of Liability

### 8.1 Service Availability

- We do not guarantee that the Service will be available at all times or free from errors, interruptions, or security breaches.
- We reserve the right to modify, suspend, or discontinue the Service at any time.

### 8.2 Content Accuracy

- We do not endorse, support, or verify the accuracy of user-generated content.
- You use the Service and content at your own risk.

### 8.3 Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE.

## 9. Indemnification

You agree to indemnify and hold us harmless from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from:

- Your use of the Service
- Your violation of these Terms
- Your violation of any rights of another user or third party
- Content you post on the Service

## 10. Third-Party Services

The Service may integrate with third-party services (such as Firebase). Your use of these services is subject to their respective terms and privacy policies.

## 11. Changes to Terms

We may modify these Terms at any time. We will notify users of material changes by:

- Posting the updated Terms on the Service
- Updating the "Last Updated" date
- Sending notifications through the Service (if applicable)

Your continued use of the Service after changes are posted constitutes acceptance of the modified Terms.

## 12. Termination

- You may terminate your account at any time through the Service settings.
- We may terminate or suspend your account immediately, without prior notice, for any violation of these Terms.
- Upon termination, your right to use the Service will cease immediately.

## 13. Governing Law

These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.

## 14. Dispute Resolution

Any disputes arising out of or relating to these Terms or the Service shall be resolved through [arbitration/mediation/courts] in [Your Jurisdiction].

## 15. Severability

If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall remain in full force and effect.

## 16. Contact Information

If you have any questions about these Terms, please contact us at:

- **Email**: [Your Contact Email]
- **App**: IYTE56 Settings > Contact Support

## 17. Acknowledgment

By using IYTE56, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use.

---

**Last Updated: December 2024**`;
}

/**
 * Convert markdown to HTML with basic styling
 */
function markdownToHtml(markdown: string, isDark: boolean): string {
  const bgColor = isDark ? '#000000' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#000000';
  const borderColor = isDark ? '#333333' : '#e5e5e5';
  
  // Escape HTML
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headers (must be done before other replacements)
  html = html
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  
  // Lists - handle nested lists better
  const lines = html.split('\n');
  let inList = false;
  let result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('- ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.substring(2)}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line && !line.startsWith('<h')) {
        result.push(`<p>${line}</p>`);
      } else if (line) {
        result.push(line);
      }
    }
  }
  
  if (inList) {
    result.push('</ul>');
  }
  
  html = result.join('\n');
  
  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/gim, '');
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: ${bgColor};
            color: ${textColor};
            padding: 20px;
            line-height: 1.6;
            font-size: 16px;
          }
          h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 24px 0 16px 0;
            color: ${textColor};
          }
          h2 {
            font-size: 22px;
            font-weight: 600;
            margin: 20px 0 12px 0;
            color: ${textColor};
          }
          h3 {
            font-size: 18px;
            font-weight: 600;
            margin: 16px 0 8px 0;
            color: ${textColor};
          }
          p {
            margin: 12px 0;
            color: ${textColor};
          }
          ul {
            margin: 12px 0 12px 20px;
          }
          li {
            margin: 8px 0;
            color: ${textColor};
          }
          strong {
            font-weight: 600;
          }
          hr {
            border: none;
            border-top: 1px solid ${borderColor};
            margin: 24px 0;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;
}

export function DocumentViewerScreen({ documentType, webUrl }: DocumentViewerProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const router = useRouter();
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const isDark = colors.background === '#000000' || colors.background === '#0a0a0a';

  useEffect(() => {
    const loadDocument = async () => {
      try {
        // If webUrl is provided, use webview to load from web project
        if (webUrl) {
          setLoading(false);
          return; // Will render WebView with URL
        }
        
        // Try to load from GitHub raw content first
        const fileName = documentType === 'privacy' ? 'PRIVACY_POLICY.md' : 'TERMS_OF_USE.md';
        const githubUrl = `https://raw.githubusercontent.com/erentetk/iyte-56/main/${fileName}`;
        
        const response = await fetch(githubUrl);
        
        if (response.ok) {
          const text = await response.text();
          setHtmlContent(markdownToHtml(text, isDark));
        } else {
          // Fallback: Use embedded content
          const embeddedContent = documentType === 'privacy' 
            ? getPrivacyPolicyContent()
            : getTermsOfUseContent();
          setHtmlContent(markdownToHtml(embeddedContent, isDark));
        }
      } catch (error) {
        console.error('Error loading document:', error);
        // Fallback: Use embedded content
        const embeddedContent = documentType === 'privacy' 
          ? getPrivacyPolicyContent()
          : getTermsOfUseContent();
        setHtmlContent(markdownToHtml(embeddedContent, isDark));
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentType, isDark, webUrl]);

  const title = documentType === 'privacy' 
    ? t('settings.privacyPolicy') 
    : t('settings.termsOfUse');

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.neutral[6],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={colors.neutral[12]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>
          {title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.orange[9]} />
        </View>
      ) : webUrl ? (
        <WebView
          source={{ uri: webUrl }}
          style={[styles.webview, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.orange[9]} />
            </View>
          )}
        />
      ) : (
        <WebView
          source={{ html: htmlContent }}
          style={[styles.webview, { backgroundColor: colors.background }]}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...applyFont({
      fontSize: 18,
      fontWeight: '600',
    }),
  },
  placeholder: {
    width: 32,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

