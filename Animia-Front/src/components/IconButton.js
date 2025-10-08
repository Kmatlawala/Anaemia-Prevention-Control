// src/components/IconButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing } from '../theme/theme';

const IconButton = ({ name, size = 20, onPress, style, bg = colors.primary }) => (
  <TouchableOpacity onPress={onPress} style={[styles.btn, { backgroundColor: bg }, style]}>
    <Icon name={name} size={size} color="#fff" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', margin: spacing.xs }
});

export default React.memo(IconButton);
