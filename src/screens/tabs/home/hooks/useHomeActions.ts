import { queryKeys } from '@/hooks/queries/query-client';
import { useToggleLike } from '@/hooks/queries/use-likes';
import { useDeletePost } from '@/hooks/queries/use-posts';
import { useToggleSave } from '@/hooks/queries/use-saves';
import { blockUser, updateWarningShowed } from '@/services/users';
import type { PostDocument, UserDocument } from '@/types/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

interface UseHomeActionsProps {
  userProfile: UserDocument | null | undefined;
  userId: string | undefined;
  t: (key: string) => string;
  queryClient: ReturnType<typeof useQueryClient>;
  setSelectedPost: (post: PostDocument | null) => void;
  setSelectedPostAuthor: (author: UserDocument | null) => void;
  setReportModalVisible: (visible: boolean) => void;
  setWarningJustClosed: (closed: boolean) => void;
  clearPendingWarning: () => void;
  setWarningModalVisible: (visible: boolean) => void;
  pendingWarning: any;
}

export function useHomeActions({
  userProfile,
  userId,
  t,
  queryClient,
  setSelectedPost,
  setSelectedPostAuthor,
  setReportModalVisible,
  setWarningJustClosed,
  clearPendingWarning,
  setWarningModalVisible,
  pendingWarning,
}: UseHomeActionsProps) {
  const router = useRouter();
  const toggleLikeMutation = useToggleLike();
  const toggleSaveMutation = useToggleSave();
  const deletePostMutation = useDeletePost();

  const handlePostPress = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );

  const handleLike = useCallback(
    (postId: string) => {
      if (!userProfile) return;
      
      toggleLikeMutation.mutate({
        postId,
        user: userProfile as UserDocument,
      });
    },
    [userProfile, toggleLikeMutation]
  );

  const handleReply = useCallback(
    (postId: string) => {
      router.push(`/post/${postId}`);
    },
    [router]
  );

  const handleSave = useCallback(
    (post: PostDocument) => {
      if (!userProfile) return;
      
      toggleSaveMutation.mutate({
        post,
        user: userProfile as UserDocument,
      });
    },
    [userProfile, toggleSaveMutation]
  );

  const handleDelete = useCallback(async (post: PostDocument) => {
    if (!userProfile || !userId || post.authorId !== userId) return;
    
    try {
      await deletePostMutation.mutateAsync({
        postId: post.id,
        authorId: userId,
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      Alert.alert(t('common.error'), error?.message || t('postOptions.deleteError'));
    }
  }, [userProfile, userId, deletePostMutation, t]);

  const handleReport = useCallback((post: PostDocument) => {
    if (!userProfile) return;
    
    const author: UserDocument = {
      id: post.authorId,
      username: post.authorUsername,
      displayName: post.authorUsername,
      email: '',
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      likesCount: 0,
      isVerified: post.authorIsVerified,
      isPrivate: false,
      isBanned: false,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
    
    setSelectedPost(post);
    setSelectedPostAuthor(author);
    setReportModalVisible(true);
  }, [userProfile, setSelectedPost, setSelectedPostAuthor, setReportModalVisible]);

  const handleBlock = useCallback(async (post: PostDocument) => {
    if (!userProfile || !userId || post.authorId === userId || post.isAnonymous) return;
    
    Alert.alert(
      t('postOptions.blockUserConfirm'),
      t('postOptions.blockUserMessage').replace('{{username}}', post.authorUsername),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('postOptions.blockUser'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(userId, post.authorId);
              Alert.alert(t('common.success'), t('postOptions.blockUserSuccess'));
              queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
              queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
            } catch (error: any) {
              console.error('Error blocking user:', error);
              Alert.alert(t('common.error'), error?.message || t('postOptions.blockUserError'));
            }
          },
        },
      ]
    );
  }, [userProfile, userId, t, queryClient]);

  const handleWarningClose = useCallback(async () => {
    if (pendingWarning && userId) {
      try {
        setWarningJustClosed(true);
        await updateWarningShowed(userId, pendingWarning.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
        clearPendingWarning();
        setWarningModalVisible(false);
        setTimeout(() => {
          setWarningJustClosed(false);
        }, 1000);
      } catch (error) {
        console.error('Error updating warningShowed:', error);
        clearPendingWarning();
        setWarningModalVisible(false);
        setWarningJustClosed(false);
      }
    } else {
      setWarningModalVisible(false);
    }
  }, [pendingWarning, userId, setWarningJustClosed, queryClient, clearPendingWarning, setWarningModalVisible]);

  return {
    handlePostPress,
    handleLike,
    handleReply,
    handleSave,
    handleDelete,
    handleReport,
    handleBlock,
    handleWarningClose,
  };
}

