// src/components/DateInput.js
import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Input from './Input';
import dayjs from 'dayjs';
import { colors, typography } from '../theme/theme';

const fmt = (d) => dayjs(d).format('YYYY-MM-DD');

const DateInput = ({ label, value, onChange, style }) => {
  const [show, setShow] = useState(setShow);

  // Robust require for both platforms
  const DateTimePicker = useMemo(() => {
    try {
      const mod = require('@react-native-community/datetimepicker');
      return mod.default || mod.DateTimePicker || null;
    } catch (_) {
      return null;
    }
  }, []);

  const set = (dateish) => onChange && onChange(fmt(dateish));
  const onPickPress = () => { if (DateTimePicker) setShow(true); };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={{ flexDirection:'row' }}>
        <Input
          placeholder="YYYY-MM-DD"
          value={value}
          onChangeText={onChange}
          style={{ flex: 1, marginRight: 8 }}
        />
        <TouchableOpacity style={styles.pickBtn} onPress={onPickPress}>
          <Text style={styles.pickText}>Pick</Text>
        </TouchableOpacity>
      </View>
      {DateTimePicker && show ? (
        <DateTimePicker
          mode="date"
          display={'calendar'}
          value={value ? new Date(value) : new Date()}
          maximumDate={new Date()}
          minimumDate={dayjs().subtract(120, 'year').toDate()}
          onChange={(event, date) => {
            setShow(false);
            if (date) set(date);
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textMuted, marginBottom: 6 },
  quickRow: { flexDirection: 'row', marginTop: 6 },
  quickBtn: {
    borderWidth: 1, borderColor: colors.border, paddingVertical: 6,
    paddingHorizontal: 10, borderRadius: 8, marginRight: 8,
  },
  quickText: { color: colors.text },
  pickBtn: {
    borderWidth:1, borderColor: colors.border, borderRadius:8,
    paddingHorizontal:12, alignItems:'center', justifyContent:'center'
  },
  pickText: { color: colors.text }
});

export default React.memo(DateInput);
