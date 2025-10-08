// src/components/Select.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography } from '../theme/theme';

const Select = ({ label, value, onChange, options, placeholder, style, itemStyle }) => {
  const items = useMemo(() => {
    const base = Array.isArray(options) ? options : [];
    return base.map((opt) => (
      typeof opt === 'string'
        ? { label: opt, value: opt }
        : { label: String(opt.label ?? opt.value), value: opt.value }
    ));
  }, [options]);

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.wrapper}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          dropdownIconColor={colors.text}
          style={styles.picker}
          itemStyle={itemStyle}
        >
          {placeholder ? <Picker.Item label={placeholder} value="" color={colors.textMuted} /> : null}
          {items.map((it) => (
            <Picker.Item key={String(it.value)} label={it.label} value={it.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  label: { ...typography.caption, color: colors.text, marginBottom: 6, fontWeight: '600' },
  wrapper: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.surface },
  picker: { height: 44, color: colors.text },
});

export default React.memo(Select);


