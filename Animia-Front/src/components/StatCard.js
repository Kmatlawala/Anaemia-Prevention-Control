// src/components/StatCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';

const {width: screenWidth} = Dimensions.get('window');
const isSmallScreen = screenWidth < 360;
const isMediumScreen = screenWidth >= 360 && screenWidth < 414;

const StatCard = ({
  title,
  value,
  icon,
  iconColor = colors.primary,
  backgroundColor = colors.surface,
  gradient = false,
  gradientColors = colors.gradientPrimary,
  trend = null,
  trendValue = null,
  onPress = null,
  style = {},
}) => {
  const getResponsiveStyles = () => {
    const iconSize = isSmallScreen ? 16 : isMediumScreen ? 18 : 20;
    const containerPadding = isSmallScreen ? spacing.xs : spacing.sm;
    const iconContainerSize = isSmallScreen ? 32 : isMediumScreen ? 36 : 40;

    return {
      iconSize,
      containerPadding,
      iconContainerSize,
    };
  };

  const responsiveStyles = getResponsiveStyles();

  const CardContent = () => (
    <View
      style={[
        styles.container,
        {backgroundColor, padding: responsiveStyles.containerPadding},
        style,
      ]}>
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: iconColor + '20',
              width: responsiveStyles.iconContainerSize,
              height: responsiveStyles.iconContainerSize,
            },
          ]}>
          <Icon
            name={icon}
            size={responsiveStyles.iconSize}
            color={iconColor}
          />
        </View>
        {trend && (
          <View
            style={[
              styles.trendContainer,
              {backgroundColor: getTrendColor(trend) + '20'},
            ]}>
            <Icon
              name={trend === 'up' ? 'trending-up' : 'trending-down'}
              size={isSmallScreen ? 14 : 16}
              color={getTrendColor(trend)}
            />
            <Text style={[styles.trendText, {color: getTrendColor(trend)}]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.value,
          {fontSize: isSmallScreen ? 18 : isMediumScreen ? 20 : 22},
        ]}>
        {value}
      </Text>
      <Text style={[styles.title, {fontSize: isSmallScreen ? 10 : 11}]}>
        {title}
      </Text>
    </View>
  );

  const getTrendColor = trend => {
    switch (trend) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (gradient) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
        <LinearGradient
          colors={gradientColors}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={[styles.gradientContainer, style]}>
          <CardContent />
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.sm,
    ...shadows.sm,
    minHeight: isSmallScreen ? 50 : 60,
    flex: 1,
  },
  gradientContainer: {
    borderRadius: borderRadius.sm,
    ...shadows.sm,
    minHeight: isSmallScreen ? 50 : 60,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainer: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  trendText: {
    ...typography.caption,
    marginLeft: 2,
    fontWeight: typography.weights.semibold,
  },
  value: {
    ...typography.subtitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 2,
    lineHeight: isSmallScreen ? 18 : 22,
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: isSmallScreen ? 12 : 14,
  },
});

export default StatCard;
