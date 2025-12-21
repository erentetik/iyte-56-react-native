import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { PostOptionsModal } from '@/screens/modal/post-options';
import { applyFont } from '@/utils/apply-fonts';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AnimatedGradientText } from './animated-gradient-text';
import { AvatarViewerModal } from './avatar-viewer-modal';
import { GradientBorder } from './gradient-border';
import { ImageViewerModal } from './image-viewer-modal';
import { IconSymbol } from './ui/icon-symbol';

export interface TweetData {
  id: string;
  author: {
    id?: string; // Author user ID
    name: string;
    username: string;
    avatar?: string;
    isAdmin?: boolean;
    borderColor?: string; // Border color from Firebase user document
    borderColors?: string[]; // Border colors array from Firebase user document
  };
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isReported?: boolean;
  isAnonymous?: boolean;
  imageUrl?: string; // Deprecated: use imageUrls instead
  imageUrls?: string[]; // Array of image URLs for multiple images
}

interface TweetProps {
  tweet: TweetData;
  onPress?: () => void;
  onLike?: () => void;
  onReply?: () => void;
  onReport?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  onBlock?: () => void;
  isOwnPost?: boolean;
}

export function Tweet({ tweet, onPress, onLike, onReply, onReport, onSave, onDelete, onBlock, isOwnPost = false }: TweetProps) {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Get images: prefer imageUrls array, fallback to imageUrl for backward compatibility
  const images = tweet.imageUrls && tweet.imageUrls.length > 0 
    ? tweet.imageUrls 
    : (tweet.imageUrl ? [tweet.imageUrl] : []);

  // Display anonymous info if post is anonymous
  const displayUsername = tweet.isAnonymous ? t('common.anonymousUsername') : tweet.author.username;
  const isAdmin = !tweet.isAnonymous && tweet.author.isAdmin === true;
  const showAvatar = isAdmin && tweet.author.avatar;

  // Handle more button press - show modal
  const handleMorePress = () => {
    setShowOptionsModal(true);
  };

  const handleDelete = () => {
      Alert.alert(
      t('postOptions.deleteTitle'),
      t('postOptions.deleteMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
        { text: t('postOptions.delete'), style: 'destructive', onPress: onDelete },
        ]
      );
  };

  const handleReport = () => {
    onReport?.();
  };

  const CardContent = (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundEmphasis,
          borderWidth: isAdmin ? 0 : 1,
          borderColor: isAdmin ? 'transparent' : colors.neutral[6],
          },
        ]}
      >
        {/* Header: Avatar (if admin), Username, timestamp, more button */}
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            {showAvatar && (
              <TouchableOpacity
                onPress={() => setShowAvatarViewer(true)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: tweet.author.avatar }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              </TouchableOpacity>
            )}
            <View style={styles.usernameContainer}>
              {isAdmin ? (
                <AnimatedGradientText text={`@${displayUsername}`} style={styles.username} />
              ) : (
            <Text style={[styles.username, { color: colors.orange[9] }]}>@{displayUsername}</Text>
              )}
            </View>
            <Text style={[styles.dot, { color: colors.neutral[9] }]}>•</Text>
            <Text style={[styles.timestamp, { color: colors.neutral[9] }]}>{tweet.timestamp}</Text>
          </View>
          <TouchableOpacity style={styles.moreButton} onPress={handleMorePress}>
            <IconSymbol name="ellipsis" size={16} color={colors.neutral[9]} />
          </TouchableOpacity>
        </View>
        
        {/* Post Content */}
        <Text style={[styles.content, { color: colors.neutral[12] }]}>{tweet.content}</Text>
        
        {/* Images - if exists */}
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            {images.length === 1 ? (
              <TouchableOpacity
                style={styles.imageContainer}
                onPress={() => {
                  setSelectedImageIndex(0);
                  setShowImageViewer(true);
                }}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: images[0] }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.multipleImagesContainer}>
                {images.slice(0, 4).map((imageUrl, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.multipleImageItem,
                      images.length === 2 && styles.twoImagesItem,
                      images.length === 3 && index === 0 && styles.threeImagesFirstItem,
                      images.length === 3 && index > 0 && styles.threeImagesOtherItem,
                      images.length >= 4 && index === 0 && styles.fourImagesFirstItem,
                      images.length >= 4 && index > 0 && styles.fourImagesOtherItem,
                    ]}
                    onPress={() => {
                      setSelectedImageIndex(index);
                      setShowImageViewer(true);
                    }}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.multipleImage}
                      contentFit="cover"
                      transition={200}
                    />
                    {images.length > 4 && index === 3 && (
                      <View style={styles.moreImagesOverlay}>
                        <Text style={styles.moreImagesText}>+{images.length - 4}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        
        {/* Action Buttons - Pill style */}
        <View style={styles.actionsRow}>
          {/* Left side: Like and Save pills */}
          <View style={styles.actionsLeft}>
            {/* Like pill */}
            <TouchableOpacity 
              style={[
                styles.actionPill, 
                { 
                  borderColor: tweet.isLiked ? colors.orange[6] : colors.neutral[6],
                  backgroundColor: tweet.isLiked ? colors.orange[2] : 'transparent',
                }
              ]} 
              onPress={onLike}
            >
              <IconSymbol
                name={tweet.isLiked ? 'heart.fill' : 'heart'}
                size={16}
                color={tweet.isLiked ? colors.orange[9] : colors.neutral[9]}
              />
              <Text
                style={[
                  styles.actionPillText,
                  { color: tweet.isLiked ? colors.orange[9] : colors.neutral[9] },
                ]}
              >
                {tweet.likes}
              </Text>
            </TouchableOpacity>
            
            {/* Save/Bookmark pill */}
            <TouchableOpacity 
              style={[
                styles.actionPill,
                {
                  borderColor: tweet.isSaved ? colors.orange[6] : colors.neutral[6],
                  backgroundColor: tweet.isSaved ? colors.orange[2] : 'transparent',
                }
              ]}
              onPress={onSave}
            >
              <IconSymbol
                name={tweet.isSaved ? 'bookmark.fill' : 'bookmark'}
                size={16}
                color={tweet.isSaved ? colors.orange[9] : colors.neutral[9]}
              />
            </TouchableOpacity>
          </View>
          
          {/* Right side: Comments pill with separator */}
          <TouchableOpacity 
            style={[styles.commentsPill, { borderColor: colors.neutral[6] }]}
            onPress={onReply}
          >
            <IconSymbol name="message" size={16} color={colors.neutral[9]} />
            <View style={[styles.pillSeparator, { backgroundColor: colors.neutral[6] }]} />
            <Text style={[styles.commentsText, { color: colors.neutral[9] }]}>
              {tweet.replies} {t('postOptions.comments')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.cardWrapper}>
        {isAdmin ? (
          <GradientBorder 
            borderWidth={2} 
            borderRadius={16}
            borderColor={tweet.author.borderColor}
          >
            {CardContent}
          </GradientBorder>
        ) : (
          CardContent
        )}
    </View>
      <PostOptionsModal
        visible={showOptionsModal}
        isOwnPost={isOwnPost}
        onClose={() => setShowOptionsModal(false)}
        onDelete={handleDelete}
        onReport={handleReport}
        onBlock={onBlock}
        canBlock={!isOwnPost && !tweet.isAnonymous && !!tweet.author.id}
      />
      {showAvatar && tweet.author.avatar && (
        <AvatarViewerModal
          visible={showAvatarViewer}
          avatarUri={tweet.author.avatar}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}
      {images.length > 0 && (
        <ImageViewerModal
          visible={showImageViewer}
          imageUris={images}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    ...applyFont({
      fontWeight: '600',
      fontSize: 15,
    }),
  },
  dot: {
    ...applyFont({
      marginHorizontal: 6,
      fontSize: 14,
    }),
  },
  timestamp: {
    ...applyFont({
      fontSize: 14,
    }),
  },
  moreButton: {
    padding: 4,
  },
  content: applyFont({
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  }),
  imagesContainer: {
    marginBottom: 16,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
  },
  multipleImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  multipleImageItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  twoImagesItem: {
    width: '48%',
    height: 200,
  },
  threeImagesFirstItem: {
    width: '100%',
    height: 200,
    marginBottom: 4,
  },
  threeImagesOtherItem: {
    width: '48%',
    height: 150,
  },
  fourImagesFirstItem: {
    width: '100%',
    height: 200,
    marginBottom: 4,
  },
  fourImagesOtherItem: {
    width: '32%',
    height: 150,
  },
  multipleImage: {
    width: '100%',
    height: '100%',
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  actionPillText: {
    ...applyFont({
      fontSize: 14,
      fontWeight: '500',
    }),
  },
  commentsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  pillSeparator: {
    width: 1,
    height: 16,
  },
  commentsText: {
    ...applyFont({
      fontSize: 14,
      fontWeight: '500',
    }),
  },
});
