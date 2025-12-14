import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/queries/use-notifications';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { NotificationDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  if (diffMinutes < 60) return `${diffMinutes}${t('time.minutes')} ${t('time.ago')}`;
  if (diffHours < 24) return `${diffHours}${t('time.hours')} ${t('time.ago')}`;
  if (diffDays < 7) return `${diffDays}${t('time.days')} ${t('time.ago')}`;
  
  return date.toLocaleDateString();
}

export function NotificationsScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  
  const {
    data: notifications,
    isLoading,
    isRefetching,
    refetch,
  } = useNotifications(user?.uid);

  const getNotificationIcon = (type: NotificationDocument['type']): { name: any; color: string } => {
    switch (type) {
      case 'like':
        return { name: 'heart.fill' as any, color: '#f91880' };
      case 'comment':
        return { name: 'message.fill' as any, color: colors.orange[9] };
      case 'reply':
        return { name: 'message.fill' as any, color: colors.orange[9] };
      case 'follow':
        return { name: 'person.fill' as any, color: colors.orange[9] };
    }
  };

  const getNotificationText = (notification: NotificationDocument): string => {
    switch (notification.type) {
      case 'like':
        return t('tabs.notifications.liked');
      case 'comment':
        return t('tabs.notifications.commented');
      case 'reply':
        return t('tabs.notifications.replied');
      case 'follow':
        return t('tabs.notifications.followed');
    }
  };
  
  const handleNotificationPress = (notification: NotificationDocument) => {
    // Only navigate if notification has a postId (like, comment, reply notifications)
    // Follow notifications don't have a postId, so we don't navigate for those
    if (notification.postId) {
      router.push(`/post/${notification.postId}`);
    }
  };

  const renderNotification = ({ item }: { item: NotificationDocument }) => {
    const icon = getNotificationIcon(item.type);
    const isUnread = !item.isRead;
    
    return (
      <TouchableOpacity
        style={[
          styles.notification,
          {
            backgroundColor: isUnread ? colors.orange[1] : colors.background,
            borderBottomColor: colors.neutral[6],
          },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <IconSymbol name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.text, { color: colors.neutral[12] }]}>
            <Text style={styles.bold}>{item.actorDisplayName}</Text>{' '}
            <Text style={[styles.username, { color: colors.orange[9] }]}>
              @{item.actorUsername}
            </Text>{' '}
            {getNotificationText(item)}
          </Text>
          {item.postContent && (
            <Text style={[styles.postPreview, { color: colors.neutral[9] }]} numberOfLines={1}>
              {item.postContent}
            </Text>
          )}
          <Text style={[styles.timestamp, { color: colors.neutral[9] }]}>
            {formatTimestamp(item.createdAt, t)}
          </Text>
        </View>
        {isUnread && (
          <View style={[styles.unreadDot, { backgroundColor: colors.orange[9] }]} />
        )}
      </TouchableOpacity>
    );
  };
  
  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.orange[9]} />
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
        <Text style={[styles.headerTitle, { color: colors.neutral[12] }]}>{t('tabs.notifications.title')}</Text>
      </View>
      <FlatList
        data={notifications || []}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.orange[9]}
            colors={[colors.orange[9]]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
    fontSize: 20,
    fontWeight: '700',
  },
  listContent: {
    flexGrow: 1,
  },
  notification: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  text: {
    ...applyFont({
      fontSize: 15,
    }),
    lineHeight: 20,
    marginBottom: 4,
  },
  bold: {
    ...applyFont({
      fontWeight: '700',
    }),
  },
  username: {
    ...applyFont({
      fontSize: 15,
    }),
  },
  postPreview: {
    ...applyFont({
      fontSize: 13,
    }),
    marginTop: 4,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  timestamp: {
    ...applyFont({
      fontSize: 13,
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    ...applyFont({
      fontSize: 16,
    }),
    marginTop: 16,
    textAlign: 'center',
  },
});

