// src/screens/Reports.js
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  memo,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  platform,
} from '../theme/theme';
import dayjs from 'dayjs';
import LinearGradient from 'react-native-linear-gradient';
import {
  setFilters,
  resetFilters,
  setCurrentReport,
  setLoading as setReportLoading,
  setError as setReportError,
  selectReportFilters,
  selectCurrentReport,
  selectReportLoading,
  selectReportError,
  fetchReports,
} from '../store/reportSlice';
import {
  exportJsonToXlsx,
  exportJsonToCSV,
  exportJsonToText,
} from '../utils/export';
import {API} from '../utils/api';
import Header from '../components/Header';
import Select from '../components/Select';
import Chart from '../components/Chart';
import StatCard from '../components/StatCard';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {BackHandler} from 'react-native';
import {getRole} from '../utils/role';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width: screenWidth} = Dimensions.get('window');

const Reports = ({navigation, route}) => {
  const dispatch = useDispatch();
  const filters = useSelector(selectReportFilters);
  const currentReport = useSelector(selectCurrentReport);
  const loading = useSelector(selectReportLoading);
  const error = useSelector(selectReportError);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [agg, setAgg] = useState({
    total: 0,
    normal: 0,
    mild: 0,
    moderate: 0,
    severe: 0,
    unknown: 0,
  });
  const [catAgg, setCatAgg] = useState({
    Pregnant: 0,
    Adolescent: 0,
    Under5: 0,
    WoRA: 0,
  });
  const [rows, setRows] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [severityChartData, setSeverityChartData] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({
    total: 0,
    normal: 0,
    mild: 0,
    moderate: 0,
    severe: 0,
    unknown: 0,
  });

  // Animated values for progress bars
  const normalProgressAnim = useRef(new Animated.Value(0)).current;
  const mildProgressAnim = useRef(new Animated.Value(0)).current;
  const moderateProgressAnim = useRef(new Animated.Value(0)).current;
  const severeProgressAnim = useRef(new Animated.Value(0)).current;
  const DateTimePicker = useMemo(() => {
    try {
      const mod = require('@react-native-community/datetimepicker');
      return mod.default || mod.DateTimePicker || null;
    } catch (_) {
      return null;
    }
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        navigation.navigate('Dashboard');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [navigation]),
  );

  // Animation on component mount
  useEffect(() => {
    // Start with visible content, then add subtle animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Progress bar animations
  useEffect(() => {
    if (agg.total > 0) {
      const normalPercentage = (agg.normal / agg.total) * 100;
      const mildPercentage = (agg.mild / agg.total) * 100;
      const moderatePercentage = (agg.moderate / agg.total) * 100;
      const severePercentage = (agg.severe / agg.total) * 100;

      setTimeout(() => {
        Animated.timing(normalProgressAnim, {
          toValue: normalPercentage,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 0);

      setTimeout(() => {
        Animated.timing(mildProgressAnim, {
          toValue: mildPercentage,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 200);

      setTimeout(() => {
        Animated.timing(moderateProgressAnim, {
          toValue: moderatePercentage,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 400);

      setTimeout(() => {
        Animated.timing(severeProgressAnim, {
          toValue: severePercentage,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 600);
    }
  }, [agg.total, agg.normal, agg.mild, agg.moderate, agg.severe]);

  // Update dashboard and list immediately when filters change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  useEffect(() => {
    (async () => {
      const r = await getRole();
      if (String(r || '').toLowerCase() === 'patient') {
        // patients should not view reports, send back
        navigation.navigate('Dashboard');
      }
    })();
  }, [navigation]);

  // Animate counter values
  const animateCounters = targetValues => {
    const duration = 1500;
    const steps = 60;
    const stepDuration = duration / steps;

    Object.keys(targetValues).forEach(key => {
      const targetValue = targetValues[key];
      const startValue = animatedValues[key] || 0;
      const increment = (targetValue - startValue) / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const newValue = Math.round(startValue + increment * currentStep);

        setAnimatedValues(prev => ({
          ...prev,
          [key]: Math.min(newValue, targetValue),
        }));

        if (currentStep >= steps) {
          clearInterval(timer);
          setAnimatedValues(prev => ({
            ...prev,
            [key]: targetValue,
          }));
        }
      }, stepDuration);
    });
  };

  const computeSeverity = (hb, anemiaCategory) => {
    console.log(
      `[Reports] computeSeverity called with Hb=${hb}, AnemiaCategory=${anemiaCategory}`,
    );

    // If anemia category is provided, use it directly
    if (anemiaCategory && anemiaCategory !== null && anemiaCategory !== '') {
      const category = anemiaCategory.toLowerCase().trim();
      console.log(`[Reports] Using anemia category: "${category}"`);

      if (category === 'no anemia' || category === 'normal') return 'normal';
      if (category === 'mild') return 'mild';
      if (category === 'moderate') return 'moderate';
      if (category === 'severe') return 'severe';
    }

    // Fallback to Hb-based calculation if no category
    console.log(`[Reports] Falling back to Hb-based calculation for Hb=${hb}`);
    if (hb == null || hb === '') return 'unknown';
    const v = Number(hb);
    if (Number.isNaN(v)) return 'unknown';

    // Simple bands (can be adjusted per program guidelines)
    if (v >= 12) return 'normal';
    if (v >= 11) return 'mild';
    if (v >= 8) return 'moderate';
    return 'severe';
  };

  const load = async () => {
    dispatch(setReportLoading(true));
    try {
      const response = await API.getBeneficiariesWithData(500);
      console.log('[Reports] API response:', response);

      // Extract data from response
      const data = response?.data || response;
      console.log('[Reports] Extracted beneficiaries:', data);

      // Check first beneficiary structure to understand available fields
      if (data && data.length > 0) {
        console.log('[Reports] First beneficiary structure:', data[0]);
        console.log('[Reports] First beneficiary keys:', Object.keys(data[0]));
      }

      if (!Array.isArray(data)) {
        console.warn('[Reports] API returned non-array:', data);
        dispatch(setReportError('No data available'));
        return;
      }

      const enriched = data.map((r, index) => {
        // Check all possible field names for anemia category
        const anemiaCategory =
          r.latest_anemia_category ||
          r.anemia_category ||
          r.anemiaCategory ||
          r.anemia_cat ||
          r.anemiaCat ||
          null;
        // Use latest screening data if available, otherwise fallback to beneficiary hb
        const hbValue = r.latest_hemoglobin || r.hb;
        const severity = computeSeverity(hbValue, anemiaCategory);

        // Only log first few beneficiaries to avoid spam
        if (index < 3) {
          console.log(
            `[Reports] Beneficiary ${r.name}: Hb=${hbValue}, AnemiaCategory=${anemiaCategory}, Severity=${severity}`,
          );
          console.log(
            `[Reports] Latest screening data: hemoglobin=${r.latest_hemoglobin}, anemia_category=${r.latest_anemia_category}`,
          );
          console.log(`[Reports] Beneficiary category: ${r.category}`);
          console.log(`[Reports] Available fields:`, Object.keys(r));
        }

        return {
          ...r,
          _severity: severity,
        };
      });

      // Apply filters from Redux state
      const fromDay = filters.dateRange.startDate
        ? dayjs(filters.dateRange.startDate).startOf('day')
        : null;
      const toDay = filters.dateRange.endDate
        ? dayjs(filters.dateRange.endDate).endOf('day')
        : null;

      const filtered = enriched.filter(r => {
        // Date filtering
        const dateSrc = r.follow_up_due || r.registration_date || null;
        const d = dateSrc ? dayjs(dateSrc) : null;
        if (fromDay && d && d.isBefore(fromDay)) return false;
        if (toDay && d && d.isAfter(toDay)) return false;

        // Category filtering
        if (
          filters.beneficiaryType !== 'all' &&
          r.category !== filters.beneficiaryType
        )
          return false;

        // Severity filtering
        if (
          filters.interventionStatus !== 'all' &&
          r._severity !== filters.interventionStatus
        )
          return false;

        // Location filtering
        if (
          filters.location &&
          filters.location !== 'all' &&
          r.location !== filters.location
        )
          return false;

        return true;
      });

      setRows(filtered);

      // Calculate statistics
      let counts = {
        total: filtered.length,
        normal: 0,
        mild: 0,
        moderate: 0,
        severe: 0,
        unknown: 0,
      };
      let catCounts = {Pregnant: 0, Adolescent: 0, Under5: 0, WoRA: 0};

      console.log(
        '[Reports] Calculating statistics for filtered data:',
        filtered.length,
        'beneficiaries',
      );

      filtered.forEach(r => {
        const s = r._severity || 'unknown';
        console.log(
          `[Reports] Processing ${r.name}: severity=${s}, category=${r.category}`,
        );

        if (s === 'normal') counts.normal++;
        else if (s === 'mild') counts.mild++;
        else if (s === 'moderate') counts.moderate++;
        else if (s === 'severe') counts.severe++;
        else counts.unknown++;

        if (r.category === 'Pregnant') catCounts.Pregnant++;
        else if (r.category === 'Adolescent') catCounts.Adolescent++;
        else if (r.category === 'Under5') catCounts.Under5++;
        else if (r.category === 'WoRA') catCounts.WoRA++;
      });

      console.log('[Reports] Final counts:', counts);
      console.log('[Reports] Category counts:', catCounts);
      console.log(
        '[Reports] Summary: Total beneficiaries processed:',
        filtered.length,
      );
      console.log(
        '[Reports] Severity breakdown: Normal=',
        counts.normal,
        'Mild=',
        counts.mild,
        'Moderate=',
        counts.moderate,
        'Severe=',
        counts.severe,
        'Unknown=',
        counts.unknown,
      );

      setAgg(counts);
      setCatAgg(catCounts);
      dispatch(setCurrentReport(filtered));

      // Animate the counter values
      animateCounters(counts);

      // Prepare chart data
      const categoryChartData = {
        labels: Object.keys(catCounts).filter(key => catCounts[key] > 0),
        datasets: [
          {
            data: Object.keys(catCounts)
              .filter(key => catCounts[key] > 0)
              .map(key => catCounts[key]),
            colors: Object.keys(catCounts)
              .filter(key => catCounts[key] > 0)
              .map(
                (_, index) =>
                  colors.chartColors[index % colors.chartColors.length],
              ),
          },
        ],
      };

      const severityChartData = {
        labels: Object.keys(counts).filter(
          key => key !== 'total' && counts[key] > 0,
        ),
        datasets: [
          {
            data: Object.keys(counts)
              .filter(key => key !== 'total' && counts[key] > 0)
              .map(key => counts[key]),
            colors: Object.keys(counts)
              .filter(key => key !== 'total' && counts[key] > 0)
              .map(key => {
                switch (key) {
                  case 'normal':
                    return colors.normal;
                  case 'mild':
                    return colors.mild;
                  case 'moderate':
                    return colors.moderate;
                  case 'severe':
                    return colors.severe;
                  default:
                    return colors.unknown;
                }
              }),
          },
        ],
      };

      setChartData(categoryChartData);
      setSeverityChartData(severityChartData);
    } catch (e) {
      console.warn('Error loading reports:', e);
      dispatch(setReportError(e.message));
    } finally {
      dispatch(setReportLoading(false));
    }
  };

  const exportReport = async () => {
    if (rows.length === 0) {
      Alert.alert('No Data', 'No data available to export');
      return;
    }

    try {
      console.log('[Reports] Exporting report with', rows.length, 'rows');
      console.log('[Reports] Sample row for export:', rows[0]);

      // Create export data with only essential fields and strict sanitization
      const exportData = [];

      // Helper function to safely convert values to strings
      const safeString = value => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'number')
          return isNaN(value) ? '' : value.toString();
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value))
          return value.length > 0 ? value.join(', ') : '';
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch (e) {
            return '[Object]';
          }
        }
        try {
          return String(value);
        } catch (e) {
          console.warn('[Reports] Failed to convert value:', value, e);
          return '';
        }
      };

      rows.forEach((row, index) => {
        // Create a completely new object with only primitive values
        const exportRow = {};

        // Add each field individually to avoid any array/object references
        exportRow['Name'] = safeString(row.name);
        exportRow['Age'] = safeString(row.age);
        exportRow['Gender'] = safeString(row.gender);
        exportRow['Phone'] = safeString(row.phone);
        exportRow['Alternative Phone'] = safeString(row.alt_phone);
        exportRow['Category'] = safeString(row.category);
        exportRow['Hb Level'] = safeString(row.latest_hemoglobin || row.hb);
        exportRow['Anemia Category'] = safeString(
          row.latest_anemia_category || row.anemia_category,
        );
        exportRow['Severity'] = safeString(row._severity);
        exportRow['Doctor Name'] = safeString(row.doctor_name);
        exportRow['Doctor Phone'] = safeString(row.doctor_phone);
        exportRow['Registration Date'] = safeString(row.registration_date);
        exportRow['Follow-up Due'] = safeString(row.follow_up_due);
        exportRow['Location'] = safeString(row.location);
        exportRow['Address'] = safeString(row.address);
        exportRow['Short ID'] = safeString(row.short_id);
        exportRow['ID Number'] = safeString(row.id_number);
        exportRow['Aadhaar Hash'] = safeString(row.aadhaar_hash);
        exportRow['Created At'] = safeString(row.created_at);
        exportRow['Updated At'] = safeString(row.updated_at);

        // Add screening data
        exportRow['Screening ID'] = safeString(row.screening_id);
        exportRow['Screening Notes'] = safeString(row.screening_notes);
        exportRow['Last Screening Date'] = safeString(row.last_screening_date);

        // Add intervention data
        exportRow['Intervention ID'] = safeString(row.intervention_id);
        exportRow['IFA Given'] = safeString(row.intervention_ifa_yes);
        exportRow['Calcium Given'] = safeString(row.intervention_calcium_yes);
        exportRow['Deworming Given'] = safeString(row.intervention_deworm_yes);
        exportRow['Therapeutic Given'] = safeString(
          row.intervention_therapeutic_yes,
        );
        exportRow['Referral Given'] = safeString(row.intervention_referral_yes);
        exportRow['Last Intervention Date'] = safeString(
          row.last_intervention_date,
        );

        // Add additional beneficiary fields
        exportRow['Date of Birth'] = safeString(row.dob);
        exportRow['Front Document'] = safeString(row.front_document);
        exportRow['Back Document'] = safeString(row.back_document);
        exportRow['Calcium Quantity'] = safeString(row.calcium_qty);

        // Log first few rows for debugging
        if (index < 3) {
          console.log(`[Reports] Export row ${index}:`, exportRow);
        }

        exportData.push(exportRow);
      });

      // Add dashboard statistics as summary rows
      const summaryRows = [
        {
          Name: '=== DASHBOARD SUMMARY ===',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: '',
          'Hb Level': '',
          'Anemia Category': '',
          Severity: '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Created At': '',
          'Updated At': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Date of Birth': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
        {
          Name: 'Category Statistics',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: `Pregnant: ${catAgg.Pregnant}, Adolescent: ${catAgg.Adolescent}, Under5: ${catAgg.Under5}, WoRA: ${catAgg.WoRA}`,
          'Hb Level': '',
          'Anemia Category': '',
          Severity: '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Created At': '',
          'Updated At': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Date of Birth': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
        {
          Name: 'Severity Statistics',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: `Normal: ${agg.normal}, Mild: ${agg.mild}, Moderate: ${agg.moderate}, Severe: ${agg.severe}, Unknown: ${agg.unknown}`,
          'Hb Level': '',
          'Anemia Category': '',
          Severity: '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Created At': '',
          'Updated At': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Date of Birth': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
        {
          Name: 'Total Beneficiaries',
          Age: '',
          Gender: '',
          Phone: '',
          'Alternative Phone': '',
          Category: agg.total.toString(),
          'Hb Level': '',
          'Anemia Category': '',
          Severity: '',
          'Doctor Name': '',
          'Doctor Phone': '',
          'Registration Date': '',
          'Follow-up Due': '',
          Location: '',
          Address: '',
          'Short ID': '',
          'ID Number': '',
          'Aadhaar Hash': '',
          'Created At': '',
          'Updated At': '',
          'Screening ID': '',
          'Screening Notes': '',
          'Last Screening Date': '',
          'Intervention ID': '',
          'IFA Given': '',
          'Calcium Given': '',
          'Deworming Given': '',
          'Therapeutic Given': '',
          'Referral Given': '',
          'Last Intervention Date': '',
          'Date of Birth': '',
          'Front Document': '',
          'Back Document': '',
          'Calcium Quantity': '',
        },
      ];

      // Only export dashboard summary, not beneficiary data
      const finalExportData = summaryRows;

      console.log(
        '[Reports] Export data prepared:',
        finalExportData.length,
        'rows (dashboard summary only)',
      );
      console.log('[Reports] First export row:', finalExportData[0]);

      try {
        // Try CSV export first (most reliable)
        await exportJsonToCSV(finalExportData, 'Animia_Report');
      } catch (csvError) {
        console.warn('[Reports] CSV export failed, trying text:', csvError);
        try {
          // Fallback to text export
          await exportJsonToText(finalExportData, 'Animia_Report');
        } catch (textError) {
          console.error('[Reports] All export methods failed:', textError);
          Alert.alert(
            'Export Failed',
            'All export methods failed. Please try again.',
          );
        }
      }
    } catch (error) {
      console.error('[Reports] Export error:', error);
      Alert.alert('Export Failed', `Error exporting report: ${error.message}`);
    }
  };

  // Enhanced Progress Bar with Animation
  const renderAnimatedProgressBar = (
    value,
    total,
    color,
    label,
    animatedValue,
    delay = 0,
  ) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <View style={styles.progressValues}>
            <Text style={[styles.progressValue, {color}]}>{value}</Text>
            <Text style={styles.progressPercentage}>
              {percentage.toFixed(1)}%
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: animatedValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: color,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  // Enhanced Pie Chart Component
  const renderPieChart = (data, title, colors) => {
    if (!data || !data.labels || data.labels.length === 0) return null;

    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    let currentAngle = 0;

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="chart-pie" size={20} color={colors.primary} />
          <Text style={styles.chartTitle}>{title}</Text>
        </View>
        <View style={styles.pieChartContainer}>
          <View style={styles.pieChart}>
            {data.labels.map((label, index) => {
              const value = data.datasets[0].data[index];
              const percentage = (value / total) * 100;
              const color = data.datasets[0].colors[index];
              const size = Math.max(20, (percentage / 100) * 60);

              return (
                <View key={label} style={styles.pieSegment}>
                  <View
                    style={[
                      styles.pieSlice,
                      {
                        backgroundColor: color,
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.pieLegend}>
            {data.labels.map((label, index) => {
              const value = data.datasets[0].data[index];
              const percentage = ((value / total) * 100).toFixed(1);
              const color = data.datasets[0].colors[index];

              return (
                <View key={label} style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, {backgroundColor: color}]}
                  />
                  <Text style={styles.legendLabel}>{label}</Text>
                  <Text style={styles.legendValue}>
                    {value} ({percentage}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // Enhanced Bar Chart Component
  const renderBarChart = (data, title) => {
    if (!data || !data.labels || data.labels.length === 0) return null;

    const maxValue = Math.max(...data.datasets[0].data);

    return (
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Icon name="chart-bar" size={20} color={colors.primary} />
          <Text style={styles.chartTitle}>{title}</Text>
        </View>
        <View style={styles.barChartContainer}>
          {data.labels.map((label, index) => {
            const value = data.datasets[0].data[index];
            const height = (value / maxValue) * 100;
            const color = data.datasets[0].colors[index];

            return (
              <View key={label} style={styles.barItem}>
                <View style={styles.barContainer}>
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: `${height}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{label}</Text>
                <Text style={styles.barValue}>{value}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderModernDashboard = useCallback(
    () => (
      <View style={styles.modernDashboard}>
        {/* Welcome Header */}
        <View style={styles.welcomeHeader}>
          <View style={styles.headerIconContainer}>
            <Icon name="chart-line" size={32} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Analytics Dashboard</Text>
          <Text style={styles.welcomeSubtitle}>
            Real-time health insights and statistics
          </Text>
          <View style={styles.dateDisplayContainer}>
            <Icon name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.dateDisplayText}>
              {filters.dateRange.startDate === filters.dateRange.endDate
                ? dayjs(filters.dateRange.startDate).format('MMMM DD, YYYY')
                : `${dayjs(filters.dateRange.startDate).format(
                    'MMM DD',
                  )} - ${dayjs(filters.dateRange.endDate).format(
                    'MMM DD, YYYY',
                  )}`}
            </Text>
            {filters.dateRange.startDate !== dayjs().format('YYYY-MM-DD') && (
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = dayjs().format('YYYY-MM-DD');
                  dispatch(
                    setFilters({
                      dateRange: {
                        startDate: today,
                        endDate: today,
                      },
                    }),
                  );
                }}>
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Key Metrics Row */}
        <View style={styles.keyMetricsRow}>
          <View style={styles.keyMetricCard}>
            <LinearGradient
              colors={[colors.primary + '15', colors.primary + '05']}
              style={styles.metricGradient}>
              <View style={styles.metricIconContainer}>
                <Icon name="account-group" size={24} color={colors.primary} />
              </View>
              <Text style={styles.metricNumber}>{animatedValues.total}</Text>
              <Text style={styles.metricLabel}>Total Beneficiaries</Text>
            </LinearGradient>
          </View>

          <View style={styles.keyMetricCard}>
            <LinearGradient
              colors={[colors.success + '15', colors.success + '05']}
              style={styles.metricGradient}>
              <View
                style={[
                  styles.metricIconContainer,
                  {backgroundColor: colors.success + '20'},
                ]}>
                <Icon name="check-circle" size={24} color={colors.success} />
              </View>
              <Text style={styles.metricNumber}>
                {animatedValues.normal + animatedValues.mild}
              </Text>
              <Text style={styles.metricLabel}>Under Control</Text>
            </LinearGradient>
          </View>

          <View style={styles.keyMetricCard}>
            <LinearGradient
              colors={[colors.warning + '15', colors.warning + '05']}
              style={styles.metricGradient}>
              <View
                style={[
                  styles.metricIconContainer,
                  {backgroundColor: colors.warning + '20'},
                ]}>
                <Icon name="alert-circle" size={24} color={colors.warning} />
              </View>
              <Text style={styles.metricNumber}>
                {animatedValues.severe + animatedValues.moderate}
              </Text>
              <Text style={styles.metricLabel}>High Priority</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Category Distribution */}
        <View style={styles.dashboardCard}>
          <View style={styles.cardHeader}>
            <Icon name="account-group" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Population Distribution</Text>
          </View>
          <View style={styles.categoryGrid}>
            <View style={styles.categoryItem}>
              <LinearGradient
                colors={[colors.pregnant + '20', colors.pregnant + '10']}
                style={styles.categoryIcon}>
                <Icon name="human-pregnant" size={20} color={colors.pregnant} />
              </LinearGradient>
              <Text style={styles.categoryNumber}>{catAgg.Pregnant}</Text>
              <Text style={styles.categoryLabel}>Pregnant</Text>
            </View>

            <View style={styles.categoryItem}>
              <LinearGradient
                colors={[colors.adolescent + '20', colors.adolescent + '10']}
                style={styles.categoryIcon}>
                <Icon
                  name="account-child"
                  size={20}
                  color={colors.adolescent}
                />
              </LinearGradient>
              <Text style={styles.categoryNumber}>{catAgg.Adolescent}</Text>
              <Text style={styles.categoryLabel}>Adolescent</Text>
            </View>

            <View style={styles.categoryItem}>
              <LinearGradient
                colors={[colors.under5 + '20', colors.under5 + '10']}
                style={styles.categoryIcon}>
                <Icon name="baby-face" size={20} color={colors.under5} />
              </LinearGradient>
              <Text style={styles.categoryNumber}>{catAgg.Under5}</Text>
              <Text style={styles.categoryLabel}>Under 5</Text>
            </View>

            <View style={styles.categoryItem}>
              <LinearGradient
                colors={[colors.wora + '20', colors.wora + '10']}
                style={styles.categoryIcon}>
                <Icon name="gender-female" size={20} color={colors.wora} />
              </LinearGradient>
              <Text style={styles.categoryNumber}>{catAgg.WoRA}</Text>
              <Text style={styles.categoryLabel}>WoRA</Text>
            </View>
          </View>
        </View>

        {/* Health Status Overview */}
        <View style={styles.dashboardCard}>
          <View style={styles.cardHeader}>
            <Icon name="heart-pulse" size={20} color={colors.primary} />
            <Text style={styles.cardTitle}>Health Status Overview</Text>
          </View>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <LinearGradient
                colors={[colors.normal + '15', colors.normal + '05']}
                style={styles.statusGradient}>
                <View
                  style={[
                    styles.statusIndicator,
                    {backgroundColor: colors.normal},
                  ]}
                />
                <Text style={styles.statusNumber}>{animatedValues.normal}</Text>
                <Text style={styles.statusLabel}>Normal</Text>
              </LinearGradient>
            </View>

            <View style={styles.statusItem}>
              <LinearGradient
                colors={[colors.mild + '15', colors.mild + '05']}
                style={styles.statusGradient}>
                <View
                  style={[
                    styles.statusIndicator,
                    {backgroundColor: colors.mild},
                  ]}
                />
                <Text style={styles.statusNumber}>{animatedValues.mild}</Text>
                <Text style={styles.statusLabel}>Mild</Text>
              </LinearGradient>
            </View>

            <View style={styles.statusItem}>
              <LinearGradient
                colors={[colors.moderate + '15', colors.moderate + '05']}
                style={styles.statusGradient}>
                <View
                  style={[
                    styles.statusIndicator,
                    {backgroundColor: colors.moderate},
                  ]}
                />
                <Text style={styles.statusNumber}>
                  {animatedValues.moderate}
                </Text>
                <Text style={styles.statusLabel}>Moderate</Text>
              </LinearGradient>
            </View>

            <View style={styles.statusItem}>
              <LinearGradient
                colors={[colors.severe + '15', colors.severe + '05']}
                style={styles.statusGradient}>
                <View
                  style={[
                    styles.statusIndicator,
                    {backgroundColor: colors.severe},
                  ]}
                />
                <Text style={styles.statusNumber}>{animatedValues.severe}</Text>
                <Text style={styles.statusLabel}>Severe</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </View>
    ),
    [filters.dateRange.startDate, filters.dateRange.endDate, dispatch],
  );

  return (
    <View style={styles.screen}>
      <Header
        title="Reports"
        variant="back"
        onBackPress={() => navigation.goBack()}
        onBellPress={() => navigation.navigate('ReportFilters', {filters})}
        rightIconName="filter-variant"
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{marginTop: spacing.sm, color: colors.text}}>
              Loading reports...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text
              style={{
                color: colors.error,
                textAlign: 'center',
                marginBottom: spacing.md,
              }}>
              Error: {error}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={{color: '#fff'}}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {renderModernDashboard()}

            {/* Progress Bars Section */}
            <View style={styles.progressSection}>
              <View style={styles.sectionHeader}>
                <Icon name="trending-up" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  Health Progress Tracking
                </Text>
              </View>
              {renderAnimatedProgressBar(
                agg.normal,
                agg.total,
                colors.normal,
                'Normal',
                normalProgressAnim,
                0,
              )}
              {renderAnimatedProgressBar(
                agg.mild,
                agg.total,
                colors.mild,
                'Mild',
                mildProgressAnim,
                200,
              )}
              {renderAnimatedProgressBar(
                agg.moderate,
                agg.total,
                colors.moderate,
                'Moderate',
                moderateProgressAnim,
                400,
              )}
              {renderAnimatedProgressBar(
                agg.severe,
                agg.total,
                colors.severe,
                'Severe',
                severeProgressAnim,
                600,
              )}
            </View>

            {/* Enhanced Summary Statistics */}
            <View style={styles.summarySection}>
              <View style={styles.sectionHeader}>
                <Icon name="chart-box" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Summary Statistics</Text>
              </View>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryIconContainer}>
                    <Icon
                      name="account-group"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.summaryValue}>{agg.total}</Text>
                  <Text style={styles.summaryLabel}>Total Beneficiaries</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      {backgroundColor: colors.normal + '20'},
                    ]}>
                    <Icon name="check-circle" size={24} color={colors.normal} />
                  </View>
                  <Text style={[styles.summaryValue, {color: colors.normal}]}>
                    {agg.total > 0
                      ? ((agg.normal / agg.total) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </Text>
                  <Text style={styles.summaryLabel}>Normal Rate</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      {backgroundColor: colors.severe + '20'},
                    ]}>
                    <Icon name="alert-circle" size={24} color={colors.severe} />
                  </View>
                  <Text style={[styles.summaryValue, {color: colors.severe}]}>
                    {agg.total > 0
                      ? ((agg.severe / agg.total) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </Text>
                  <Text style={styles.summaryLabel}>Severe Rate</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      {backgroundColor: colors.adolescent + '20'},
                    ]}>
                    <Icon
                      name="account-child"
                      size={24}
                      color={colors.adolescent}
                    />
                  </View>
                  <Text
                    style={[styles.summaryValue, {color: colors.adolescent}]}>
                    {agg.total > 0
                      ? ((catAgg.Adolescent / agg.total) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </Text>
                  <Text style={styles.summaryLabel}>Adolescent %</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      {backgroundColor: colors.pregnant + '20'},
                    ]}>
                    <Icon
                      name="human-pregnant"
                      size={24}
                      color={colors.pregnant}
                    />
                  </View>
                  <Text style={[styles.summaryValue, {color: colors.pregnant}]}>
                    {agg.total > 0
                      ? ((catAgg.Pregnant / agg.total) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </Text>
                  <Text style={styles.summaryLabel}>Pregnant %</Text>
                </View>

                <View style={styles.summaryCard}>
                  <View
                    style={[
                      styles.summaryIconContainer,
                      {backgroundColor: colors.unknown + '20'},
                    ]}>
                    <Icon
                      name="help-circle-outline"
                      size={24}
                      color={colors.unknown}
                    />
                  </View>
                  <Text style={[styles.summaryValue, {color: colors.unknown}]}>
                    {agg.unknown}
                  </Text>
                  <Text style={styles.summaryLabel}>Unknown Cases</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.exportBtn} onPress={exportReport}>
              <LinearGradient
                colors={[colors.primary, colors.primary + 'CC']}
                style={styles.exportGradient}>
                <Icon name="file-export" size={16} color={colors.white} />
                <Text style={styles.exportBtnText}>Export ({rows.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scrollContainer: {flex: 1},
  container: {padding: spacing.sm, paddingBottom: spacing.lg},
  pageTitle: {
    ...typography.subtitle,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    color: colors.text,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  exportBtn: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    ...shadows.sm,
  },
  exportBtnText: {
    color: colors.white,
    ...typography.caption,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  chartSection: {
    flex: 1,
  },
  dataTableSection: {
    marginBottom: spacing.sm,
  },
  dataTable: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...shadows.sm,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  tableValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  visualStatsContainer: {
    marginBottom: spacing.sm,
  },
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
  },
  progressValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  progressValue: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 14,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercentage: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  chartsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
    ...shadows.sm,
    minHeight: 70,
  },
  metricHeader: {
    marginBottom: spacing.xs,
  },
  metricTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 12,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  riskText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricVisual: {
    alignItems: 'center',
  },
  coverageText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    fontSize: 12,
  },
  reachText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    height: 120,
    justifyContent: 'center',
    ...shadows.sm,
  },
  summaryTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
    fontSize: 13,
  },
  summaryStats: {
    flex: 1,
    justifyContent: 'space-around',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  summaryValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  comprehensiveMetricsSection: {
    marginBottom: spacing.sm,
  },
  metricNumber: {
    ...typography.title,
    fontWeight: '700',
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
  },
  metricSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  qualityText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
    fontSize: 12,
  },

  // Modern Dashboard Styles
  modernDashboard: {
    marginBottom: spacing.md,
  },

  keyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  keyMetricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  metricNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },

  metricLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  dashboardCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },

  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },

  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  categoryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },

  categoryLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginHorizontal: 2,
  },

  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },

  statusNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },

  statusLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  chartsSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },

  chartCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 250,
  },

  // Welcome Header
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  welcomeTitle: {
    ...typography.title,
    color: colors.text,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  dateDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  dateDisplayText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: typography.weights.medium,
  },
  todayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  todayButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: typography.weights.semibold,
    fontSize: 12,
  },

  // Enhanced Metric Cards
  metricGradient: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },

  // Enhanced Category Icons
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },

  // Enhanced Status Items
  statusGradient: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginHorizontal: 2,
  },

  // Chart Components
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  chartTitle: {
    ...typography.subtitle,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },

  // Pie Chart Styles
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  pieChart: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginRight: spacing.lg,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  pieSegment: {
    margin: 2,
  },
  pieSlice: {
    borderRadius: 20,
  },
  pieLegend: {
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  legendValue: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: typography.weights.semibold,
  },

  // Bar Chart Styles
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 100,
    width: 30,
    justifyContent: 'flex-end',
    marginBottom: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 8,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 10,
  },
  barValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: typography.weights.semibold,
    fontSize: 12,
  },

  // Enhanced Progress Section
  progressSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sectionTitle: {
    ...typography.subtitle,
    marginLeft: spacing.sm,
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },

  // Enhanced Summary Statistics
  summarySection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  summaryValue: {
    ...typography.title,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 18,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 12,
  },

  // Enhanced Export Button
  exportGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  exportBtnText: {
    color: colors.white,
    ...typography.caption,
    fontWeight: typography.weights.semibold,
    marginLeft: spacing.xs,
    fontSize: 14,
  },
});

export default Reports;
