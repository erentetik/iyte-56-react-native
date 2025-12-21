/**
 * Replies Section Component
 * 
 * Displays nested replies for a comment
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { useCommentReplies } from '@/hooks/queries/use-comments';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { CommentDocument, UserDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ReplyItem } from './reply-item';

interface RepliesSectionProps {
  postId: string;
  parentCommentId: string;
  onReplyToComment: (comment: CommentDocument) => void;
  replyingToId?: string;
  currentUserId?: string;
  userProfile?: UserDocument;
  onReport?: (comment: CommentDocument) => void;
  onDelete?: (comment: CommentDocument) => void;
  onAvatarPress?: (avatarUri: string) => void;
}

export function RepliesSection({ 
  postId, 
  parentCommentId, 
  onReplyToComment, 
  replyingToId,
  currentUserId,
  userProfile,
  onReport,
  onDelete,
  onAvatarPress,
}: RepliesSectionProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useCommentReplies(postId, parentCommentId);
  
  const replies = useMemo((): CommentDocument[] => {
    return data?.pages.flatMap((page: { comments: CommentDocument[] }) => page.comments) ?? [];
  }, [data]);
  
  if (isLoading) {
    return (
      <View style={styles.repliesLoading}>
        <ActivityIndicator size="small" color={colors.orange[9]} />
      </View>
    );
  }
  
  if (error) {
    console.error('Error loading replies:', error);
    return (
      <View style={styles.repliesError}>
        <Text style={[styles.repliesErrorText, { color: colors.neutral[11] }]}>
          {t('postDetail.repliesError')}
        </Text>
      </View>
    );
  }
  
  if (replies.length === 0) {
    return (
      <View style={styles.repliesEmpty}>
        <Text style={[styles.repliesEmptyText, { color: colors.neutral[9] }]}>
          {t('postDetail.noReplies')}
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.repliesContainer}>
      {replies.map((reply, index) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          onReply={() => onReplyToComment(reply)}
          isReplyTarget={replyingToId === reply.id}
          isLast={index === replies.length - 1 && !hasNextPage}
          currentUserId={currentUserId}
          userProfile={userProfile}
          onReport={onReport}
          onDelete={onDelete}
          onAvatarPress={onAvatarPress}
        />
      ))}
      {hasNextPage && (
        <TouchableOpacity
          style={styles.loadMoreReplies}
          onPress={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <ActivityIndicator size="small" color={colors.orange[9]} />
          ) : (
            <Text style={[styles.loadMoreText, { color: colors.orange[9] }]}>
              {t('postDetail.loadMoreReplies')}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  repliesContainer: {
    // Container for replies
  },
  repliesLoading: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  repliesError: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  repliesErrorText: {
    ...applyFont({
      fontSize: 13,
    }),
  },
  repliesEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  repliesEmptyText: {
    ...applyFont({
      fontSize: 13,
    }),
  },
  loadMoreReplies: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadMoreText: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '500',
    }),
  },
});

