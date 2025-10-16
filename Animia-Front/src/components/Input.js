// src/components/Input.js
import React from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/theme';

const Input = ({ style, ...props }) => (
  <TextInput placeholderTextColor={colors.placeholder} style={[styles.input, style]} {...props} />
);

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing.horizontal, // 16px left/right
    paddingVertical: spacing.sm, backgroundColor: colors.surface, color: colors.text }
});

export default React.memo(Input);
