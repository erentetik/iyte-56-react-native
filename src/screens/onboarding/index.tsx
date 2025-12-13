/**
 * Onboarding Screen
 * 
 * Explains the app to new users and guides them to sign up.
 */

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColors } from '@/hooks/use-theme-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ONBOARDING_KEY = 'isOnboardingViewed';
const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'message.fill',
    titleKey: 'onboarding.slide1.title',
    descriptionKey: 'onboarding.slide1.description',
  },
  {
    id: '2',
    icon: 'eye.slash.fill',
    titleKey: 'onboarding.slide2.title',
    descriptionKey: 'onboarding.slide2.description',
  },
  {
    id: '3',
    icon: 'shield.fill',
    titleKey: 'onboarding.slide3.title',
    descriptionKey: 'onboarding.slide3.description',
  },
  {
    id: '4',
    icon: 'envelope.fill',
    titleKey: 'onboarding.slide4.title',
    descriptionKey: 'onboarding.slide4.description',
  },
];

export function OnboardingScreen() {
  const colors = useThemeColors();
  const { t } = useLanguage();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.orange[9] + '20' }]}>
        <IconSymbol name={item.icon as any} size={80} color={colors.orange[9]} />
      </View>
      <Text style={[styles.title, { color: colors.neutral[12] }]}>
        {t(item.titleKey)}
      </Text>
      <Text style={[styles.description, { color: colors.neutral[9] }]}>
        {t(item.descriptionKey)}
      </Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === currentIndex ? colors.orange[9] : colors.neutral[6],
              width: index === currentIndex ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.orange[9] }]}>IYTE56</Text>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.neutral[9] }]}>
              {t('onboarding.skip')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.orange[9] }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {isLastSlide ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
          {!isLastSlide && (
            <IconSymbol name="chevron.right" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
  },
  skipText: {
    fontSize: 16,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

