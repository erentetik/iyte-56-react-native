/**
 * Settings Screen
 * 
 * App settings with sign out and edit profile options.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { Language, useLanguage } from '@/contexts/LanguageContext';
import { ThemeMode, useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/hooks/queries/use-user';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { getBlockedUsersCount, unblockAllUsers } from '@/services/users';
import { applyFont } from '@/utils/apply-fonts';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  showArrow?: boolean;
  value?: string;
}

function SettingsItem({ icon, label, onPress, color, showArrow = true, value }: SettingsItemProps) {
  const colors = useThemeColors();
  
  return (
    <TouchableOpacity
      style={[styles.settingsItem, { borderBottomColor: colors.neutral[6] }]}
      onPress={onPress}
    >
      <View style={styles.settingsItemLeft}>
        <IconSymbol name={icon as any} size={22} color={color || colors.neutral[12]} />
        <Text style={[styles.settingsItemLabel, { color: color || colors.neutral[12] }]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingsItemRight}>
        {value && (
          <Text style={[styles.settingsItemValue, { color: colors.neutral[9] }]}>
            {value}
          </Text>
        )}
        {showArrow && (
          <IconSymbol name="chevron.right" size={18} color={colors.neutral[8]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  tr: 'Türkçe',
};

const THEME_NAMES: Record<ThemeMode, { en: string; tr: string }> = {
  system: { en: 'System', tr: 'Sistem' },
  light: { en: 'Light', tr: 'Açık' },
  dark: { en: 'Dark', tr: 'Koyu' },
};

export function SettingsScreen() {
  const colors = useThemeColors();
  const { t, language, setLanguage } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const { signOut, deleteAccount, user } = useAuth();
  const router = useRouter();
  const { data: userProfile } = useUser(user?.uid);
  const [blockedCount, setBlockedCount] = useState<number | null>(null);

  const handleSignOut = () => {
    Alert.alert(
      t('tabs.profile.signOutConfirm'),
      t('tabs.profile.signOutMessage'),
      [
        { text: t('tabs.profile.cancel'), style: 'cancel' },
        {
          text: t('tabs.profile.signOut'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch {
              Alert.alert(t('common.error'), t('tabs.profile.signOutError'));
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleOpenAppSettings = async () => {
    await Linking.openSettings();
  };

  const handleLanguageChange = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), 'English', 'Türkçe'],
          cancelButtonIndex: 0,
          title: t('settings.selectLanguage'),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setLanguage('en');
          } else if (buttonIndex === 2) {
            setLanguage('tr');
          }
        }
      );
    } else {
      // Android - use Alert
      Alert.alert(
        t('settings.selectLanguage'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('languages.english'), onPress: () => setLanguage('en') },
          { text: t('languages.turkish'), onPress: () => setLanguage('tr') },
        ]
      );
    }
  };

  const handleThemeChange = () => {
    const themeOptions = [
      THEME_NAMES.system[language],
      THEME_NAMES.light[language],
      THEME_NAMES.dark[language],
    ];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common.cancel'), ...themeOptions],
          cancelButtonIndex: 0,
          title: t('settings.selectTheme'),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            setThemeMode('system');
          } else if (buttonIndex === 2) {
            setThemeMode('light');
          } else if (buttonIndex === 3) {
            setThemeMode('dark');
          }
        }
      );
    } else {
      // Android - use Alert
      Alert.alert(
        t('settings.selectTheme'),
        undefined,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: themeOptions[0], onPress: () => setThemeMode('system') },
          { text: themeOptions[1], onPress: () => setThemeMode('light') },
          { text: themeOptions[2], onPress: () => setThemeMode('dark') },
        ]
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccountConfirm'),
      t('settings.deleteAccountMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              // User will be automatically signed out after account deletion
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.deleteAccountError'));
            }
          },
        },
      ]
    );
  };

  // Load blocked users count on mount
  React.useEffect(() => {
    const loadBlockedCount = async () => {
      if (user?.uid) {
        try {
          const count = await getBlockedUsersCount(user.uid);
          setBlockedCount(count);
        } catch (error) {
          console.error('Error loading blocked users count:', error);
        }
      }
    };
    loadBlockedCount();
  }, [user?.uid, userProfile?.blockedUsers]);

  // Update count when userProfile changes
  React.useEffect(() => {
    if (userProfile?.blockedUsers) {
      setBlockedCount(userProfile.blockedUsers.length);
    } else {
      setBlockedCount(0);
    }
  }, [userProfile?.blockedUsers]);

  const handleUnblockAll = () => {
    if (!user?.uid) return;
    
    const count = blockedCount || 0;
    if (count === 0) {
      Alert.alert(t('settings.noBlockedUsers'), t('settings.noBlockedUsersMessage'));
      return;
    }

    Alert.alert(
      t('settings.unblockAllConfirm'),
      t('settings.unblockAllMessage').replace('{{count}}', count.toString()),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.unblockAll'),
          onPress: async () => {
            try {
              await unblockAllUsers(user.uid);
              setBlockedCount(0);
              Alert.alert(t('common.success'), t('settings.unblockAllSuccess'));
            } catch (error) {
              Alert.alert(t('common.error'), t('settings.unblockAllError'));
            }
          },
        },
      ]
    );
  };

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
          {t('settings.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.neutral[9] }]}>
            {t('settings.account')}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.neutral[2] }]}>
            <SettingsItem
              icon="person.fill"
              label={t('settings.editProfile')}
              onPress={handleEditProfile}
            />
          </View>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.neutral[9] }]}>
            {t('settings.app')}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.neutral[2] }]}>
            <SettingsItem
              icon="globe"
              label={t('settings.language')}
              onPress={handleLanguageChange}
              value={LANGUAGE_NAMES[language]}
            />
            <SettingsItem
              icon="moon.fill"
              label={t('settings.theme')}
              onPress={handleThemeChange}
              value={THEME_NAMES[themeMode][language]}
            />
          </View>
        </View>

        {/* Blocked Users Section */}
        {blockedCount !== null && blockedCount > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.neutral[9] }]}>
              {t('settings.blockedUsers')}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.neutral[2] }]}>
              <SettingsItem
                icon="person.fill.xmark"
                label={(() => {
                  const countStr = blockedCount.toString();
                  return blockedCount === 1 
                    ? t('settings.blockedUsersCount').replace('{{count}}', countStr)
                    : t('settings.blockedUsersCount_plural').replace('{{count}}', countStr);
                })()}
                onPress={handleUnblockAll}
                value={blockedCount.toString()}
              />
              <SettingsItem
                icon="arrow.uturn.backward"
                label={t('settings.unblockAll')}
                onPress={handleUnblockAll}
                color={colors.orange[9]}
              />
            </View>
          </View>
        )}

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.neutral[9] }]}>
            {t('settings.legal')}
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.neutral[2] }]}>
            <SettingsItem
              icon="doc.text"
              label={t('settings.privacyPolicy')}
              onPress={() => router.push('/legal?type=privacy&url=https://iyte-2b16f.web.app/privacy')}
            />
            <SettingsItem
              icon="doc.text"
              label={t('settings.termsOfUse')}
              onPress={() => router.push('/legal?type=terms&url=https://iyte-2b16f.web.app/terms')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: colors.neutral[2] }]}>
            <SettingsItem
              icon="rectangle.portrait.and.arrow.right"
              label={t('tabs.profile.signOut')}
              onPress={handleSignOut}
              color="#ef4444"
              showArrow={false}
            />
            <SettingsItem
              icon="trash.fill"
              label={t('settings.deleteAccount')}
              onPress={handleDeleteAccount}
              color="#ef4444"
              showArrow={false}
            />
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '600',
    }),
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsItemLabel: {
    ...applyFont({
      fontSize: 16,
    }),
  },
  settingsItemValue: {
    ...applyFont({
      fontSize: 15,
    }),
  },
});

