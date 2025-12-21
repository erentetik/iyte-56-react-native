/**
 * Ad Card Component
 * 
 * Displays advertisement content in the feed
 */

import { useThemeColors } from '@/hooks/use-theme-colors';
import { trackAdClick, trackAdImpression } from '@/services/ads';
import { AdDocument } from '@/types/firestore';
import { applyFont } from '@/utils/apply-fonts';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AvatarViewerModal } from './avatar-viewer-modal';
import { ImageViewerModal } from './image-viewer-modal';
import { IconSymbol } from './ui/icon-symbol';

interface AdCardProps {
  ad: AdDocument;
  userId?: string;
}

export function AdCard({ ad, userId }: AdCardProps) {
  const colors = useThemeColors();
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const impressionTrackedRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  
  // Validate ad data
  if (!ad || !ad.id) {
    console.warn('AdCard: Invalid ad data', ad);
    return null;
  }
  
  // Track impression when component mounts - only once per ad
  useEffect(() => {
    isMountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Only track if not already tracked for this specific ad and userId exists
    const trackingKey = `${ad.id}_${userId || 'anonymous'}`;
    if (impressionTrackedRef.current !== trackingKey && userId && ad.id) {
      impressionTrackedRef.current = trackingKey;
      
      timeoutId = setTimeout(() => {
        trackAdImpression(ad.id, userId).catch((error) => {
          console.error('Error tracking ad impression:', error);
        });
      }, 500);
    }
    
    return () => {
      isMountedRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [ad.id, userId]);
  
  const handleClick = async () => {
    if (!userId || !ctaUrl) return;
    
    try {
      // Track click in background (don't await)
      trackAdClick(ad.id, userId).catch((error) => {
        console.error('Error tracking ad click:', error);
      });
      
      // Handle URL opening
      if (ctaAction === 'deep_link' || ctaAction === 'in_app') {
        // Handle deep link or in-app navigation
        // For now, just open as URL
        const canOpen = await Linking.canOpenURL(ctaUrl);
        if (canOpen) {
          await Linking.openURL(ctaUrl);
        } else {
          Alert.alert('Hata', 'Bu bağlantı açılamıyor');
        }
      } else {
        // Open URL
        const canOpen = await Linking.canOpenURL(ctaUrl);
        if (canOpen) {
          await Linking.openURL(ctaUrl);
        } else {
          Alert.alert('Hata', 'Bu bağlantı açılamıyor');
        }
      }
    } catch (error) {
      console.error('Error handling ad click:', error);
      Alert.alert('Hata', 'Bağlantı açılırken bir hata oluştu');
    }
  };
  
  // Safe access to ad properties
  const advertiserUsername = ad.advertiserUsername || 'Unknown';
  const advertiserAvatar = ad.advertiserAvatar;
  const title = ad.title;
  const content = ad.content;
  const imageUrls = ad.imageUrls || [];
  const videoUrl = ad.videoUrl;
  const ctaText = ad.ctaText;
  const ctaUrl = ad.ctaUrl;
  const ctaAction = ad.ctaAction;

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundEmphasis,
            borderColor: colors.neutral[6],
          },
        ]}
      >
        {/* Header: Advertiser Info */}
        <View style={styles.headerRow}>
          <View style={styles.advertiserInfo}>
            {advertiserAvatar && (
              <TouchableOpacity
                onPress={() => setShowAvatarViewer(true)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: advertiserAvatar }}
                  style={styles.advertiserAvatar}
                  contentFit="cover"
                  onError={(error) => {
                    console.error('Error loading advertiser avatar:', error);
                  }}
                />
              </TouchableOpacity>
            )}
            <Text style={[styles.advertiserUsername, { color: colors.orange[9] }]}>
              @{advertiserUsername}
            </Text>
          </View>
          <View style={styles.adBadge}>
            <IconSymbol name="megaphone.fill" size={12} color={colors.orange[9]} />
            <Text style={[styles.adBadgeText, { color: colors.orange[9] }]}>Reklam</Text>
          </View>
        </View>
        
        {/* Title */}
        {title && (
          <Text style={[styles.title, { color: colors.neutral[12] }]}>
            {title}
          </Text>
        )}
        
        {/* Content */}
        {content && (
          <Text style={[styles.content, { color: colors.neutral[11] }]}>
            {content}
          </Text>
        )}
        
        {/* Images */}
        {imageUrls.length > 0 && (
          <View
            style={[
              styles.imagesContainer,
              imageUrls.length > 1 && styles.imagesContainerRow,
            ]}
          >
            {imageUrls.map((imageUrl, index) => {
              const imageCount = imageUrls.length;
              const isMultiple = imageCount > 1;
              // Calculate width based on number of images
              // 2 images: ~48% each, 3 images: ~31% each, 4+ images: ~48% (2 per row)
              const imageWidth =
                imageCount === 2
                  ? '48%'
                  : imageCount === 3
                    ? '31%'
                    : imageCount === 4
                      ? '48%'
                      : '48%';

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedImageIndex(index);
                    setShowImageViewer(true);
                  }}
                  activeOpacity={0.9}
                  style={[
                    styles.imageWrapper,
                    isMultiple && [
                      styles.imageWrapperMultiple,
                      { width: imageWidth },
                    ],
                  ]}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={[
                      styles.image,
                      isMultiple && styles.imageMultiple,
                    ]}
                    contentFit="cover"
                    onError={(error) => {
                      console.error('Error loading ad image:', error);
                    }}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        
        {/* Video */}
        {videoUrl && (
          <View style={styles.videoContainer}>
            <Text style={[styles.videoPlaceholder, { color: colors.neutral[9] }]}>
              Video içeriği
            </Text>
          </View>
        )}
        
        {/* CTA Button - Optional, shows if either ctaText or ctaUrl exists */}
        {(ctaText || ctaUrl) && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.orange[9] }]}
            onPress={handleClick}
            activeOpacity={0.8}
            disabled={!ctaUrl}
          >
            <Text style={styles.ctaText}>
              {ctaText || 'Detayları Gör'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Image Viewer Modal */}
      {imageUrls.length > 0 && (
        <ImageViewerModal
          visible={showImageViewer}
          imageUris={imageUrls}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
      
      {/* Avatar Viewer Modal */}
      {advertiserAvatar && (
        <AvatarViewerModal
          visible={showAvatarViewer}
          avatarUri={advertiserAvatar}
          onClose={() => setShowAvatarViewer(false)}
        />
      )}
    </View>
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
  advertiserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  advertiserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  advertiserUsername: {
    ...applyFont({
      fontSize: 14,
      fontWeight: '600',
    }),
  },
  adBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adBadgeText: {
    ...applyFont({
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    }),
  },
  title: {
    ...applyFont({
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 8,
    }),
  },
  content: {
    ...applyFont({
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 16,
    }),
  },
  imagesContainer: {
    gap: 8,
    marginBottom: 16,
  },
  imagesContainerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageWrapperMultiple: {
    // Width is set dynamically based on image count
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  imageMultiple: {
    height: 150, // Reduced height for multiple images
  },
  videoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  videoPlaceholder: {
    ...applyFont({
      fontSize: 14,
    }),
  },
  ctaButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...applyFont({
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    }),
  },
});

