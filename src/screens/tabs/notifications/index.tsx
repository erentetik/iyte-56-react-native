import { AvatarViewerModal } from '@/components/avatar-viewer-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMarkNotificationAsRead, useUserNotifications } from '@/hooks/queries/use-notifications';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { NotificationDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Format timestamp to relative time string
 */
function formatTimestamp(timestamp: Timestamp | undefined, t: (key: string) => string): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = timestamp.toDate();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds}${t('time.seconds')} ${t('time.ago')}`;
  if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes > 1 ? t('time.minutesPlural') : t('time.minute')} ${t('time.ago')}`;
  if (diffHours < 24) return `${diffHours} ${diffHours > 1 ? t('time.hoursPlural') : t('time.hour')} ${t('time.ago')}`;
  if (diffDays < 7) return `${diffDays} ${diffDays > 1 ? t('time.daysPlural') : t('day')} ${t('time.ago')}`;
  
  return date.toLocaleDateString();
}

/**
 * Get notification message based on type
 */
function getNotificationMessage(notification: NotificationDocument, t: (key: string) => string): string {
  switch (notification.type) {
    case 'like':
      return t('tabs.notifications.liked');
    case 'comment':
      return t('tabs.notifications.commented');
    case 'reply':
      return t('tabs.notifications.replied');
    case 'follow':
      return t('tabs.notifications.followed');
    default:
      return '';
  }
}

interface NotificationItemProps {
  notification: NotificationDocument;
  onPress: () => void;
}

function NotificationItem({ notification, onPress, onAvatarPress }: NotificationItemProps & { onAvatarPress?: (avatarUri: string) => void }) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  
  const message = getNotificationMessage(notification, t);
  const actorName = notification.actorUsername;
  const hasAvatar = !!notification.actorAvatar;
  
  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.isRead ? colors.background : colors.neutral[2],
          borderBottomColor: colors.neutral[6],
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        {hasAvatar ? (
          <TouchableOpacity
            onPress={() => onAvatarPress?.(notification.actorAvatar!)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: notification.actorAvatar }}
              style={styles.avatar}
              contentFit="cover"
            />
          </TouchableOpacity>
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.neutral[6] }]}>
            <IconSymbol name="person.fill" size={20} color={colors.neutral[9]} />
          </View>
        )}
        
        <View style={styles.notificationTextContainer}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.actorName, { color: colors.neutral[12] }]}>
              {actorName}
            </Text>
            <Text style={[styles.message, { color: colors.neutral[11] }]}>
              {message}
            </Text>
          </View>
          
          {notification.postContent && (
            <Text 
              style={[styles.postPreview, { color: colors.neutral[9] }]}
              numberOfLines={2}
            >
              {notification.postContent}
            </Text>
          )}
          
          <Text style={[styles.timestamp, { color: colors.neutral[8] }]}>
            {formatTimestamp(notification.createdAt, t)}
          </Text>
        </View>
        
        {!notification.isRead && (
          <View style={[styles.unreadDot, { backgroundColor: colors.orange[9] }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [avatarViewerVisible, setAvatarViewerVisible] = useState(false);
  const [avatarViewerUri, setAvatarViewerUri] = useState<string | undefined>();
  
  const { 
    data: notifications, 
    isLoading, 
    isError,
    refetch,
    isRefetching,
  } = useUserNotifications(user?.uid);
  
  const markAsReadMutation = useMarkNotificationAsRead();
  
  // Handle notification press - navigate to post and mark as read
  const handleNotificationPress = useCallback((notification: NotificationDocument) => {
    if (!user?.uid) return;
    
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsReadMutation.mutate({
        notificationId: notification.id,
        userId: user.uid,
      });
    }
    
    // Navigate to post if available
    if (notification.postId) {
      router.push(`/post/${notification.postId}`);
    }
  }, [user?.uid, router, markAsReadMutation]);
  
  // Handle avatar press
  const handleAvatarPress = useCallback((avatarUri: string) => {
    setAvatarViewerUri(avatarUri);
    setAvatarViewerVisible(true);
  }, []);

  // Render notification item
  const renderNotification = useCallback(
    ({ item }: { item: NotificationDocument }) => (
      <NotificationItem
        notification={item}
        onPress={() => handleNotificationPress(item)}
        onAvatarPress={handleAvatarPress}
      />
    ),
    [handleNotificationPress, handleAvatarPress]
  );
  
  // Render empty state
  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.orange[9]} />
        </View>
      );
    }
    
    if (isError) {
      return (
        <View style={styles.emptyContainer}>
          <IconSymbol name="exclamationmark.triangle" size={48} color={colors.neutral[8]} />
          <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
            {t('common.error')}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="bell" size={48} color={colors.neutral[8]} />
        <Text style={[styles.emptyText, { color: colors.neutral[9] }]}>
          {t('tabs.notifications.empty')}
        </Text>
      </View>
    );
  }, [isLoading, isError, colors, t]);

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
        <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>
          {t('tabs.notifications.title')}
        </Text>
      </View>
      
      <FlatList
        data={notifications || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications && notifications.length === 0 ? styles.listContentEmpty : styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.orange[9]}
          />
        }
        showsVerticalScrollIndicator={true}
      />
      <AvatarViewerModal
        visible={avatarViewerVisible}
        avatarUri={avatarViewerUri}
        onClose={() => {
          setAvatarViewerVisible(false);
          setAvatarViewerUri(undefined);
        }}
      />
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
  headerTitle: {
    ...applyFont({
    fontSize: 20,
    fontWeight: '700',
    }),
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    ...applyFont({
      fontSize: 16,
    }),
    marginTop: 16,
    textAlign: 'center',
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
    gap: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  actorName: {
    ...applyFont({
      fontSize: 15,
      fontWeight: '600',
    }),
  },
  message: {
    ...applyFont({
      fontSize: 15,
    }),
  },
  postPreview: {
    ...applyFont({
      fontSize: 14,
    }),
    marginTop: 4,
    lineHeight: 18,
  },
  timestamp: {
    ...applyFont({
      fontSize: 12,
    }),
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});

