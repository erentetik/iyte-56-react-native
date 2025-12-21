/**
 * Reply Item Component
 * 
 * Displays a nested reply comment in card style
 */

import { AnimatedGradientText } from '@/components/animated-gradient-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasLikedComment, useToggleCommentLike } from '@/hooks/queries/use-likes';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { PostOptionsModal } from '@/screens/modal/post-options';
import { CommentDocument, UserDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import { Image } from 'expo-image';
import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatTimestamp } from '../utils';

interface ReplyItemProps {
  reply: CommentDocument;
  onReply?: () => void;
  isReplyTarget?: boolean;
  isLast?: boolean;
  currentUserId?: string;
  userProfile?: UserDocument;
  onReport?: (comment: CommentDocument) => void;
  onDelete?: (comment: CommentDocument) => void;
  onAvatarPress?: (avatarUri: string) => void;
}

export function ReplyItem({ 
  reply, 
  onReply, 
  isReplyTarget, 
  isLast,
  currentUserId,
  userProfile,
  onReport,
  onDelete,
  onAvatarPress,
}: ReplyItemProps) {
  const { t } = useLanguage();
  const colors = useThemeColors();
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const isAdmin = reply.authorIsAdmin === true;
  const showAvatar = isAdmin && reply.authorAvatar;
  const isOwnComment = !!(currentUserId && reply.authorId === currentUserId);
  
  // Check if user has liked this comment
  const { data: isLiked } = useHasLikedComment(reply.id, currentUserId);
  const toggleCommentLikeMutation = useToggleCommentLike();
  
  // Handle like
  const handleLike = useCallback(() => {
    if (!userProfile) return;
    toggleCommentLikeMutation.mutate({
      commentId: reply.id,
      user: userProfile,
    });
  }, [userProfile, reply.id, toggleCommentLikeMutation]);
  
  // Handle report
  const handleReport = useCallback(() => {
    setShowOptionsModal(false);
    onReport?.(reply);
  }, [reply, onReport]);
  
  // Handle delete
  const handleDelete = useCallback(() => {
    setShowOptionsModal(false);
    Alert.alert(
      t('postOptions.deleteTitle'),
      t('postOptions.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('postOptions.delete'),
          style: 'destructive',
          onPress: () => onDelete?.(reply),
        },
      ]
    );
  }, [reply, onDelete, t]);
  
  return (
    <View style={styles.commentCardWrapper}>
      <View style={[
        styles.commentCard,
        {
          backgroundColor: colors.backgroundEmphasis,
          borderColor: colors.neutral[6],
        },
        isReplyTarget && { borderColor: colors.orange[6] }
      ]}>
        {/* Header row */}
        <View style={styles.commentHeaderRow}>
          <View style={styles.commentUserInfo}>
            {showAvatar && (
              <TouchableOpacity
                onPress={() => onAvatarPress?.(reply.authorAvatar!)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: reply.authorAvatar }}
                  style={styles.commentAvatar}
                  contentFit="cover"
                />
              </TouchableOpacity>
            )}
            <View style={styles.commentUsernameContainer}>
              {isAdmin ? (
                <AnimatedGradientText text={`@${reply.authorUsername || t('common.user')}`} style={styles.commentUsername} />
              ) : (
                <Text style={[styles.commentUsername, { color: colors.orange[9] }]}>
                  @{reply.authorUsername || t('common.user')}
                </Text>
              )}
            </View>
            <Text style={[styles.commentDot, { color: colors.neutral[9] }]}>•</Text>
            <Text style={[styles.commentTime, { color: colors.neutral[9] }]}>
              {formatTimestamp(reply.createdAt, t)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => setShowOptionsModal(true)}
          >
            <IconSymbol name="ellipsis" size={14} color={colors.neutral[9]} />
          </TouchableOpacity>
        </View>
        
        {/* Content */}
        <Text style={[styles.commentContent, { color: colors.neutral[12] }]}>
          {reply.content}
        </Text>
        
        {/* Action pills */}
        <View style={styles.commentActionsRow}>
          <View style={styles.commentActionsLeft}>
            <TouchableOpacity 
              style={[
                styles.smallPillButton, 
                { 
                  borderColor: isLiked ? colors.orange[6] : colors.neutral[6],
                  backgroundColor: isLiked ? colors.orange[2] : 'transparent',
                }
              ]}
              onPress={handleLike}
            >
              <IconSymbol 
                name={isLiked ? "heart.fill" : "heart"} 
                size={14} 
                color={isLiked ? colors.orange[9] : colors.neutral[9]} 
              />
              <Text style={[
                styles.smallPillText, 
                { color: isLiked ? colors.orange[9] : colors.neutral[9] }
              ]}>
                {reply.likesCount}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.responsePill, { borderColor: colors.neutral[6] }]}
            onPress={onReply}
          >
            <IconSymbol name="message" size={14} color={colors.neutral[9]} />
            <View style={[styles.pillSeparator, { backgroundColor: colors.neutral[6] }]} />
            <Text style={[styles.responsePillText, { color: colors.neutral[9] }]}>Reply</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Reply Options Modal */}
      <PostOptionsModal
        visible={showOptionsModal}
        isOwnPost={isOwnComment}
        onClose={() => setShowOptionsModal(false)}
        onDelete={handleDelete}
        onReport={handleReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  commentCardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  commentUsernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUsername: {
    ...applyFont({
      fontSize: 15,
      fontWeight: '600',
    }),
  },
  commentDot: {
    marginHorizontal: 6,
    ...applyFont({
      fontSize: 14,
    }),
  },
  commentTime: {
    ...applyFont({
      fontSize: 14,
    }),
  },
  moreButton: {
    padding: 4,
  },
  commentContent: {
    ...applyFont({
      fontSize: 15,
    }),
    lineHeight: 22,
    marginBottom: 14,
  },
  commentActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  smallPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  smallPillText: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '500',
    }),
  },
  responsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  pillSeparator: {
    width: 1,
    height: 14,
  },
  responsePillText: {
    ...applyFont({
      fontSize: 13,
      fontWeight: '500',
    }),
  },
});

