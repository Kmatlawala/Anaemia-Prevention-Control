// src/components/Tile.js
import React from 'react';
import {TouchableOpacity, View, Text, StyleSheet, Animated} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../theme/theme';

const Tile = ({
  icon,
  label,
  onPress,
  variant = 'default',
  gradient = false,
}) => {
  const scaleValue = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getTileStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.tilePrimary;
      case 'success':
        return styles.tileSuccess;
      case 'warning':
        return styles.tileWarning;
      case 'info':
        return styles.tileInfo;
      default:
        return styles.tile;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return colors.white;
      case 'success':
        return colors.white;
      case 'warning':
        return colors.white;
      case 'info':
        return colors.white;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.white;
      case 'success':
        return colors.white;
      case 'warning':
        return colors.white;
      case 'info':
        return colors.white;
      default:
        return colors.text;
    }
  };

  const getSubtitle = () => {
    switch (label) {
      case 'Register New Beneficiary':
        return 'Add new patient to system';
      case 'Search Beneficiary':
        return 'Find existing patients';
      case 'Screening':
        return 'Perform health screening';
      case 'Interventions':
        return 'Manage treatments';
      case 'Follow-Up':
        return 'Schedule follow-ups';
      case 'Reports':
        return 'View analytics & data';
      case 'Information':
        return 'App information & help';
      default:
        return 'Tap to continue';
    }
  };

  const TileContent = () => (
    <View style={[getTileStyle(), styles.tileContainer]}>
      <View style={styles.left}>
        <View
          style={[
            styles.iconContainer,
            variant !== 'default' && styles.iconContainerColored,
          ]}>
          <Icon name={icon} size={26} color={getIconColor()} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, {color: getTextColor()}]}>{label}</Text>
          <Text style={[styles.subtitle, {color: getTextColor()}]}>
            {getSubtitle()}
          </Text>
        </View>
      </View>
      <View style={styles.rightContainer}>
        <Icon name="chevron-right" size={22} color={getTextColor()} />
      </View>
    </View>
  );

  if (gradient && variant !== 'default') {
    const gradientColors = {
      primary: colors.gradientPrimary,
      success: colors.gradientSuccess,
      warning: colors.gradientWarning,
      info: [colors.info, colors.primaryLight],
    };

    return (
      <Animated.View style={{transform: [{scale: scaleValue}]}}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={styles.tileWrapper}>
          <LinearGradient
            colors={gradientColors[variant] || colors.gradientPrimary}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={styles.gradientTile}>
            <TileContent />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{transform: [{scale: scaleValue}]}}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.tileWrapper}>
        <TileContent />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  tileWrapper: {
    marginBottom: spacing.sm,
  },
  tileContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 70,
    ...shadows.md,
  },
  tile: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tilePrimary: {
    backgroundColor: colors.primary,
  },
  tileSuccess: {
    backgroundColor: colors.success,
  },
  tileWarning: {
    backgroundColor: colors.warning,
  },
  tileInfo: {
    backgroundColor: colors.info,
  },
  gradientTile: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 70,
    ...shadows.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  iconContainerColored: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.subtitle,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  rightContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
});

export default React.memo(Tile);
