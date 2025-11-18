import React, {useMemo, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Header from '../components/Header';
import {colors, spacing, typography, platform} from '../theme/theme';
import Select from '../components/Select';
import dayjs from 'dayjs';
import {
  setFilters,
  resetFilters,
  selectReportFilters,
} from '../store/reportSlice';

export default function ReportFilters({navigation}) {
  const dispatch = useDispatch();
  const filters = useSelector(state => state.report.filters);
  const DateTimePicker = useMemo(() => {
    try {
      const mod = require('@react-native-community/datetimepicker');
      return mod.default || mod.DateTimePicker || null;
    } catch (_) {
      return null;
    }
  }, []);
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);

  const updateDateRange = (key, value) => {
    dispatch(
      setFilters({
        dateRange: {
          ...filters.dateRange,
          [key]: value,
        },
      }),
    );
  };

  const updateFilter = (type, value) => {
    dispatch(setFilters({[type]: value}));
  };

  const apply = () => {
    navigation.navigate('Reports');
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <Header
        title="Filters"
        variant="back"
        onBackPress={() => {
          
          navigation.navigate('Reports');
        }}
      />
      <View style={styles.card}>
        <Text
          style={{
            ...typography.title,
            marginBottom: spacing.sm,
            color: colors.text,
          }}>
          Report Filters
        </Text>
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity
            onPress={() => setShowFrom(true)}
            style={styles.dateBox}>
            <Text style={styles.dateLabel}>From</Text>
            <Text style={styles.dateValue}>
              {filters.dateRange.startDate || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowTo(true)}
            style={[styles.dateBox, {marginLeft: spacing.sm}]}>
            <Text style={styles.dateLabel}>To</Text>
            <Text style={styles.dateValue}>
              {filters.dateRange.endDate || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
        </View>
        {showFrom && DateTimePicker && (
          <DateTimePicker
            mode="date"
            display="calendar"
            value={
              filters.dateRange.startDate
                ? new Date(filters.dateRange.startDate)
                : new Date()
            }
            minimumDate={dayjs().subtract(120, 'year').toDate()}
            onChange={(e, d) => {
              setShowFrom(false);
              if (d)
                updateDateRange('startDate', dayjs(d).format('YYYY-MM-DD'));
            }}
          />
        )}
        {showTo && DateTimePicker && (
          <DateTimePicker
            mode="date"
            display="calendar"
            value={
              filters.dateRange.endDate
                ? new Date(filters.dateRange.endDate)
                : new Date()
            }
            minimumDate={dayjs().subtract(120, 'year').toDate()}
            onChange={(e, d) => {
              setShowTo(false);
              if (d) updateDateRange('endDate', dayjs(d).format('YYYY-MM-DD'));
            }}
          />
        )}

        <View style={{flexDirection: 'row', marginTop: spacing.sm}}>
          <Select
            label="Category"
            value={filters.beneficiaryType}
            onChange={value => updateFilter('beneficiaryType', value)}
            options={[
              {label: 'All', value: 'all'},
              {label: 'Pregnant', value: 'Pregnant'},
              {label: 'Under5', value: 'Under5'},
              {label: 'Adolescent', value: 'Adolescent'},
            ]}
            style={{flex: 1, marginRight: spacing.sm}}
          />
          <Select
            label="Severity"
            value={filters.interventionStatus}
            onChange={value => updateFilter('interventionStatus', value)}
            options={[
              {label: 'All', value: 'all'},
              {label: 'normal', value: 'normal'},
              {label: 'mild', value: 'mild'},
              {label: 'moderate', value: 'moderate'},
              {label: 'severe', value: 'severe'},
            ]}
            style={{flex: 1}}
          />
        </View>
        <Select
          label="Block"
          value={filters.location || 'all'}
          onChange={value => updateFilter('location', value)}
          options={[
            {label: 'All', value: 'all'},
            {label: 'Mahuva', value: 'Mahuva'},
            {label: 'Olpad', value: 'Olpad'},
            {label: 'Chorasi', value: 'Chorasi'},
            {label: 'Umarpada', value: 'Umarpada'},
          ]}
          style={{marginTop: spacing.sm}}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => dispatch(resetFilters())}>
            <Text style={{color: colors.primary}}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={apply}>
            <Text style={{color: '#fff'}}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.sm,
  },
  dateLabel: {color: colors.text, marginBottom: 4},
  dateValue: {color: colors.text},
  buttonRow: {flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm},
  resetBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  applyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.horizontal, 
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
});
