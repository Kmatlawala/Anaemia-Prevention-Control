import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RadioButton, TouchableRipple } from 'react-native-paper';
import { colors, spacing, typography } from '../theme/theme';

const YesNoField = ({ label = 'Conjunctival Pallor', value, onChange, error, required = true, style }) => {
  const labelColor = error ? '#D9534F' : colors.text;
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <Text numberOfLines={1} style={[styles.label, { color: labelColor }]}>
          {label}{required ? <Text style={styles.req}> *</Text> : null}
        </Text>

        <RadioButton.Group onValueChange={(v) => onChange?.(v)} value={value || ''}>
          <View style={styles.options}>
            <TouchableRipple onPress={() => onChange?.('yes')} rippleColor="rgba(0,0,0,0.08)" borderless>
              <View style={styles.opt}>
                <RadioButton value="yes" />
                <Text style={styles.optText}>Yes</Text>
              </View>
            </TouchableRipple>

            <TouchableRipple onPress={() => onChange?.('no')} rippleColor="rgba(0,0,0,0.08)" borderless>
              <View style={[styles.opt, { marginLeft: spacing.sm }]}>
                <RadioButton value="no" />
                <Text style={styles.optText}>No</Text>
              </View>
            </TouchableRipple>
          </View>
        </RadioButton.Group>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { ...typography.subtitle, marginRight: spacing.sm, flexShrink: 1 },
  req: { color: '#D9534F', fontWeight: '700' },
  options: { flexDirection: 'row', alignItems: 'center' },
  opt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }, // tighter
  optText: { color: colors.text, marginLeft: 2 },
  errorText: { color: '#D9534F', marginTop: 4, fontSize: 12 },
});

export default YesNoField;
