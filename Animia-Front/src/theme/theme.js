// src/theme/theme.js
import {Platform, Dimensions} from 'react-native';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// iOS-specific spacing adjustments
const isIOS = Platform.OS === 'ios';
const isSmallScreen = screenWidth < 375; // iPhone SE and smaller
const isLargeScreen = screenWidth > 414; // iPhone Plus and larger

export const colors = {
  // Primary colors - Modern healthcare theme
  background: '#F8FAFC',
  surface: '#FFFFFF',
  primary: '#2563EB', // Modern blue
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  secondary: '#F59E0B', // Warm accent (saffron like)
  accent: '#10B981', // Success green
  accentLight: '#34D399',

  // Text colors
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  muted: '#6B7280',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // UI colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  white: '#FFFFFF',
  black: '#000000',
  placeholder: '#9CA3AF',

  // Gradient colors
  gradientPrimary: ['#2563EB', '#1D4ED8'],
  gradientSecondary: ['#F59E0B', '#D97706'],
  gradientSuccess: ['#10B981', '#059669'],
  gradientWarning: ['#F59E0B', '#D97706'],
  gradientError: ['#EF4444', '#DC2626'],

  // Chart colors
  chartColors: [
    '#2563EB',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#06B6D4',
    '#84CC16',
    '#F97316',
    '#EC4899',
    '#6366F1',
  ],

  // Category specific colors
  pregnant: '#EC4899',
  adolescent: '#3B82F6',
  under5: '#F59E0B',
  wora: '#10B981',

  // Severity colors
  normal: '#10B981',
  mild: '#F59E0B',
  moderate: '#F97316',
  severe: '#EF4444',
  unknown: '#6B7280',
};

export const spacing = {
  xs: isIOS ? 6 : 4,
  sm: isIOS ? 12 : 8,
  md: isIOS ? 18 : 16,
  lg: isIOS ? 28 : 24,
  xl: isIOS ? 36 : 32,
  xxl: isIOS ? 52 : 48,
  // iOS-specific spacing
  ios: {
    xs: 6,
    sm: 12,
    md: 18,
    lg: 28,
    xl: 36,
    xxl: 52,
  },
  // Android-specific spacing
  android: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
};

export const typography = {
  sizes: {
    xs: isIOS ? 13 : 12,
    sm: isIOS ? 15 : 14,
    md: isIOS ? 17 : 16,
    lg: isIOS ? 19 : 18,
    xl: isIOS ? 21 : 20,
    xxl: isIOS ? 25 : 24,
    xxxl: isIOS ? 33 : 32,
  },
  weights: {
    light: isIOS ? '300' : '300',
    normal: isIOS ? '400' : '400',
    medium: isIOS ? '500' : '500',
    semibold: isIOS ? '600' : '600',
    bold: isIOS ? '700' : '700',
    extrabold: isIOS ? '800' : '800',
  },
  title: {
    fontSize: isIOS ? 25 : 24,
    fontWeight: isIOS ? '700' : '700',
    lineHeight: isIOS ? 33 : 32,
  },
  subtitle: {
    fontSize: isIOS ? 19 : 18,
    fontWeight: isIOS ? '600' : '600',
    lineHeight: isIOS ? 25 : 24,
  },
  body: {
    fontSize: isIOS ? 17 : 16,
    fontWeight: isIOS ? '400' : '400',
    lineHeight: isIOS ? 25 : 24,
  },
  caption: {
    fontSize: isIOS ? 15 : 14,
    fontWeight: isIOS ? '400' : '400',
    lineHeight: isIOS ? 21 : 20,
  },
  small: {
    fontSize: isIOS ? 13 : 12,
    fontWeight: isIOS ? '400' : '400',
    lineHeight: isIOS ? 17 : 16,
  },
};

export const borderRadius = {
  xs: isIOS ? 6 : 4,
  sm: isIOS ? 10 : 8,
  md: isIOS ? 14 : 12,
  lg: isIOS ? 18 : 16,
  xl: isIOS ? 22 : 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Platform-specific utilities
export const platform = {
  isIOS,
  isAndroid: Platform.OS === 'android',
  isSmallScreen,
  isLargeScreen,
  screenWidth,
  screenHeight,

  // iOS-specific safe area adjustments
  safeArea: {
    top: isIOS ? 44 : 0, // Status bar height
    bottom: isIOS ? 34 : 0, // Home indicator height
    horizontal: isIOS ? 20 : 0, // Side margins
  },

  // Platform-specific touch targets
  touchTarget: {
    minHeight: isIOS ? 44 : 48, // iOS Human Interface Guidelines
    minWidth: isIOS ? 44 : 48,
  },

  // Platform-specific navigation
  navigation: {
    headerHeight: isIOS ? 44 : 56,
    tabBarHeight: isIOS ? 49 : 56,
  },
};
