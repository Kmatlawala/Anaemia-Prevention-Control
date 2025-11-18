import React, {useRef, useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const isSmallScreen = screenWidth < 360;
const isMediumScreen = screenWidth >= 360 && screenWidth < 414;

const CustomCarousel = ({
  data,
  renderItem,
  title,
  itemWidth = isSmallScreen ? screenWidth * 0.85 : screenWidth * 0.8,
  sliderWidth = screenWidth,
  autoplay = false,
  autoplayInterval = 3000,
  showPagination = true,
  showArrows = true,
  style = {},
}) => {
  const scrollViewRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const autoplayTimer = useRef(null);

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <View style={[styles.container, style]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  if (!renderItem || typeof renderItem !== 'function') {
    return (
      <View style={[styles.container, style]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.noDataText}>Invalid renderItem function</Text>
      </View>
    );
  }

  const handleScroll = useCallback(
    event => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / (itemWidth + 8));
      if (index !== activeIndex && index >= 0 && index < data.length) {
        setActiveIndex(index);
      }
    },
    [activeIndex, itemWidth, data.length],
  );

  const handleScrollEnd = useCallback(
    event => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / (itemWidth + 8));
      if (index >= 0 && index < data.length) {
        setActiveIndex(index);
      }
    },
    [itemWidth, data.length],
  );

  const scrollToIndex = useCallback(
    index => {
      if (scrollViewRef.current && index >= 0 && index < data.length) {
        setIsScrolling(true);
        scrollViewRef.current.scrollTo({
          x: index * (itemWidth + 8),
          animated: true,
        });
        setTimeout(() => setIsScrolling(false), 300);
      }
    },
    [itemWidth, data.length],
  );

  useEffect(() => {
    if (autoplay && data.length > 1) {
      autoplayTimer.current = setInterval(() => {
        if (!isScrolling) {
          const nextIndex = (activeIndex + 1) % data.length;
          scrollToIndex(nextIndex);
        }
      }, autoplayInterval);
    }

    return () => {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    };
  }, [
    autoplay,
    activeIndex,
    data.length,
    autoplayInterval,
    isScrolling,
    scrollToIndex,
  ]);

  const renderPagination = () => {
    if (!showPagination || data.length <= 1) return null;

    return (
      <View style={styles.pagination}>
        {data.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => scrollToIndex(index)}
            style={[
              styles.paginationDot,
              {
                backgroundColor:
                  index === activeIndex ? colors.primary : colors.border,
                width: index === activeIndex ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderArrow = direction => {
    if (!showArrows || data.length <= 1) return null;

    const isLeft = direction === 'left';
    const isDisabled = isLeft
      ? activeIndex === 0
      : activeIndex === data.length - 1;

    return (
      <TouchableOpacity
        style={[
          styles.arrow,
          isLeft ? styles.arrowLeft : styles.arrowRight,
          isDisabled && styles.arrowDisabled,
        ]}
        onPress={() => {
          if (!isScrolling) {
            const newIndex = isLeft ? activeIndex - 1 : activeIndex + 1;
            scrollToIndex(newIndex);
          }
        }}
        disabled={isDisabled}>
        <Icon
          name={isLeft ? 'chevron-left' : 'chevron-right'}
          size={24}
          color={isDisabled ? colors.textLight : colors.primary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.carouselWrapper}>
        {renderArrow('left')}

        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled={false}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={itemWidth + 8}
          snapToAlignment="start"
          contentContainerStyle={styles.scrollContent}
          style={[styles.scrollView, {width: sliderWidth}]}>
          {data.map((item, index) => (
            <View
              key={index}
              style={[styles.itemContainer, {width: itemWidth}]}>
              {renderItem({item, index})}
            </View>
          ))}
        </ScrollView>

        {renderArrow('right')}
      </View>

      {renderPagination()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
  },
  title: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontWeight: typography.weights.bold,
  },
  carouselWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    alignItems: 'center',
  },
  itemContainer: {
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
    ...shadows.sm,
    zIndex: 1,
  },
  arrowLeft: {
    left: spacing.sm,
  },
  arrowRight: {
    right: spacing.sm,
  },
  arrowDisabled: {
    opacity: 0.3,
  },
  noDataText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.lg,
  },
});

export default CustomCarousel;
