import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';

export const Screen = ({ title, children, footer }) => (
  <View style={styles.screen}>
    {title ? <Text style={[typography.title, { marginBottom: spacing.md }]}>{title}</Text> : null}
    {children}
    {footer}
  </View>
);

export const PrimaryButton = ({ label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.primaryBtn}>
    <Text style={typography.button}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
  },
  primaryBtn: {
    backgroundColor: colors.primaryMid,
    paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
});


